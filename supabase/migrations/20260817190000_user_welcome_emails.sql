-- Durable, user-level welcome delivery. Existing accounts remain ineligible;
-- application flows explicitly mark only newly completed accounts as pending.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS welcome_email_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_email_claimed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS welcome_email_id text,
  ADD COLUMN IF NOT EXISTS welcome_email_error text;

CREATE INDEX IF NOT EXISTS users_pending_welcome_email_idx
  ON public.users (created_at)
  WHERE welcome_email_pending = true
    AND welcome_email_sent_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_user_welcome_email(
  p_user_id uuid,
  p_stale_seconds integer DEFAULT 900
)
RETURNS TABLE(claimed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_claimed_at timestamp with time zone := clock_timestamp();
BEGIN
  UPDATE public.users
  SET welcome_email_claimed_at = v_claimed_at,
      updated_at = now()
  WHERE id = p_user_id
    AND email_verified = true
    AND password_set = true
    AND welcome_email_pending = true
    AND welcome_email_sent_at IS NULL
    AND (
      welcome_email_claimed_at IS NULL
      OR welcome_email_claimed_at <= now() - (GREATEST(p_stale_seconds, 60) * interval '1 second')
    );

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT v_claimed_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_user_welcome_email_result(
  p_user_id uuid,
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
  UPDATE public.users
  SET welcome_email_pending = CASE WHEN p_sent THEN false ELSE welcome_email_pending END,
      welcome_email_claimed_at = NULL,
      welcome_email_sent_at = CASE WHEN p_sent THEN now() ELSE welcome_email_sent_at END,
      welcome_email_id = CASE WHEN p_sent THEN p_email_id ELSE welcome_email_id END,
      welcome_email_error = CASE
        WHEN p_sent THEN NULL
        ELSE left(COALESCE(p_error, 'Unknown email error'), 2000)
      END,
      updated_at = now()
  WHERE id = p_user_id
    AND welcome_email_claimed_at = p_claimed_at
    AND welcome_email_sent_at IS NULL;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_user_welcome_email(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_user_welcome_email(uuid, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.record_user_welcome_email_result(uuid, timestamp with time zone, boolean, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_user_welcome_email_result(uuid, timestamp with time zone, boolean, text, text)
  TO service_role;
