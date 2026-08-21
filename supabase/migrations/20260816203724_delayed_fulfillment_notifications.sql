-- Durable, retry-safe notifications for a paid checkout whose course access
-- could not be granted. Email delivery is intentionally outside the purchase
-- transaction; these columns only track notification attempts and never alter
-- payment or enrollment state.

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS fulfillment_first_failed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fulfillment_customer_notice_claimed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fulfillment_customer_notice_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fulfillment_customer_notice_email_id text,
  ADD COLUMN IF NOT EXISTS fulfillment_customer_notice_error text,
  ADD COLUMN IF NOT EXISTS fulfillment_admin_notice_claimed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fulfillment_admin_notice_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fulfillment_admin_notice_email_id text,
  ADD COLUMN IF NOT EXISTS fulfillment_admin_notice_error text,
  ADD COLUMN IF NOT EXISTS fulfillment_customer_recovery_claimed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fulfillment_customer_recovery_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fulfillment_customer_recovery_email_id text,
  ADD COLUMN IF NOT EXISTS fulfillment_customer_recovery_error text,
  ADD COLUMN IF NOT EXISTS fulfillment_admin_recovery_claimed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fulfillment_admin_recovery_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fulfillment_admin_recovery_email_id text,
  ADD COLUMN IF NOT EXISTS fulfillment_admin_recovery_error text;

CREATE INDEX IF NOT EXISTS checkout_sessions_delayed_notice_idx
  ON public.checkout_sessions (fulfillment_first_failed_at, fulfillment_attempts)
  WHERE payment_state IN ('paid', 'no_payment_required')
    AND fulfillment_state IN ('failed', 'requires_attention')
    AND fulfillment_customer_notice_sent_at IS NULL;

CREATE OR REPLACE FUNCTION public.mark_checkout_payment_verified(
  p_stripe_session_id text,
  p_stripe_payment_intent_id text,
  p_payment_state text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF p_payment_state NOT IN ('paid', 'no_payment_required') THEN
    RAISE EXCEPTION 'Unsupported verified payment state';
  END IF;

  UPDATE public.checkout_sessions
  SET payment_state = p_payment_state,
      stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, p_stripe_payment_intent_id),
      updated_at = now()
  WHERE stripe_session_id = p_stripe_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session was not recorded';
  END IF;
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
      fulfillment_first_failed_at = COALESCE(fulfillment_first_failed_at, now()),
      last_fulfillment_error = left(COALESCE(p_error, 'Unknown fulfillment error'), 2000),
      updated_at = now()
  WHERE stripe_session_id = p_stripe_session_id
    AND fulfillment_state <> 'fulfilled';
$function$;

