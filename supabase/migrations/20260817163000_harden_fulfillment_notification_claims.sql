-- Give each delayed-fulfillment email worker an owned database lease.
-- This prevents a stale webhook/success-page worker from recording over a
-- newer retry and lets the application verify state immediately before send.

CREATE OR REPLACE FUNCTION public.claim_checkout_fulfillment_notification_v2(
  p_stripe_session_id text,
  p_notification_type text,
  p_min_attempts integer DEFAULT 3,
  p_min_age_seconds integer DEFAULT 300
)
RETURNS TABLE(checkout_id uuid, claimed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_checkout public.checkout_sessions%ROWTYPE;
  v_eligible boolean := false;
  v_claimed_at timestamp with time zone := clock_timestamp();
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
        WHEN p_notification_type = 'customer_failure' THEN v_claimed_at
        ELSE fulfillment_customer_notice_claimed_at
      END,
      fulfillment_admin_notice_claimed_at = CASE
        WHEN p_notification_type = 'admin_failure' THEN v_claimed_at
        ELSE fulfillment_admin_notice_claimed_at
      END,
      fulfillment_customer_recovery_claimed_at = CASE
        WHEN p_notification_type = 'customer_recovery' THEN v_claimed_at
        ELSE fulfillment_customer_recovery_claimed_at
      END,
      fulfillment_admin_recovery_claimed_at = CASE
        WHEN p_notification_type = 'admin_recovery' THEN v_claimed_at
        ELSE fulfillment_admin_recovery_claimed_at
      END,
      updated_at = now()
  WHERE id = v_checkout.id;

  RETURN QUERY SELECT v_checkout.id, v_claimed_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.checkout_fulfillment_notification_claim_is_current(
  p_stripe_session_id text,
  p_notification_type text,
  p_claimed_at timestamp with time zone
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_checkout public.checkout_sessions%ROWTYPE;
BEGIN
  IF p_notification_type NOT IN (
    'customer_failure', 'admin_failure',
    'customer_recovery', 'admin_recovery'
  ) THEN
    RAISE EXCEPTION 'Unsupported fulfillment notification type';
  END IF;

  SELECT checkout.* INTO v_checkout
  FROM public.checkout_sessions AS checkout
  WHERE checkout.stripe_session_id = p_stripe_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session was not recorded';
  END IF;

  IF p_notification_type = 'customer_failure' THEN
    RETURN v_checkout.payment_state IN ('paid', 'no_payment_required')
      AND v_checkout.fulfillment_state IN ('failed', 'requires_attention')
      AND v_checkout.fulfillment_customer_notice_sent_at IS NULL
      AND v_checkout.fulfillment_customer_notice_claimed_at = p_claimed_at;
  ELSIF p_notification_type = 'admin_failure' THEN
    RETURN v_checkout.payment_state IN ('paid', 'no_payment_required')
      AND v_checkout.fulfillment_state IN ('failed', 'requires_attention')
      AND v_checkout.fulfillment_admin_notice_sent_at IS NULL
      AND v_checkout.fulfillment_admin_notice_claimed_at = p_claimed_at;
  ELSIF p_notification_type = 'customer_recovery' THEN
    RETURN v_checkout.fulfillment_state = 'fulfilled'
      AND v_checkout.fulfillment_customer_notice_sent_at IS NOT NULL
      AND v_checkout.fulfillment_customer_recovery_sent_at IS NULL
      AND v_checkout.fulfillment_customer_recovery_claimed_at = p_claimed_at;
  END IF;

  RETURN v_checkout.fulfillment_state = 'fulfilled'
    AND v_checkout.fulfillment_admin_notice_sent_at IS NOT NULL
    AND v_checkout.fulfillment_admin_recovery_sent_at IS NULL
    AND v_checkout.fulfillment_admin_recovery_claimed_at = p_claimed_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_checkout_fulfillment_notification_result_v2(
  p_stripe_session_id text,
  p_notification_type text,
  p_claimed_at timestamp with time zone,
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
  v_row_count integer := 0;
BEGIN
  IF p_notification_type = 'customer_failure' THEN
    UPDATE public.checkout_sessions
    SET fulfillment_customer_notice_claimed_at = NULL,
        fulfillment_customer_notice_sent_at = CASE WHEN p_sent THEN now() ELSE fulfillment_customer_notice_sent_at END,
        fulfillment_customer_notice_email_id = CASE WHEN p_sent THEN p_email_id ELSE fulfillment_customer_notice_email_id END,
        fulfillment_customer_notice_error = CASE WHEN p_sent THEN NULL ELSE left(COALESCE(p_error, 'Unknown email error'), 2000) END,
        updated_at = now()
    WHERE stripe_session_id = p_stripe_session_id
      AND fulfillment_customer_notice_claimed_at = p_claimed_at
      AND fulfillment_customer_notice_sent_at IS NULL;
  ELSIF p_notification_type = 'admin_failure' THEN
    UPDATE public.checkout_sessions
    SET fulfillment_admin_notice_claimed_at = NULL,
        fulfillment_admin_notice_sent_at = CASE WHEN p_sent THEN now() ELSE fulfillment_admin_notice_sent_at END,
        fulfillment_admin_notice_email_id = CASE WHEN p_sent THEN p_email_id ELSE fulfillment_admin_notice_email_id END,
        fulfillment_admin_notice_error = CASE WHEN p_sent THEN NULL ELSE left(COALESCE(p_error, 'Unknown email error'), 2000) END,
        updated_at = now()
    WHERE stripe_session_id = p_stripe_session_id
      AND fulfillment_admin_notice_claimed_at = p_claimed_at
      AND fulfillment_admin_notice_sent_at IS NULL;
  ELSIF p_notification_type = 'customer_recovery' THEN
    UPDATE public.checkout_sessions
    SET fulfillment_customer_recovery_claimed_at = NULL,
        fulfillment_customer_recovery_sent_at = CASE WHEN p_sent THEN now() ELSE fulfillment_customer_recovery_sent_at END,
        fulfillment_customer_recovery_email_id = CASE WHEN p_sent THEN p_email_id ELSE fulfillment_customer_recovery_email_id END,
        fulfillment_customer_recovery_error = CASE WHEN p_sent THEN NULL ELSE left(COALESCE(p_error, 'Unknown email error'), 2000) END,
        updated_at = now()
    WHERE stripe_session_id = p_stripe_session_id
      AND fulfillment_customer_recovery_claimed_at = p_claimed_at
      AND fulfillment_customer_recovery_sent_at IS NULL;
  ELSIF p_notification_type = 'admin_recovery' THEN
    UPDATE public.checkout_sessions
    SET fulfillment_admin_recovery_claimed_at = NULL,
        fulfillment_admin_recovery_sent_at = CASE WHEN p_sent THEN now() ELSE fulfillment_admin_recovery_sent_at END,
        fulfillment_admin_recovery_email_id = CASE WHEN p_sent THEN p_email_id ELSE fulfillment_admin_recovery_email_id END,
        fulfillment_admin_recovery_error = CASE WHEN p_sent THEN NULL ELSE left(COALESCE(p_error, 'Unknown email error'), 2000) END,
        updated_at = now()
    WHERE stripe_session_id = p_stripe_session_id
      AND fulfillment_admin_recovery_claimed_at = p_claimed_at
      AND fulfillment_admin_recovery_sent_at IS NULL;
  ELSE
    RAISE EXCEPTION 'Unsupported fulfillment notification type';
  END IF;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_checkout_fulfillment_notification_v2(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_checkout_fulfillment_notification_v2(text, text, integer, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.checkout_fulfillment_notification_claim_is_current(text, text, timestamp with time zone)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.checkout_fulfillment_notification_claim_is_current(text, text, timestamp with time zone)
  TO service_role;

REVOKE ALL ON FUNCTION public.record_checkout_fulfillment_notification_result_v2(text, text, timestamp with time zone, boolean, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_checkout_fulfillment_notification_result_v2(text, text, timestamp with time zone, boolean, text, text)
  TO service_role;
