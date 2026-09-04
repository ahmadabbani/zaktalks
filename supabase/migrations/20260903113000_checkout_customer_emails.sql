-- Independent, idempotent delivery tracking for customer-facing payment and
-- course-access emails. Existing checkouts are suppressed so deploying this
-- feature never sends historical purchase emails unexpectedly.

CREATE TABLE IF NOT EXISTS public.checkout_customer_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id uuid NOT NULL REFERENCES public.checkout_sessions(id) ON DELETE CASCADE,
  email_type text NOT NULL CHECK (email_type IN ('payment_receipt', 'course_access')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'suppressed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  claimed_at timestamptz,
  sent_at timestamptz,
  provider_email_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checkout_customer_emails_checkout_type_key UNIQUE (checkout_id, email_type)
);

ALTER TABLE public.checkout_customer_emails ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.checkout_customer_emails FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.checkout_customer_emails TO service_role;

CREATE INDEX IF NOT EXISTS checkout_customer_emails_retry_idx
  ON public.checkout_customer_emails (status, updated_at)
  WHERE status IN ('pending', 'failed', 'processing');

INSERT INTO public.checkout_customer_emails (
  checkout_id,
  email_type,
  status,
  created_at,
  updated_at
)
SELECT
  checkout.id,
  email_kind.email_type,
  'suppressed',
  now(),
  now()
FROM public.checkout_sessions AS checkout
CROSS JOIN (
  VALUES ('payment_receipt'::text), ('course_access'::text)
) AS email_kind(email_type)
ON CONFLICT (checkout_id, email_type) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_checkout_customer_email(
  p_stripe_session_id text,
  p_email_type text,
  p_stale_seconds integer DEFAULT 900
)
RETURNS TABLE(checkout_id uuid, claimed_at timestamptz)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_checkout public.checkout_sessions%ROWTYPE;
  v_delivery public.checkout_customer_emails%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_stale_seconds integer := greatest(60, least(coalesce(p_stale_seconds, 900), 86400));
  v_eligible boolean := false;
BEGIN
  IF p_stripe_session_id IS NULL OR p_stripe_session_id !~ '^cs_' THEN
    RAISE EXCEPTION 'A valid Stripe Checkout Session ID is required' USING errcode = '22023';
  END IF;

  IF p_email_type NOT IN ('payment_receipt', 'course_access') THEN
    RAISE EXCEPTION 'Unsupported customer email type' USING errcode = '22023';
  END IF;

  SELECT checkout.*
  INTO v_checkout
  FROM public.checkout_sessions AS checkout
  WHERE checkout.stripe_session_id = p_stripe_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_eligible := coalesce(v_checkout.duplicate_payment, false) = false
    AND v_checkout.email IS NOT NULL
    AND btrim(v_checkout.email) <> ''
    AND CASE p_email_type
      WHEN 'payment_receipt' THEN
        v_checkout.payment_state IN ('paid', 'no_payment_required', 'partially_refunded')
      WHEN 'course_access' THEN
        v_checkout.payment_state IN ('paid', 'no_payment_required', 'partially_refunded')
        AND v_checkout.fulfillment_state = 'fulfilled'
        AND v_checkout.enrollment_id IS NOT NULL
      ELSE false
    END;

  IF NOT v_eligible THEN
    RETURN;
  END IF;

  INSERT INTO public.checkout_customer_emails (checkout_id, email_type)
  VALUES (v_checkout.id, p_email_type)
  ON CONFLICT (checkout_id, email_type) DO NOTHING;

  SELECT delivery.*
  INTO v_delivery
  FROM public.checkout_customer_emails AS delivery
  WHERE delivery.checkout_id = v_checkout.id
    AND delivery.email_type = p_email_type
  FOR UPDATE;

  IF v_delivery.status IN ('sent', 'suppressed')
    OR (
      v_delivery.status = 'processing'
      AND v_delivery.claimed_at IS NOT NULL
      AND v_delivery.claimed_at > v_now - make_interval(secs => v_stale_seconds)
    ) THEN
    RETURN;
  END IF;

  UPDATE public.checkout_customer_emails AS delivery
  SET
    status = 'processing',
    attempts = delivery.attempts + 1,
    claimed_at = v_now,
    last_error = NULL,
    updated_at = v_now
  WHERE delivery.id = v_delivery.id;

  RETURN QUERY SELECT v_checkout.id, v_now;
