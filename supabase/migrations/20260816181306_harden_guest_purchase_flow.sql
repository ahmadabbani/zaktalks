-- Keep payment finalization atomic and make guest password-email delivery observable.
ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS password_setup_email_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS password_setup_email_id text;

-- Existing completed checkouts predate delivery tracking. Treat them as already
-- handled so replaying an old Stripe event cannot send an unexpected duplicate.
UPDATE public.checkout_sessions
SET password_setup_email_sent_at = completed_at
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND password_setup_email_sent_at IS NULL;

-- Repair the checkout-to-enrollment link wherever the relationship is unambiguous.
UPDATE public.checkout_sessions AS checkout
SET enrollment_id = enrollment.id
FROM public.user_enrollments AS enrollment
WHERE checkout.enrollment_id IS NULL
  AND checkout.user_id = enrollment.user_id
  AND checkout.course_id = enrollment.course_id;

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
RETURNS TABLE(enrollment_id uuid, already_processed boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_checkout public.checkout_sessions%ROWTYPE;
  v_enrollment_id uuid;
  v_coupon_usage_id uuid;
  v_points_balance integer;
BEGIN
  IF p_stripe_session_id IS NULL OR btrim(p_stripe_session_id) = '' THEN
    RAISE EXCEPTION 'Stripe session ID is required';
  END IF;

  IF p_user_id IS NULL OR p_course_id IS NULL THEN
    RAISE EXCEPTION 'User ID and course ID are required';
  END IF;

  IF p_stripe_payment_intent_id IS NULL OR btrim(p_stripe_payment_intent_id) = '' THEN
    RAISE EXCEPTION 'Stripe payment intent ID is required';
  END IF;

  IF p_amount_paid_cents < 0
     OR p_original_price_cents < p_amount_paid_cents
     OR p_points_to_spend < 0 THEN
    RAISE EXCEPTION 'Invalid purchase amounts';
  END IF;

  SELECT checkout.*
  INTO v_checkout
  FROM public.checkout_sessions AS checkout
  WHERE checkout.stripe_session_id = p_stripe_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session was not recorded';
  END IF;

  IF v_checkout.course_id <> p_course_id THEN
    RAISE EXCEPTION 'Checkout course does not match Stripe metadata';
  END IF;

  IF v_checkout.user_id IS NOT NULL AND v_checkout.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Checkout user does not match the resolved user';
  END IF;

  IF v_checkout.coupon_id IS DISTINCT FROM p_coupon_id THEN
    RAISE EXCEPTION 'Checkout coupon does not match Stripe metadata';
  END IF;

  IF v_checkout.status = 'completed' THEN
    v_enrollment_id := v_checkout.enrollment_id;

    IF v_enrollment_id IS NULL THEN
      SELECT enrollment.id
      INTO v_enrollment_id
      FROM public.user_enrollments AS enrollment
      WHERE enrollment.user_id = p_user_id
        AND enrollment.course_id = p_course_id;

      IF v_enrollment_id IS NOT NULL THEN
        UPDATE public.checkout_sessions
        SET enrollment_id = v_enrollment_id
        WHERE id = v_checkout.id;
      END IF;
    END IF;

    IF v_enrollment_id IS NULL THEN
      RAISE EXCEPTION 'Completed checkout has no matching enrollment';
    END IF;

    RETURN QUERY SELECT v_enrollment_id, true;
    RETURN;
  END IF;

  IF v_checkout.status <> 'pending' THEN
    RAISE EXCEPTION 'Checkout session cannot be finalized from status %', v_checkout.status;
  END IF;

  -- Lock the points/profile row so spending and earning cannot race another purchase.
  PERFORM 1
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resolved user profile does not exist';
  END IF;

  INSERT INTO public.user_enrollments (
    user_id,
    course_id,
    stripe_payment_intent_id,
    payment_status,
    amount_paid_cents,
    original_price_cents,
    discount_applied_cents,
    points_earned,
    coupon_id,
    first_purchase_discount_applied,
    updated_at
  )
  VALUES (
    p_user_id,
    p_course_id,
    p_stripe_payment_intent_id,
    'completed',
    p_amount_paid_cents,
    p_original_price_cents,
    p_original_price_cents - p_amount_paid_cents,
    1000,
    p_coupon_id,
    p_first_purchase_discount_applied,
    now()
  )
  ON CONFLICT (user_id, course_id) DO UPDATE
  SET
    stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
    payment_status = 'completed',
    amount_paid_cents = EXCLUDED.amount_paid_cents,
    original_price_cents = EXCLUDED.original_price_cents,
    discount_applied_cents = EXCLUDED.discount_applied_cents,
    points_earned = EXCLUDED.points_earned,
    coupon_id = EXCLUDED.coupon_id,
    first_purchase_discount_applied = EXCLUDED.first_purchase_discount_applied,
    updated_at = now()
  RETURNING id INTO v_enrollment_id;

  IF p_first_purchase_discount_applied THEN
    UPDATE public.users
    SET first_purchase_discount_used = true,
        updated_at = now()
    WHERE id = p_user_id;
  END IF;

  IF p_points_to_spend > 0 THEN
    UPDATE public.users
    SET points = points - p_points_to_spend,
        updated_at = now()
    WHERE id = p_user_id
      AND points >= p_points_to_spend
    RETURNING points INTO v_points_balance;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The user no longer has enough points for this checkout';
    END IF;

    INSERT INTO public.point_transactions (
      user_id,
      amount,
      type,
      reference_id,
      description
    )
    VALUES (
      p_user_id,
      -p_points_to_spend,
      'spend',
      p_course_id,
      'Used for course purchase'
    );
  END IF;

  IF p_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_usages (coupon_id, user_id, course_id)
    VALUES (p_coupon_id, p_user_id, p_course_id)
    ON CONFLICT (coupon_id, user_id, course_id) DO NOTHING
    RETURNING id INTO v_coupon_usage_id;

    IF v_coupon_usage_id IS NOT NULL THEN
      UPDATE public.coupons
      SET usage_count = usage_count + 1
      WHERE id = p_coupon_id;
    END IF;
  END IF;

  UPDATE public.users
  SET points = points + 1000,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.point_transactions (
    user_id,
    amount,
    type,
    reference_id,
    description
  )
  VALUES (
    p_user_id,
    1000,
    'earn',
    p_course_id,
    'Earned from course purchase'
  );

  UPDATE public.checkout_sessions
  SET
    status = 'completed',
    user_id = p_user_id,
    enrollment_id = v_enrollment_id,
    completed_at = now()
  WHERE id = v_checkout.id;

  RETURN QUERY SELECT v_enrollment_id, false;
END;
$function$;

REVOKE ALL ON FUNCTION public.finalize_course_purchase(
  text, uuid, uuid, text, integer, integer, boolean, integer, uuid
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.finalize_course_purchase(
  text, uuid, uuid, text, integer, integer, boolean, integer, uuid
) TO service_role;

COMMENT ON FUNCTION public.finalize_course_purchase(
  text, uuid, uuid, text, integer, integer, boolean, integer, uuid
) IS 'Atomically creates a paid enrollment, applies purchase rewards/discount usage, and completes its Stripe checkout. Service role only.';
