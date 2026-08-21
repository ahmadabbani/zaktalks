-- Rebuild portfolio trends for a set of courses selected by the newer,
-- evidence-based course health states. This keeps health filters and charts
-- consistent without loading raw enrollment or activity rows into Next.js.

CREATE OR REPLACE FUNCTION public.admin_course_performance_trends(
  p_course_ids uuid[],
  p_range text DEFAULT '30'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_range_start timestamp with time zone;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING errcode = '42501';
  END IF;

  IF coalesce(p_range, '30') NOT IN ('7', '30', '90', '365') THEN
    RAISE EXCEPTION 'Invalid course trend range' USING errcode = '22023';
  END IF;

  IF coalesce(cardinality(p_course_ids), 0) = 0 THEN
    RETURN jsonb_build_object(
      'enrollment_trend', '[]'::jsonb,
      'activity_trend', '[]'::jsonb
    );
  END IF;

  v_range_start := now() - (coalesce(p_range, '30')::integer * interval '1 day');

  WITH selected_enrollments AS (
    SELECT id, user_id, course_id, created_at
    FROM public.user_enrollments
    WHERE payment_status = 'completed'
      AND course_id = ANY(p_course_ids)
  ),
  enrollment_trend AS (
    SELECT
      date_trunc(
        CASE
          WHEN p_range IN ('7', '30') THEN 'day'
          WHEN p_range = '90' THEN 'week'
          ELSE 'month'
        END,
        enrollment.created_at
      ) AS bucket,
      count(*)::integer AS enrollments
    FROM selected_enrollments AS enrollment
    WHERE enrollment.created_at >= v_range_start
    GROUP BY 1
    ORDER BY 1
  ),
  activity_trend AS (
    SELECT
      date_trunc(
        CASE
          WHEN p_range IN ('7', '30') THEN 'day'
          WHEN p_range = '90' THEN 'week'
          ELSE 'month'
        END,
        progress.last_accessed_at
      ) AS bucket,
      count(*)::integer AS activity_signals,
      count(DISTINCT progress.user_id)::integer AS learners
    FROM public.lesson_progress AS progress
    JOIN selected_enrollments AS enrollment ON enrollment.id = progress.enrollment_id
    WHERE progress.last_accessed_at >= v_range_start
    GROUP BY 1
    ORDER BY 1
  )
  SELECT jsonb_build_object(
    'enrollment_trend', coalesce(
      (SELECT jsonb_agg(to_jsonb(trend) ORDER BY bucket) FROM enrollment_trend AS trend),
      '[]'::jsonb
    ),
    'activity_trend', coalesce(
      (SELECT jsonb_agg(to_jsonb(trend) ORDER BY bucket) FROM activity_trend AS trend),
      '[]'::jsonb
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_course_performance_trends(uuid[], text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_course_performance_trends(uuid[], text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_course_performance_trends(uuid[], text) IS
  'Admin-only enrollment and learning activity trends scoped to a validated set of course IDs.';
