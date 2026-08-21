-- Central permission switches for the creator role. Administrators are always
-- authorized by application policy and are not represented in this table.

CREATE TABLE IF NOT EXISTS public.creator_permissions (
  permission_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creator_permissions_admin_select ON public.creator_permissions;
CREATE POLICY creator_permissions_admin_select
  ON public.creator_permissions FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS creator_permissions_admin_insert ON public.creator_permissions;
CREATE POLICY creator_permissions_admin_insert
  ON public.creator_permissions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS creator_permissions_admin_update ON public.creator_permissions;
CREATE POLICY creator_permissions_admin_update
  ON public.creator_permissions FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS creator_permissions_admin_delete ON public.creator_permissions;
CREATE POLICY creator_permissions_admin_delete
  ON public.creator_permissions FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

INSERT INTO public.creator_permissions (permission_key, enabled)
SELECT permission_key, false
FROM unnest(ARRAY[
  'dashboard.overview',
  'external_assessments.manage',
  'courses.view',
  'courses.create',
  'courses.edit',
  'courses.content',
  'users.overview',
  'users.directory',
  'users.enrollments',
  'users.progress',
  'users.course_performance',
  'users.video_analytics',
  'users.assessments',
  'users.certificates',
  'users.purchases',
  'coupons.manage',
  'settings.manage'
]) AS permission_key
ON CONFLICT (permission_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.staff_access_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_role text NOT NULL,
  permission_key text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_access_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_access_audit_admin_select ON public.staff_access_audit_log;
CREATE POLICY staff_access_audit_admin_select
  ON public.staff_access_audit_log FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

-- Service-role calls are intentionally recognized as privileged. The service
-- role already bypasses RLS; this also permits guarded backend RPC execution.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$function$;

REVOKE ALL ON TABLE public.creator_permissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.creator_permissions TO authenticated;
GRANT ALL ON TABLE public.creator_permissions TO service_role;

REVOKE ALL ON TABLE public.staff_access_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.staff_access_audit_log TO authenticated;
GRANT ALL ON TABLE public.staff_access_audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.staff_access_audit_log_id_seq TO service_role;