END;
$function$;

CREATE OR REPLACE FUNCTION public.checkout_customer_email_claim_is_current(
  p_stripe_session_id text,
  p_email_type text,
  p_claimed_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.checkout_sessions AS checkout
    JOIN public.checkout_customer_emails AS delivery
      ON delivery.checkout_id = checkout.id
    WHERE checkout.stripe_session_id = p_stripe_session_id
      AND delivery.email_type = p_email_type
      AND delivery.status = 'processing'
      AND delivery.claimed_at = p_claimed_at
      AND delivery.sent_at IS NULL
      AND coalesce(checkout.duplicate_payment, false) = false
      AND checkout.email IS NOT NULL
      AND btrim(checkout.email) <> ''
      AND CASE p_email_type
        WHEN 'payment_receipt' THEN
          checkout.payment_state IN ('paid', 'no_payment_required', 'partially_refunded')
        WHEN 'course_access' THEN
          checkout.payment_state IN ('paid', 'no_payment_required', 'partially_refunded')
          AND checkout.fulfillment_state = 'fulfilled'
          AND checkout.enrollment_id IS NOT NULL
        ELSE false
      END
  );
$function$;

CREATE OR REPLACE FUNCTION public.record_checkout_customer_email_result(
  p_stripe_session_id text,
  p_email_type text,
  p_claimed_at timestamptz,
  p_sent boolean,
  p_email_id text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_recorded boolean := false;
BEGIN
  IF p_email_type NOT IN ('payment_receipt', 'course_access') OR p_claimed_at IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.checkout_customer_emails AS delivery
  SET
    status = CASE WHEN p_sent THEN 'sent' ELSE 'failed' END,
    sent_at = CASE WHEN p_sent THEN coalesce(delivery.sent_at, clock_timestamp()) ELSE delivery.sent_at END,
    provider_email_id = CASE WHEN p_sent THEN coalesce(p_email_id, delivery.provider_email_id) ELSE delivery.provider_email_id END,
    last_error = CASE WHEN p_sent THEN NULL ELSE left(coalesce(p_error, 'Email delivery failed'), 2000) END,
    claimed_at = NULL,
    updated_at = clock_timestamp()
  FROM public.checkout_sessions AS checkout
  WHERE checkout.id = delivery.checkout_id
    AND checkout.stripe_session_id = p_stripe_session_id
    AND delivery.email_type = p_email_type
    AND delivery.status = 'processing'
    AND delivery.claimed_at = p_claimed_at
    AND delivery.sent_at IS NULL;

  v_recorded := FOUND;
  RETURN v_recorded;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_checkout_customer_email(text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_checkout_customer_email(text, text, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.checkout_customer_email_claim_is_current(text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_customer_email_claim_is_current(text, text, timestamptz)
  TO service_role;

REVOKE ALL ON FUNCTION public.record_checkout_customer_email_result(text, text, timestamptz, boolean, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_checkout_customer_email_result(text, text, timestamptz, boolean, text, text)
  TO service_role;

COMMENT ON TABLE public.checkout_customer_emails IS
  'Service-role-only delivery ledger for idempotent customer payment and course-access emails.';

COMMENT ON FUNCTION public.claim_checkout_customer_email(text, text, integer) IS
  'Claims one eligible customer email without changing payment, fulfillment, enrollment, or account state.';

COMMENT ON FUNCTION public.record_checkout_customer_email_result(text, text, timestamptz, boolean, text, text) IS
  'Records a claimed customer email result while protecting against stale workers.';
