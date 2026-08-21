-- Serialize guest password-setup email generation across the Stripe webhook
-- and the browser success-page reconciliation path. A short durable lease
-- prevents both requests from generating different Supabase action links and
-- sending them through Resend with the same idempotency key.

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS password_setup_email_claimed_at timestamp with time zone;

-- A confirmed send is authoritative. Older concurrent attempts could record an
-- idempotency error after another request had already recorded the successful
-- delivery.
UPDATE public.checkout_sessions
SET password_setup_email_error = NULL,
    updated_at = now()
WHERE password_setup_email_sent_at IS NOT NULL
  AND password_setup_email_error IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_checkout_password_setup_email(
  p_checkout_id uuid,
  p_stale_seconds integer DEFAULT 900
)
RETURNS TABLE(checkout_id uuid, claimed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_checkout public.checkout_sessions%ROWTYPE;
  v_claimed_at timestamp with time zone := now();
BEGIN
  SELECT checkout.* INTO v_checkout
  FROM public.checkout_sessions AS checkout
  WHERE checkout.id = p_checkout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session was not recorded';
  END IF;

  IF v_checkout.password_setup_email_sent_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF v_checkout.password_setup_email_claimed_at IS NOT NULL
     AND v_checkout.password_setup_email_claimed_at
       > now() - (GREATEST(p_stale_seconds, 60) * interval '1 second') THEN
    RETURN;
  END IF;

  UPDATE public.checkout_sessions
  SET password_setup_email_claimed_at = v_claimed_at,
      password_setup_email_error = NULL,
      updated_at = now()
  WHERE id = v_checkout.id;

  RETURN QUERY SELECT v_checkout.id, v_claimed_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_checkout_password_setup_email(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_checkout_password_setup_email(uuid, integer)
  TO service_role;

COMMENT ON FUNCTION public.claim_checkout_password_setup_email(uuid, integer) IS
  'Claims a retry-safe lease before generating and sending a guest password-setup link. Service role only.';

