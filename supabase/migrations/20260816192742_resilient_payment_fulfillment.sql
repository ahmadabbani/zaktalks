-- Resilient Stripe Checkout fulfillment and reconciliation.

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS original_price_cents integer,
  ADD COLUMN IF NOT EXISTS expected_amount_cents integer,
  ADD COLUMN IF NOT EXISTS points_to_spend integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS first_purchase_discount_applied boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_state text DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS fulfillment_state text DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS fulfillment_attempts integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS last_fulfillment_attempt_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_fulfillment_error text,
  ADD COLUMN IF NOT EXISTS last_stripe_event_id text,
  ADD COLUMN IF NOT EXISTS duplicate_payment boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS benefits_reversed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS expired_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS disputed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS password_setup_email_error text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;

-- Backfill payment facts that are already represented by an enrollment.
UPDATE public.checkout_sessions AS checkout
SET
  original_price_cents = COALESCE(checkout.original_price_cents, enrollment.original_price_cents),
  expected_amount_cents = COALESCE(checkout.expected_amount_cents, enrollment.amount_paid_cents),
  stripe_payment_intent_id = COALESCE(checkout.stripe_payment_intent_id, enrollment.stripe_payment_intent_id),
  first_purchase_discount_applied = enrollment.first_purchase_discount_applied,
  payment_state = CASE
    WHEN enrollment.payment_status = 'refunded' THEN 'refunded'
    WHEN enrollment.payment_status = 'completed' THEN 'paid'
    ELSE checkout.payment_state
  END,
  fulfillment_state = CASE
    WHEN enrollment.payment_status = 'completed' THEN 'fulfilled'
    WHEN enrollment.payment_status = 'refunded' THEN 'revoked'
    ELSE checkout.fulfillment_state
  END,
  updated_at = now()
FROM public.user_enrollments AS enrollment
WHERE checkout.enrollment_id = enrollment.id;

-- Preserve historical inconsistencies for reconciliation instead of pretending
-- that a completed checkout without access was fulfilled.
UPDATE public.checkout_sessions
SET
  payment_state = 'paid',
  fulfillment_state = 'requires_attention',
  last_fulfillment_error = COALESCE(last_fulfillment_error, 'Historical completed checkout has no linked enrollment'),
  updated_at = now()
WHERE status = 'completed'
  AND enrollment_id IS NULL;

UPDATE public.checkout_sessions
SET
  status = 'expired',
  payment_state = 'expired',
  fulfillment_state = 'not_required',
  expired_at = COALESCE(expired_at, expires_at),
  updated_at = now()
WHERE status = 'pending'
  AND expires_at <= now();

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'checkout_sessions_purchase_amounts_check'
      AND conrelid = 'public.checkout_sessions'::regclass
  ) THEN
    ALTER TABLE public.checkout_sessions
      ADD CONSTRAINT checkout_sessions_purchase_amounts_check CHECK (
        (original_price_cents IS NULL OR original_price_cents >= 0)
        AND (expected_amount_cents IS NULL OR expected_amount_cents >= 0)
        AND (
          original_price_cents IS NULL
          OR expected_amount_cents IS NULL
          OR original_price_cents >= expected_amount_cents
        )
        AND points_to_spend >= 0
        AND fulfillment_attempts >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'checkout_sessions_payment_state_check'
      AND conrelid = 'public.checkout_sessions'::regclass
  ) THEN
    ALTER TABLE public.checkout_sessions
      ADD CONSTRAINT checkout_sessions_payment_state_check CHECK (
        payment_state = ANY (ARRAY[
          'pending', 'processing', 'paid', 'no_payment_required', 'failed',
          'expired', 'partially_refunded', 'refunded', 'disputed', 'dispute_lost'
        ])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'checkout_sessions_fulfillment_state_check'
      AND conrelid = 'public.checkout_sessions'::regclass
  ) THEN
    ALTER TABLE public.checkout_sessions
      ADD CONSTRAINT checkout_sessions_fulfillment_state_check CHECK (
        fulfillment_state = ANY (ARRAY[
          'pending', 'processing', 'fulfilled', 'failed', 'not_required',
          'requires_attention', 'revoked'
        ])
      );
  END IF;
