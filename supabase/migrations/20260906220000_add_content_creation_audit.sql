-- Append-only audit history for course, module, and lesson creation.
-- The source content tables remain unchanged. Snapshot fields preserve useful
-- context if a user or content record is later renamed or removed.

CREATE TABLE IF NOT EXISTS public.content_creation_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid,
  actor_role text NOT NULL,
  actor_name text NOT NULL,
  actor_email text NOT NULL,
  action text NOT NULL DEFAULT 'created',
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  course_id uuid,
  module_id uuid,
  lesson_id uuid,
  entity_title text NOT NULL,
  course_title text NOT NULL,
  module_title text,
  lesson_type text,
  assessment_key text,
  is_course_introduction boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_creation_audit_actor_user_id_fkey
    FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT content_creation_audit_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL,
  CONSTRAINT content_creation_audit_module_id_fkey
    FOREIGN KEY (module_id) REFERENCES public.course_modules(id) ON DELETE SET NULL,
  CONSTRAINT content_creation_audit_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL,
  CONSTRAINT content_creation_audit_actor_role_check
    CHECK (actor_role IN ('admin', 'creator')),
  CONSTRAINT content_creation_audit_action_check
    CHECK (action = 'created'),
  CONSTRAINT content_creation_audit_entity_type_check
    CHECK (entity_type IN ('course', 'module', 'lesson')),
  CONSTRAINT content_creation_audit_lesson_type_check
    CHECK (lesson_type IS NULL OR lesson_type IN ('video', 'assessment'))
);

CREATE INDEX IF NOT EXISTS content_creation_audit_created_at_idx
  ON public.content_creation_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS content_creation_audit_actor_idx
  ON public.content_creation_audit_log (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS content_creation_audit_course_idx
  ON public.content_creation_audit_log (course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS content_creation_audit_entity_type_idx
  ON public.content_creation_audit_log (entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS content_creation_audit_module_idx
  ON public.content_creation_audit_log (module_id) WHERE module_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS content_creation_audit_lesson_idx
  ON public.content_creation_audit_log (lesson_id) WHERE lesson_id IS NOT NULL;

ALTER TABLE public.content_creation_audit_log ENABLE ROW LEVEL SECURITY;

INSERT INTO public.creator_permissions (permission_key, enabled)
VALUES ('courses.activity', true)
ON CONFLICT (permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_view_content_creation_activity()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.users AS staff
      WHERE staff.id = (SELECT auth.uid())
        AND (
          staff.role = 'admin'
          OR (
            staff.role = 'creator'
            AND EXISTS (
              SELECT 1
              FROM public.creator_permissions AS permission
              WHERE permission.permission_key = 'courses.activity'
                AND permission.enabled = true
            )
          )
        )
    );
$function$;

DROP POLICY IF EXISTS content_creation_audit_staff_select ON public.content_creation_audit_log;
CREATE POLICY content_creation_audit_staff_select
  ON public.content_creation_audit_log
  FOR SELECT
  TO authenticated
  USING ((SELECT public.can_view_content_creation_activity()));

CREATE OR REPLACE FUNCTION public.record_content_creation_activity(
  p_actor_user_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_role text;
  v_actor_name text;
  v_actor_email text;
  v_course_id uuid;
  v_module_id uuid;
  v_lesson_id uuid;
  v_entity_title text;
  v_course_title text;
  v_module_title text;
  v_lesson_type text;
  v_assessment_key text;
  v_is_course_introduction boolean := false;
  v_audit_id bigint;
BEGIN
  SELECT
    staff.role,
    trim(concat_ws(' ', staff.first_name, staff.last_name)),
    staff.email
  INTO v_actor_role, v_actor_name, v_actor_email
  FROM public.users AS staff
  WHERE staff.id = p_actor_user_id
    AND staff.role IN ('admin', 'creator');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A valid staff actor is required.';
  END IF;

  v_actor_name := coalesce(nullif(v_actor_name, ''), v_actor_email, 'Staff member');
  v_actor_email := coalesce(v_actor_email, '');

  CASE p_entity_type
    WHEN 'course' THEN
      SELECT course.id, course.title, course.title
      INTO v_course_id, v_entity_title, v_course_title
      FROM public.courses AS course
      WHERE course.id = p_entity_id;
    WHEN 'module' THEN
      SELECT module.course_id, module.id, module.title, course.title, module.title
      INTO v_course_id, v_module_id, v_entity_title, v_course_title, v_module_title
      FROM public.course_modules AS module
      JOIN public.courses AS course ON course.id = module.course_id
      WHERE module.id = p_entity_id;
    WHEN 'lesson' THEN
      SELECT
        lesson.course_id,
        lesson.module_id,
        lesson.id,
        lesson.title,
        course.title,
        module.title,
        lesson.type,
        lesson.assessment_key,
        coalesce(lesson.is_course_introduction, false)
      INTO
        v_course_id,
        v_module_id,
        v_lesson_id,
        v_entity_title,
        v_course_title,
        v_module_title,
        v_lesson_type,
        v_assessment_key,
        v_is_course_introduction
      FROM public.lessons AS lesson
      JOIN public.courses AS course ON course.id = lesson.course_id
      LEFT JOIN public.course_modules AS module ON module.id = lesson.module_id
      WHERE lesson.id = p_entity_id;
    ELSE
      RAISE EXCEPTION 'Unsupported content entity type.';
  END CASE;

  IF v_entity_title IS NULL OR v_course_title IS NULL THEN
    RAISE EXCEPTION 'The created content record was not found.';
  END IF;

  INSERT INTO public.content_creation_audit_log (
    actor_user_id,
    actor_role,
    actor_name,
    actor_email,
    entity_type,
    entity_id,
    course_id,
    module_id,
    lesson_id,
    entity_title,
    course_title,
    module_title,
    lesson_type,
    assessment_key,
    is_course_introduction
  ) VALUES (
    p_actor_user_id,
    v_actor_role,
    v_actor_name,
    v_actor_email,
    p_entity_type,
    p_entity_id,
    v_course_id,
    v_module_id,
    v_lesson_id,
    v_entity_title,
    v_course_title,
    v_module_title,
    v_lesson_type,
    v_assessment_key,
    v_is_course_introduction
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$function$;

REVOKE ALL ON TABLE public.content_creation_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.content_creation_audit_log TO authenticated;
GRANT ALL ON TABLE public.content_creation_audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.content_creation_audit_log_id_seq TO service_role;

REVOKE ALL ON FUNCTION public.can_view_content_creation_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_content_creation_activity() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_content_creation_activity(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_content_creation_activity(uuid, text, uuid) TO service_role;

COMMENT ON TABLE public.content_creation_audit_log IS
  'Append-only staff audit history for course, module, and lesson creation.';
COMMENT ON FUNCTION public.record_content_creation_activity(uuid, text, uuid) IS
  'Service-role-only recorder that derives audit snapshots from protected database records.';
