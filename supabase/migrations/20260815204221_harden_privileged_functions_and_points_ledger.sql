-- Harden privileged application functions without changing their business logic.
-- All referenced objects are schema-qualified because the functions use an empty
-- search_path to prevent object-shadowing attacks.

CREATE OR REPLACE FUNCTION public.adjust_user_points(
  p_user_id uuid,
  p_delta integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  new_balance integer;
BEGIN
  UPDATE public.users
  SET
    points = GREATEST(0, points + p_delta),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING points INTO new_balance;

  RETURN COALESCE(new_balance, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(
  p_coupon_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.coupons
  SET usage_count = usage_count + 1
  WHERE id = p_coupon_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.users
  SET
    email_verified = (NEW.email_confirmed_at IS NOT NULL),
    email = NEW.email,
    updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

-- Financial mutation RPCs are backend-only.
REVOKE ALL ON FUNCTION public.adjust_user_points(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_user_points(uuid, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.increment_coupon_usage(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid)
  TO service_role;

-- RLS policies currently call is_admin() for both anonymous catalog requests
-- and authenticated requests. Keep only those explicit roles; remove PUBLIC.
REVOKE ALL ON FUNCTION public.is_admin()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin()
  TO anon, authenticated, service_role;

-- Trigger helpers are executed by Supabase Auth, not through the Data API.
REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user()
  TO supabase_auth_admin, service_role;

REVOKE ALL ON FUNCTION public.handle_auth_user_update()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_auth_user_update()
  TO supabase_auth_admin, service_role;

-- The service role bypasses RLS and does not need a permissive public policy.
DROP POLICY IF EXISTS "Service role can insert point_transactions"
  ON public.point_transactions;
REVOKE INSERT ON TABLE public.point_transactions FROM anon, authenticated;

COMMENT ON FUNCTION public.adjust_user_points(uuid, integer)
  IS 'Atomically adjusts a user points balance. Backend service role only.';
COMMENT ON FUNCTION public.increment_coupon_usage(uuid)
  IS 'Atomically increments coupon usage. Backend service role only.';