END
$constraints$;

CREATE UNIQUE INDEX IF NOT EXISTS checkout_sessions_payment_intent_unique
  ON public.checkout_sessions (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS checkout_sessions_one_active_user
  ON public.checkout_sessions (user_id)
  WHERE status = 'pending' AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS checkout_sessions_one_active_guest
  ON public.checkout_sessions (lower(email))
  WHERE status = 'pending' AND user_id IS NULL AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS checkout_sessions_reconciliation_idx
  ON public.checkout_sessions (fulfillment_state, updated_at DESC)
  WHERE fulfillment_state IN ('failed', 'requires_attention', 'processing');

CREATE INDEX IF NOT EXISTS checkout_sessions_expiration_idx
  ON public.checkout_sessions (expires_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  stripe_object_id text,
  livemode boolean DEFAULT false NOT NULL,
  processing_status text DEFAULT 'processing' NOT NULL,
  attempts integer DEFAULT 1 NOT NULL,
  last_error text,
  received_at timestamp with time zone DEFAULT now() NOT NULL,
  processed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT stripe_webhook_events_status_check CHECK (
    processing_status = ANY (ARRAY['processing', 'completed', 'failed', 'ignored'])
  ),
  CONSTRAINT stripe_webhook_events_attempts_check CHECK (attempts > 0)
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.stripe_webhook_events TO service_role;

CREATE INDEX IF NOT EXISTS stripe_webhook_events_status_idx
  ON public.stripe_webhook_events (processing_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_object_idx
  ON public.stripe_webhook_events (stripe_object_id, received_at DESC)
  WHERE stripe_object_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_course_id uuid,
  p_user_id uuid,
  p_coupon_id uuid,
  p_original_price_cents integer,
  p_expected_amount_cents integer,
  p_points_to_spend integer DEFAULT 0,
  p_first_purchase_discount_applied boolean DEFAULT false,
  p_expires_at timestamp with time zone DEFAULT (now() + interval '24 hours')
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_checkout_id uuid;
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_points integer;
  v_first_purchase_used boolean;
  v_coupon public.coupons%ROWTYPE;
  v_pending_coupon_uses integer;
  v_user_coupon_uses integer;
  v_identity text;
BEGIN
  IF p_course_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.courses WHERE id = p_course_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Course is unavailable';
  END IF;

  IF v_email = '' OR length(v_email) > 320 THEN
    RAISE EXCEPTION 'A valid checkout email is required';
  END IF;

  IF p_original_price_cents < 0
     OR p_expected_amount_cents < 0
     OR p_expected_amount_cents > p_original_price_cents
     OR p_points_to_spend < 0 THEN
    RAISE EXCEPTION 'Invalid checkout amounts';
  END IF;

  IF p_expires_at <= now() OR p_expires_at > now() + interval '24 hours 5 minutes' THEN
    RAISE EXCEPTION 'Invalid checkout expiration';
  END IF;

  v_identity := COALESCE(p_user_id::text, v_email);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('checkout:' || v_identity, 0));

  -- A pending row is the reservation. Release an elapsed reservation while the
  -- identity lock is held so the partial unique indexes cannot block a retry.
  UPDATE public.checkout_sessions
  SET status = 'expired',
      payment_state = 'expired',
      fulfillment_state = 'not_required',
      expired_at = COALESCE(expired_at, expires_at),
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at <= now()
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (p_user_id IS NULL AND user_id IS NULL AND lower(email) = v_email)
    );

  IF p_user_id IS NOT NULL THEN
    SELECT points, first_purchase_discount_used
    INTO v_points, v_first_purchase_used
    FROM public.users
    WHERE id = p_user_id
      AND lower(email) = v_email
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The signed-in user does not match this checkout';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.user_enrollments
      WHERE user_id = p_user_id
        AND course_id = p_course_id
        AND payment_status = 'completed'
    ) THEN
      RAISE EXCEPTION 'The user is already enrolled in this course';
    END IF;

    IF v_points < p_points_to_spend THEN
      RAISE EXCEPTION 'The user no longer has enough points';
    END IF;

    IF p_first_purchase_discount_applied AND v_first_purchase_used THEN
      RAISE EXCEPTION 'The first-purchase discount is no longer available';
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = v_email) THEN
      RAISE EXCEPTION 'An account with this email already exists';
    END IF;

    IF p_points_to_spend <> 0 THEN
      RAISE EXCEPTION 'Guest checkout cannot spend account points';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.checkout_sessions
    WHERE status = 'pending'
      AND expires_at > now()
      AND (
        (p_user_id IS NOT NULL AND user_id = p_user_id)
        OR (p_user_id IS NULL AND user_id IS NULL AND lower(email) = v_email)
      )
  ) THEN
    RAISE EXCEPTION 'An active checkout already exists for this customer';
  END IF;

  IF p_coupon_id IS NOT NULL THEN
    SELECT *
    INTO v_coupon
    FROM public.coupons
    WHERE id = p_coupon_id
    FOR UPDATE;

    IF NOT FOUND OR NOT v_coupon.is_active
       OR (v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= now()) THEN
      RAISE EXCEPTION 'The coupon is no longer available';
    END IF;

    IF NOT v_coupon.applies_to_all_courses AND NOT EXISTS (
      SELECT 1 FROM public.coupon_courses
      WHERE coupon_id = p_coupon_id AND course_id = p_course_id
    ) THEN
      RAISE EXCEPTION 'The coupon does not apply to this course';
    END IF;

    SELECT count(*)::integer
    INTO v_pending_coupon_uses
    FROM public.checkout_sessions
    WHERE coupon_id = p_coupon_id
      AND status = 'pending'
      AND expires_at > now();

    IF v_coupon.max_uses_total IS NOT NULL
       AND v_coupon.usage_count + v_pending_coupon_uses >= v_coupon.max_uses_total THEN
      RAISE EXCEPTION 'The coupon has reached its usage limit';
    END IF;

    IF p_user_id IS NOT NULL AND v_coupon.max_uses_per_user IS NOT NULL THEN
      SELECT count(*)::integer
      INTO v_user_coupon_uses
      FROM public.coupon_usages
      WHERE coupon_id = p_coupon_id AND user_id = p_user_id;

      IF v_user_coupon_uses >= v_coupon.max_uses_per_user THEN
        RAISE EXCEPTION 'The coupon has already been used by this user';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.checkout_sessions (
    email,
    first_name,
    last_name,
    course_id,
    user_id,
    coupon_id,
    original_price_cents,
    expected_amount_cents,
    points_to_spend,
    first_purchase_discount_applied,
    expires_at,
    status,
    payment_state,
    fulfillment_state,
    updated_at
  )
  VALUES (
    v_email,
    NULLIF(btrim(COALESCE(p_first_name, '')), ''),
    NULLIF(btrim(COALESCE(p_last_name, '')), ''),
    p_course_id,
    p_user_id,
    p_coupon_id,
    p_original_price_cents,
    p_expected_amount_cents,
    p_points_to_spend,
    p_first_purchase_discount_applied,
    p_expires_at,
    'pending',
    'pending',
    'pending',
    now()
  )
  RETURNING id INTO v_checkout_id;

  RETURN v_checkout_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.attach_checkout_stripe_session(
  p_checkout_id uuid,
  p_stripe_session_id text,
  p_expires_at timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF p_checkout_id IS NULL OR p_stripe_session_id IS NULL OR btrim(p_stripe_session_id) = '' THEN
    RAISE EXCEPTION 'Checkout and Stripe session IDs are required';
  END IF;

  UPDATE public.checkout_sessions
  SET stripe_session_id = p_stripe_session_id,
      expires_at = p_expires_at,
      updated_at = now()
  WHERE id = p_checkout_id
    AND status = 'pending'
    AND stripe_session_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout order cannot be attached to this Stripe session';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_checkout_fulfillment(p_stripe_session_id text)
RETURNS TABLE(
  checkout_id uuid,
  should_process boolean,
  current_fulfillment_state text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_checkout public.checkout_sessions%ROWTYPE;
BEGIN
  SELECT checkout.* INTO v_checkout
  FROM public.checkout_sessions AS checkout
  WHERE checkout.stripe_session_id = p_stripe_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session was not recorded';
  END IF;

  IF v_checkout.fulfillment_state IN ('fulfilled', 'revoked', 'not_required') THEN
    RETURN QUERY SELECT v_checkout.id, false, v_checkout.fulfillment_state;
    RETURN;
  END IF;

  IF v_checkout.fulfillment_state = 'processing'
     AND v_checkout.last_fulfillment_attempt_at > now() - interval '2 minutes' THEN
    RETURN QUERY SELECT v_checkout.id, false, v_checkout.fulfillment_state;
    RETURN;
  END IF;

  UPDATE public.checkout_sessions
  SET fulfillment_state = 'processing',
      fulfillment_attempts = fulfillment_attempts + 1,
      last_fulfillment_attempt_at = now(),
      last_fulfillment_error = NULL,
      updated_at = now()
  WHERE id = v_checkout.id;

  RETURN QUERY SELECT v_checkout.id, true, 'processing'::text;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_checkout_fulfillment_failure(
  p_stripe_session_id text,
  p_error text
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  UPDATE public.checkout_sessions
  SET fulfillment_state = 'failed',
      last_fulfillment_error = left(COALESCE(p_error, 'Unknown fulfillment error'), 2000),
      updated_at = now()
  WHERE stripe_session_id = p_stripe_session_id
    AND fulfillment_state <> 'fulfilled';
$function$;

DROP FUNCTION IF EXISTS public.finalize_course_purchase(
  text, uuid, uuid, text, integer, integer, boolean, integer, uuid
);

CREATE OR REPLACE FUNCTION public.finalize_course_purchase(
  p_stripe_session_id text,
  p_user_id uuid,
  p_course_id uuid,
  p_stripe_payment_intent_id text,
  p_amount_paid_cents integer,
  p_original_price_cents integer,
  p_first_purchase_discount_applied boolean,
  p_points_to_spend integer DEFAULT 0,
  p_coupon_id uuid DEFAULT NULL
)
RETURNS TABLE(enrollment_id uuid, already_processed boolean, duplicate_payment boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_checkout public.checkout_sessions%ROWTYPE;
  v_existing_enrollment public.user_enrollments%ROWTYPE;
  v_enrollment_id uuid;
  v_coupon_usage_id uuid;
  v_points_balance integer;
  v_duplicate boolean := false;
BEGIN
  IF p_stripe_session_id IS NULL OR btrim(p_stripe_session_id) = ''
     OR p_stripe_payment_intent_id IS NULL OR btrim(p_stripe_payment_intent_id) = '' THEN
    RAISE EXCEPTION 'Stripe payment identifiers are required';
  END IF;

  IF p_user_id IS NULL OR p_course_id IS NULL THEN
    RAISE EXCEPTION 'User ID and course ID are required';
  END IF;

  IF p_amount_paid_cents < 0
     OR p_original_price_cents < p_amount_paid_cents
     OR p_points_to_spend < 0 THEN
    RAISE EXCEPTION 'Invalid purchase amounts';
  END IF;

  SELECT checkout.* INTO v_checkout
  FROM public.checkout_sessions AS checkout
  WHERE checkout.stripe_session_id = p_stripe_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session was not recorded';
  END IF;

  IF v_checkout.course_id <> p_course_id
     OR (v_checkout.user_id IS NOT NULL AND v_checkout.user_id <> p_user_id)
     OR v_checkout.coupon_id IS DISTINCT FROM p_coupon_id THEN
    RAISE EXCEPTION 'Checkout ownership or purchase metadata does not match';
  END IF;

  IF v_checkout.expected_amount_cents IS NOT NULL
     AND v_checkout.expected_amount_cents <> p_amount_paid_cents THEN
    RAISE EXCEPTION 'Stripe amount does not match the checkout order';
  END IF;

  IF v_checkout.original_price_cents IS NOT NULL
     AND v_checkout.original_price_cents <> p_original_price_cents THEN
    RAISE EXCEPTION 'Original price does not match the checkout order';
  END IF;

  IF v_checkout.points_to_spend <> p_points_to_spend
     OR v_checkout.first_purchase_discount_applied <> p_first_purchase_discount_applied THEN
    RAISE EXCEPTION 'Discount reservation does not match the checkout order';
  END IF;

  IF v_checkout.payment_state IN ('refunded', 'dispute_lost')
     OR v_checkout.fulfillment_state = 'revoked' THEN
    RAISE EXCEPTION 'A reversed payment cannot be fulfilled';
  END IF;

  IF v_checkout.status = 'completed' AND v_checkout.enrollment_id IS NOT NULL THEN
    RETURN QUERY SELECT v_checkout.enrollment_id, true, v_checkout.duplicate_payment;
    RETURN;
  END IF;

  PERFORM 1 FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resolved user profile does not exist';
  END IF;

  SELECT enrollment.* INTO v_existing_enrollment
  FROM public.user_enrollments AS enrollment
  WHERE enrollment.user_id = p_user_id
    AND enrollment.course_id = p_course_id
  FOR UPDATE;

  IF FOUND THEN
    v_enrollment_id := v_existing_enrollment.id;

    IF v_existing_enrollment.stripe_payment_intent_id IS DISTINCT FROM p_stripe_payment_intent_id
       AND v_existing_enrollment.payment_status = 'completed' THEN
      v_duplicate := true;

      UPDATE public.checkout_sessions
      SET status = 'completed',
          user_id = p_user_id,
          enrollment_id = v_enrollment_id,
          stripe_payment_intent_id = p_stripe_payment_intent_id,
          original_price_cents = p_original_price_cents,
          expected_amount_cents = p_amount_paid_cents,
          payment_state = CASE WHEN p_amount_paid_cents = 0 THEN 'no_payment_required' ELSE 'paid' END,
          fulfillment_state = 'fulfilled',
          duplicate_payment = true,
          completed_at = COALESCE(completed_at, now()),
          last_fulfillment_error = NULL,
          updated_at = now()
      WHERE id = v_checkout.id;

      RETURN QUERY SELECT v_enrollment_id, false, true;
      RETURN;
    END IF;

    UPDATE public.user_enrollments
    SET stripe_payment_intent_id = p_stripe_payment_intent_id,
        payment_status = 'completed',
        amount_paid_cents = p_amount_paid_cents,
        original_price_cents = p_original_price_cents,
        discount_applied_cents = p_original_price_cents - p_amount_paid_cents,
        points_earned = 1000,
        coupon_id = p_coupon_id,
        first_purchase_discount_applied = p_first_purchase_discount_applied,
        updated_at = now()
    WHERE id = v_enrollment_id;
  ELSE
    INSERT INTO public.user_enrollments (
      user_id, course_id, stripe_payment_intent_id, payment_status,
      amount_paid_cents, original_price_cents, discount_applied_cents,
      points_earned, coupon_id, first_purchase_discount_applied, updated_at
    ) VALUES (
      p_user_id, p_course_id, p_stripe_payment_intent_id, 'completed',
      p_amount_paid_cents, p_original_price_cents,
      p_original_price_cents - p_amount_paid_cents,
      1000, p_coupon_id, p_first_purchase_discount_applied, now()
    )
    RETURNING id INTO v_enrollment_id;
  END IF;

  IF p_first_purchase_discount_applied THEN
    UPDATE public.users
    SET first_purchase_discount_used = true, updated_at = now()
    WHERE id = p_user_id;
  END IF;

  IF p_points_to_spend > 0 THEN
    UPDATE public.users
    SET points = points - p_points_to_spend, updated_at = now()
    WHERE id = p_user_id AND points >= p_points_to_spend
    RETURNING points INTO v_points_balance;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The user no longer has enough points for this checkout';
    END IF;

    INSERT INTO public.point_transactions (user_id, amount, type, reference_id, description)
    VALUES (p_user_id, -p_points_to_spend, 'spend', p_course_id, 'Used for course purchase');
  END IF;

  IF p_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_usages (coupon_id, user_id, course_id)
    VALUES (p_coupon_id, p_user_id, p_course_id)
    ON CONFLICT (coupon_id, user_id, course_id) DO NOTHING
    RETURNING id INTO v_coupon_usage_id;

    IF v_coupon_usage_id IS NOT NULL THEN
      UPDATE public.coupons SET usage_count = usage_count + 1 WHERE id = p_coupon_id;
    END IF;
  END IF;

  UPDATE public.users SET points = points + 1000, updated_at = now() WHERE id = p_user_id;

  INSERT INTO public.point_transactions (user_id, amount, type, reference_id, description)
  VALUES (p_user_id, 1000, 'earn', p_course_id, 'Earned from course purchase');

  UPDATE public.checkout_sessions
  SET status = 'completed',
      user_id = p_user_id,
      enrollment_id = v_enrollment_id,
      stripe_payment_intent_id = p_stripe_payment_intent_id,
      original_price_cents = p_original_price_cents,
      expected_amount_cents = p_amount_paid_cents,
      payment_state = CASE WHEN p_amount_paid_cents = 0 THEN 'no_payment_required' ELSE 'paid' END,
      fulfillment_state = 'fulfilled',
      duplicate_payment = false,
      completed_at = COALESCE(completed_at, now()),
      last_fulfillment_error = NULL,
      updated_at = now()
  WHERE id = v_checkout.id;

  RETURN QUERY SELECT v_enrollment_id, false, false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_checkout_terminal(
  p_stripe_session_id text,
  p_terminal_state text,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF p_terminal_state NOT IN ('expired', 'failed') THEN
    RAISE EXCEPTION 'Invalid terminal checkout state';
  END IF;

  UPDATE public.checkout_sessions
  SET status = CASE
        WHEN p_terminal_state = 'expired' THEN 'expired'::public.checkout_status
        ELSE 'failed'::public.checkout_status
      END,
      payment_state = p_terminal_state,
      fulfillment_state = 'not_required',
      expired_at = CASE WHEN p_terminal_state = 'expired' THEN now() ELSE expired_at END,
      failed_at = CASE WHEN p_terminal_state = 'failed' THEN now() ELSE failed_at END,
      last_fulfillment_error = left(p_error, 2000),
      updated_at = now()
  WHERE stripe_session_id = p_stripe_session_id
    AND status = 'pending'
    AND payment_state NOT IN ('paid', 'no_payment_required');
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_payment_access_state(
  p_stripe_payment_intent_id text,
  p_payment_state text,
  p_revoke_access boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_checkout_id uuid;
  v_enrollment_id uuid;
  v_checkout public.checkout_sessions%ROWTYPE;
  v_enrollment public.user_enrollments%ROWTYPE;
  v_coupon_usage_id uuid;
BEGIN
  IF p_payment_state NOT IN ('paid', 'partially_refunded', 'refunded', 'disputed', 'dispute_lost') THEN
    RAISE EXCEPTION 'Invalid payment state';
  END IF;

  SELECT checkout.* INTO v_checkout
  FROM public.checkout_sessions
  AS checkout
  WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
  FOR UPDATE;

  IF FOUND THEN
    v_checkout_id := v_checkout.id;
    v_enrollment_id := v_checkout.enrollment_id;
  ELSE
    SELECT enrollment.* INTO v_enrollment
    FROM public.user_enrollments
    AS enrollment
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    v_enrollment_id := v_enrollment.id;
  END IF;

  -- A duplicate charge points at the buyer's existing enrollment only so it
  -- can be refunded automatically. Never revoke that original access.
  IF v_checkout_id IS NOT NULL AND v_checkout.duplicate_payment THEN
    UPDATE public.checkout_sessions
    SET payment_state = p_payment_state,
        fulfillment_state = CASE
          WHEN p_payment_state IN ('refunded', 'dispute_lost') THEN 'not_required'
          ELSE fulfillment_state
        END,
        refunded_at = CASE WHEN p_payment_state IN ('refunded', 'dispute_lost') THEN now() ELSE refunded_at END,
        disputed_at = CASE WHEN p_payment_state IN ('disputed', 'dispute_lost') THEN now() ELSE disputed_at END,
        updated_at = now()
    WHERE id = v_checkout_id;

    RETURN v_enrollment_id;
  END IF;

  IF v_enrollment_id IS NOT NULL THEN
    UPDATE public.user_enrollments
    SET payment_status = CASE
          WHEN p_revoke_access AND p_payment_state = 'disputed' THEN 'failed'::public.payment_status
          WHEN p_revoke_access THEN 'refunded'::public.payment_status
          ELSE 'completed'::public.payment_status
        END,
        updated_at = now()
    WHERE id = v_enrollment_id;
  END IF;

  -- Reverse loyalty/coupon effects exactly once after a final reversal. A
  -- negative points balance is intentional: it represents rewards already
  -- spent before the purchase was refunded and is repaid by future earnings.
  IF v_checkout_id IS NOT NULL
     AND p_payment_state IN ('refunded', 'dispute_lost')
     AND v_checkout.benefits_reversed_at IS NULL
     AND v_enrollment_id IS NOT NULL THEN
    SELECT enrollment.* INTO v_enrollment
    FROM public.user_enrollments AS enrollment
    WHERE enrollment.id = v_enrollment_id
    FOR UPDATE;

    UPDATE public.users
    SET points = points - COALESCE(v_enrollment.points_earned, 0) + v_checkout.points_to_spend,
        updated_at = now()
    WHERE id = v_enrollment.user_id;

    IF COALESCE(v_enrollment.points_earned, 0) <> 0 THEN
      INSERT INTO public.point_transactions (user_id, amount, type, reference_id, description)
      VALUES (
        v_enrollment.user_id,
        -v_enrollment.points_earned,
        'refund_reward_reversal',
        v_enrollment.course_id,
        'Reversed course-purchase reward after payment reversal'
      );
    END IF;

    IF v_checkout.points_to_spend > 0 THEN
      INSERT INTO public.point_transactions (user_id, amount, type, reference_id, description)
      VALUES (
        v_enrollment.user_id,
        v_checkout.points_to_spend,
        'refund_points_restore',
        v_enrollment.course_id,
        'Restored points used on a reversed course purchase'
      );
    END IF;

    IF v_enrollment.coupon_id IS NOT NULL THEN
      DELETE FROM public.coupon_usages
      WHERE coupon_id = v_enrollment.coupon_id
        AND user_id = v_enrollment.user_id
        AND course_id = v_enrollment.course_id
      RETURNING id INTO v_coupon_usage_id;

      IF v_coupon_usage_id IS NOT NULL THEN
        UPDATE public.coupons
        SET usage_count = pg_catalog.greatest(0, usage_count - 1)
        WHERE id = v_enrollment.coupon_id;
      END IF;
    END IF;

    IF v_enrollment.first_purchase_discount_applied THEN
      UPDATE public.users AS profile
      SET first_purchase_discount_used = EXISTS (
            SELECT 1
            FROM public.user_enrollments AS other
            WHERE other.user_id = profile.id
              AND other.id <> v_enrollment.id
              AND other.payment_status = 'completed'
              AND other.first_purchase_discount_applied
          ),
          updated_at = now()
      WHERE profile.id = v_enrollment.user_id;
    END IF;

    UPDATE public.checkout_sessions
    SET benefits_reversed_at = now()
    WHERE id = v_checkout_id;
  END IF;

  IF v_checkout_id IS NOT NULL THEN
    UPDATE public.checkout_sessions
    SET payment_state = p_payment_state,
        status = CASE
          WHEN p_revoke_access THEN 'failed'::public.checkout_status
          WHEN p_payment_state IN ('paid', 'partially_refunded') THEN 'completed'::public.checkout_status
          ELSE status
        END,
        fulfillment_state = CASE WHEN p_revoke_access THEN 'revoked' ELSE 'fulfilled' END,
        refunded_at = CASE WHEN p_payment_state IN ('refunded', 'dispute_lost') THEN now() ELSE refunded_at END,
        disputed_at = CASE WHEN p_payment_state IN ('disputed', 'dispute_lost') THEN now() ELSE disputed_at END,
        updated_at = now()
    WHERE id = v_checkout_id;
  END IF;

  RETURN v_enrollment_id;
END;
$function$;

-- Refunded rewards may legitimately put an account into a temporary points
-- debt if the earned reward was already spent on another order.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_points_check;

CREATE OR REPLACE FUNCTION public.mark_duplicate_checkout_refunded(p_stripe_session_id text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  UPDATE public.checkout_sessions
  SET status = 'failed',
      payment_state = 'refunded',
      fulfillment_state = 'not_required',
      refunded_at = now(),
      updated_at = now()
  WHERE stripe_session_id = p_stripe_session_id
    AND duplicate_payment = true;
$function$;

REVOKE ALL ON FUNCTION public.create_checkout_order(
  text, text, text, uuid, uuid, uuid, integer, integer, integer, boolean, timestamp with time zone
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(
  text, text, text, uuid, uuid, uuid, integer, integer, integer, boolean, timestamp with time zone
) TO service_role;

REVOKE ALL ON FUNCTION public.attach_checkout_stripe_session(uuid, text, timestamp with time zone)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.attach_checkout_stripe_session(uuid, text, timestamp with time zone)
  TO service_role;

REVOKE ALL ON FUNCTION public.claim_checkout_fulfillment(text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_checkout_fulfillment(text)
  TO service_role;

REVOKE ALL ON FUNCTION public.record_checkout_fulfillment_failure(text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_checkout_fulfillment_failure(text, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.finalize_course_purchase(
  text, uuid, uuid, text, integer, integer, boolean, integer, uuid
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_course_purchase(
  text, uuid, uuid, text, integer, integer, boolean, integer, uuid
) TO service_role;

REVOKE ALL ON FUNCTION public.mark_checkout_terminal(text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_checkout_terminal(text, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.sync_payment_access_state(text, text, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_payment_access_state(text, text, boolean)
  TO service_role;

REVOKE ALL ON FUNCTION public.mark_duplicate_checkout_refunded(text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_duplicate_checkout_refunded(text)
  TO service_role;

COMMENT ON TABLE public.stripe_webhook_events IS
  'Idempotency and operational audit log for verified Stripe webhook deliveries.';

COMMENT ON FUNCTION public.create_checkout_order(
  text, text, text, uuid, uuid, uuid, integer, integer, integer, boolean, timestamp with time zone
) IS 'Atomically reserves one active checkout and validates points, first-purchase, and coupon availability. Service role only.';

COMMENT ON FUNCTION public.finalize_course_purchase(
  text, uuid, uuid, text, integer, integer, boolean, integer, uuid
) IS 'Idempotently grants course access only after the server has verified a paid Stripe Checkout Session. Service role only.';