CREATE OR REPLACE FUNCTION public.claim_checkout_fulfillment_notification(
  p_stripe_session_id text,
  p_notification_type text,
  p_min_attempts integer DEFAULT 3,
  p_min_age_seconds integer DEFAULT 300
)
RETURNS TABLE(checkout_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_checkout public.checkout_sessions%ROWTYPE;
  v_eligible boolean := false;
BEGIN
  IF p_notification_type NOT IN (
    'customer_failure', 'admin_failure',
    'customer_recovery', 'admin_recovery'
  ) THEN
    RAISE EXCEPTION 'Unsupported fulfillment notification type';
  END IF;

  SELECT checkout.* INTO v_checkout
  FROM public.checkout_sessions AS checkout
  WHERE checkout.stripe_session_id = p_stripe_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session was not recorded';
  END IF;

  IF p_notification_type = 'customer_failure' THEN
    v_eligible := v_checkout.payment_state IN ('paid', 'no_payment_required')
      AND v_checkout.fulfillment_state IN ('failed', 'requires_attention')
      AND v_checkout.fulfillment_attempts >= GREATEST(p_min_attempts, 1)
      AND v_checkout.fulfillment_first_failed_at IS NOT NULL
      AND v_checkout.fulfillment_first_failed_at <= now() - (GREATEST(p_min_age_seconds, 0) * interval '1 second')
      AND v_checkout.fulfillment_customer_notice_sent_at IS NULL
      AND (
        v_checkout.fulfillment_customer_notice_claimed_at IS NULL
        OR v_checkout.fulfillment_customer_notice_claimed_at <= now() - interval '15 minutes'
      );
  ELSIF p_notification_type = 'admin_failure' THEN
    v_eligible := v_checkout.payment_state IN ('paid', 'no_payment_required')
      AND v_checkout.fulfillment_state IN ('failed', 'requires_attention')
      AND v_checkout.fulfillment_attempts >= GREATEST(p_min_attempts, 1)
      AND v_checkout.fulfillment_first_failed_at IS NOT NULL
      AND v_checkout.fulfillment_first_failed_at <= now() - (GREATEST(p_min_age_seconds, 0) * interval '1 second')
      AND v_checkout.fulfillment_admin_notice_sent_at IS NULL
      AND (
        v_checkout.fulfillment_admin_notice_claimed_at IS NULL
        OR v_checkout.fulfillment_admin_notice_claimed_at <= now() - interval '15 minutes'
      );
  ELSIF p_notification_type = 'customer_recovery' THEN
    v_eligible := v_checkout.fulfillment_state = 'fulfilled'
      AND v_checkout.fulfillment_customer_notice_sent_at IS NOT NULL
      AND v_checkout.fulfillment_customer_recovery_sent_at IS NULL
      AND (
        v_checkout.fulfillment_customer_recovery_claimed_at IS NULL
        OR v_checkout.fulfillment_customer_recovery_claimed_at <= now() - interval '15 minutes'
      );
  ELSE
    v_eligible := v_checkout.fulfillment_state = 'fulfilled'
      AND v_checkout.fulfillment_admin_notice_sent_at IS NOT NULL
      AND v_checkout.fulfillment_admin_recovery_sent_at IS NULL
      AND (
        v_checkout.fulfillment_admin_recovery_claimed_at IS NULL
        OR v_checkout.fulfillment_admin_recovery_claimed_at <= now() - interval '15 minutes'
      );
  END IF;

  IF NOT v_eligible THEN
    RETURN;
  END IF;

  UPDATE public.checkout_sessions
  SET fulfillment_customer_notice_claimed_at = CASE
        WHEN p_notification_type = 'customer_failure' THEN now()
        ELSE fulfillment_customer_notice_claimed_at
      END,
      fulfillment_admin_notice_claimed_at = CASE
        WHEN p_notification_type = 'admin_failure' THEN now()
        ELSE fulfillment_admin_notice_claimed_at
      END,
      fulfillment_customer_recovery_claimed_at = CASE
        WHEN p_notification_type = 'customer_recovery' THEN now()
        ELSE fulfillment_customer_recovery_claimed_at
      END,
      fulfillment_admin_recovery_claimed_at = CASE
        WHEN p_notification_type = 'admin_recovery' THEN now()
        ELSE fulfillment_admin_recovery_claimed_at
      END,
      updated_at = now()
  WHERE id = v_checkout.id;

  RETURN QUERY SELECT v_checkout.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_checkout_fulfillment_notification_result(
  p_stripe_session_id text,
  p_notification_type text,
  p_sent boolean,
  p_email_id text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF p_notification_type NOT IN (
    'customer_failure', 'admin_failure',
    'customer_recovery', 'admin_recovery'
  ) THEN
    RAISE EXCEPTION 'Unsupported fulfillment notification type';
  END IF;

  UPDATE public.checkout_sessions
  SET fulfillment_customer_notice_claimed_at = CASE
        WHEN p_notification_type = 'customer_failure' AND p_sent THEN NULL
        ELSE fulfillment_customer_notice_claimed_at
      END,
      fulfillment_customer_notice_sent_at = CASE
        WHEN p_notification_type = 'customer_failure' AND p_sent THEN now()
        ELSE fulfillment_customer_notice_sent_at
      END,
      fulfillment_customer_notice_email_id = CASE
        WHEN p_notification_type = 'customer_failure' AND p_sent THEN p_email_id
        ELSE fulfillment_customer_notice_email_id
      END,
      fulfillment_customer_notice_error = CASE
        WHEN p_notification_type = 'customer_failure' THEN
          CASE WHEN p_sent THEN NULL ELSE left(COALESCE(p_error, 'Unknown email error'), 2000) END
        ELSE fulfillment_customer_notice_error
      END,
      fulfillment_admin_notice_claimed_at = CASE
        WHEN p_notification_type = 'admin_failure' AND p_sent THEN NULL
        ELSE fulfillment_admin_notice_claimed_at
      END,
      fulfillment_admin_notice_sent_at = CASE
        WHEN p_notification_type = 'admin_failure' AND p_sent THEN now()
        ELSE fulfillment_admin_notice_sent_at
      END,
      fulfillment_admin_notice_email_id = CASE
        WHEN p_notification_type = 'admin_failure' AND p_sent THEN p_email_id
        ELSE fulfillment_admin_notice_email_id
      END,
      fulfillment_admin_notice_error = CASE
        WHEN p_notification_type = 'admin_failure' THEN
          CASE WHEN p_sent THEN NULL ELSE left(COALESCE(p_error, 'Unknown email error'), 2000) END
        ELSE fulfillment_admin_notice_error
      END,
      fulfillment_customer_recovery_claimed_at = CASE
        WHEN p_notification_type = 'customer_recovery' AND p_sent THEN NULL
        ELSE fulfillment_customer_recovery_claimed_at
      END,
      fulfillment_customer_recovery_sent_at = CASE
        WHEN p_notification_type = 'customer_recovery' AND p_sent THEN now()
        ELSE fulfillment_customer_recovery_sent_at
      END,
      fulfillment_customer_recovery_email_id = CASE
        WHEN p_notification_type = 'customer_recovery' AND p_sent THEN p_email_id
        ELSE fulfillment_customer_recovery_email_id
      END,
      fulfillment_customer_recovery_error = CASE
        WHEN p_notification_type = 'customer_recovery' THEN
          CASE WHEN p_sent THEN NULL ELSE left(COALESCE(p_error, 'Unknown email error'), 2000) END
        ELSE fulfillment_customer_recovery_error
      END,
      fulfillment_admin_recovery_claimed_at = CASE
        WHEN p_notification_type = 'admin_recovery' AND p_sent THEN NULL
        ELSE fulfillment_admin_recovery_claimed_at
      END,
      fulfillment_admin_recovery_sent_at = CASE
        WHEN p_notification_type = 'admin_recovery' AND p_sent THEN now()
        ELSE fulfillment_admin_recovery_sent_at
      END,
      fulfillment_admin_recovery_email_id = CASE
        WHEN p_notification_type = 'admin_recovery' AND p_sent THEN p_email_id
        ELSE fulfillment_admin_recovery_email_id
      END,
      fulfillment_admin_recovery_error = CASE
        WHEN p_notification_type = 'admin_recovery' THEN
          CASE WHEN p_sent THEN NULL ELSE left(COALESCE(p_error, 'Unknown email error'), 2000) END
        ELSE fulfillment_admin_recovery_error
      END,
      updated_at = now()
  WHERE stripe_session_id = p_stripe_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session was not recorded';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_checkout_payment_verified(text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_checkout_payment_verified(text, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.record_checkout_fulfillment_failure(text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_checkout_fulfillment_failure(text, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.claim_checkout_fulfillment_notification(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_checkout_fulfillment_notification(text, text, integer, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.record_checkout_fulfillment_notification_result(text, text, boolean, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_checkout_fulfillment_notification_result(text, text, boolean, text, text)
  TO service_role;
