-- Server-only, privacy-preserving fixed-window throttles for public auth and
-- checkout entry points. Identifiers are HMAC-hashed by the application before
-- they reach Postgres; raw email addresses and IP addresses are never stored.

CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  action text NOT NULL,
  key_hash text NOT NULL,
  window_started_at timestamp with time zone NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (action, key_hash)
);

CREATE INDEX IF NOT EXISTS security_rate_limits_updated_at_idx
  ON public.security_rate_limits (updated_at);

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.security_rate_limits
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_security_rate_limit(
  p_action text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE(
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamp with time zone := clock_timestamp();
  v_row public.security_rate_limits%ROWTYPE;
  v_count integer;
  v_window_end timestamp with time zone;
BEGIN
  IF p_action IS NULL OR length(p_action) < 1 OR length(p_action) > 80
    OR p_key_hash IS NULL OR length(p_key_hash) <> 64
    OR p_limit < 1 OR p_limit > 10000
    OR p_window_seconds < 1 OR p_window_seconds > 604800 THEN
    RAISE EXCEPTION 'Invalid security rate-limit parameters';
  END IF;

  INSERT INTO public.security_rate_limits (
    action,
    key_hash,
    window_started_at,
    request_count,
    updated_at
  )
  VALUES (p_action, p_key_hash, v_now, 0, v_now)
  ON CONFLICT (action, key_hash) DO NOTHING;

  SELECT limits.*
  INTO v_row
  FROM public.security_rate_limits AS limits
  WHERE limits.action = p_action
    AND limits.key_hash = p_key_hash
  FOR UPDATE;

  v_window_end := v_row.window_started_at
    + (p_window_seconds * interval '1 second');

  IF v_window_end <= v_now THEN
    v_count := 1;

    UPDATE public.security_rate_limits
    SET window_started_at = v_now,
        request_count = v_count,
        updated_at = v_now
    WHERE action = p_action
      AND key_hash = p_key_hash;

    RETURN QUERY SELECT true, GREATEST(p_limit - v_count, 0), 0;
    RETURN;
  END IF;

  IF v_row.request_count >= p_limit THEN
    UPDATE public.security_rate_limits
    SET updated_at = v_now
    WHERE action = p_action
      AND key_hash = p_key_hash;

    RETURN QUERY SELECT
      false,
      0,
      GREATEST(ceil(extract(epoch FROM (v_window_end - v_now)))::integer, 1);
    RETURN;
  END IF;

  v_count := v_row.request_count + 1;

  UPDATE public.security_rate_limits
  SET request_count = v_count,
      updated_at = v_now
  WHERE action = p_action
    AND key_hash = p_key_hash;

  RETURN QUERY SELECT true, GREATEST(p_limit - v_count, 0), 0;

  -- Keep the table bounded without adding a scheduler dependency.
  IF random() < 0.01 THEN
    DELETE FROM public.security_rate_limits
    WHERE updated_at < v_now - interval '7 days';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_security_rate_limit(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_security_rate_limit(text, text, integer, integer)
  TO service_role;

COMMENT ON TABLE public.security_rate_limits IS
  'Server-only HMAC-keyed throttling state for public authentication and checkout endpoints.';
COMMENT ON FUNCTION public.consume_security_rate_limit(text, text, integer, integer) IS
  'Atomically consumes one fixed-window request allowance. Service role only.';
