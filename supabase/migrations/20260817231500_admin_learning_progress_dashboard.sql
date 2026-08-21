-- Aggregated learner-course progress reporting for the admin user workspace.
-- Video telemetry and assessment outcomes remain in their dedicated reports.

CREATE INDEX IF NOT EXISTS lesson_progress_enrollment_access_idx
  ON public.lesson_progress (enrollment_id, last_accessed_at DESC);

CREATE INDEX IF NOT EXISTS lesson_progress_enrollment_completion_idx
  ON public.lesson_progress (enrollment_id, is_completed, completed_at DESC);

CREATE OR REPLACE FUNCTION public.admin_learning_progress_dashboard(
  p_search text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_progress_status text DEFAULT 'all',
  p_activity text DEFAULT 'all',
  p_range text DEFAULT '30',
  p_sort text DEFAULT 'activity',
  p_page_size integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 25), 50));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_range_start timestamp with time zone;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING errcode = '42501';
  END IF;

  IF coalesce(p_progress_status, 'all') NOT IN ('all', 'not_started', 'in_progress', 'completed')
    OR coalesce(p_activity, 'all') NOT IN ('all', 'active', 'inactive', 'never')
    OR coalesce(p_range, '30') NOT IN ('7', '30', '90', '365')
    OR coalesce(p_sort, 'activity') NOT IN ('activity', 'progress_high', 'progress_low', 'newest', 'name', 'course') THEN
    RAISE EXCEPTION 'Invalid learning progress filter' USING errcode = '22023';
  END IF;

  v_range_start := now() - (coalesce(p_range, '30')::integer * interval '1 day');

  WITH lesson_counts AS (
    SELECT lesson.course_id, count(*)::integer AS total_lessons
    FROM public.lessons AS lesson
    GROUP BY lesson.course_id
  ),
  progress_stats AS (
    SELECT
      progress.enrollment_id,
      count(*)::integer AS started_lessons,
      count(*) FILTER (WHERE progress.is_completed)::integer AS completed_lessons,
      min(progress.started_at) AS first_started_at,
      max(progress.last_accessed_at) AS last_activity_at
    FROM public.lesson_progress AS progress
    GROUP BY progress.enrollment_id
  ),
  journey_base AS (
    SELECT
      enrollment.id AS enrollment_id,
      enrollment.user_id,
      enrollment.course_id,
      enrollment.created_at AS enrolled_at,
      profile.email,
      profile.first_name,
      profile.last_name,
      profile.email_verified,
      profile.avatar_url,
      course.title AS course_title,
      course.slug AS course_slug,
      coalesce(lesson_counts.total_lessons, 0) AS total_lessons,
      coalesce(progress_stats.started_lessons, 0) AS started_lessons,
      coalesce(progress_stats.completed_lessons, 0) AS completed_lessons,
      progress_stats.first_started_at,
      progress_stats.last_activity_at,
      CASE
        WHEN coalesce(lesson_counts.total_lessons, 0) > 0
          AND coalesce(progress_stats.completed_lessons, 0) >= lesson_counts.total_lessons THEN 'completed'
        WHEN coalesce(progress_stats.started_lessons, 0) > 0 THEN 'in_progress'
        ELSE 'not_started'
      END AS progress_status,
      CASE
        WHEN coalesce(lesson_counts.total_lessons, 0) = 0 THEN 0
        ELSE least(100, round(
          coalesce(progress_stats.completed_lessons, 0)::numeric
          * 100 / lesson_counts.total_lessons
        )::integer)
      END AS progress_percent,
      coalesce(
        nullif(lower(trim(concat_ws(' ', profile.first_name, profile.last_name))), ''),
        lower(profile.email)
      ) AS sort_name
    FROM public.user_enrollments AS enrollment
    JOIN public.users AS profile ON profile.id = enrollment.user_id
    JOIN public.courses AS course ON course.id = enrollment.course_id
    LEFT JOIN lesson_counts ON lesson_counts.course_id = enrollment.course_id
    LEFT JOIN progress_stats ON progress_stats.enrollment_id = enrollment.id
    WHERE enrollment.payment_status = 'completed'
  ),
  filtered AS (
    SELECT base.*
    FROM journey_base AS base
    WHERE (
        nullif(trim(coalesce(p_search, '')), '') IS NULL
        OR base.email ILIKE '%' || trim(p_search) || '%'
        OR concat_ws(' ', base.first_name, base.last_name) ILIKE '%' || trim(p_search) || '%'
        OR base.course_title ILIKE '%' || trim(p_search) || '%'
      )
      AND (p_course_id IS NULL OR base.course_id = p_course_id)
      AND (coalesce(p_progress_status, 'all') = 'all' OR base.progress_status = p_progress_status)
      AND (
        coalesce(p_activity, 'all') = 'all'
        OR (p_activity = 'active' AND base.last_activity_at >= v_range_start)
        OR (p_activity = 'inactive' AND base.last_activity_at IS NOT NULL AND base.last_activity_at < v_range_start)
        OR (p_activity = 'never' AND base.last_activity_at IS NULL)
      )
  ),
  ordered AS (
    SELECT filtered.*
    FROM filtered
    ORDER BY
      CASE WHEN p_sort = 'activity' THEN coalesce(last_activity_at, '-infinity'::timestamp with time zone) END DESC,
      CASE WHEN p_sort = 'progress_high' THEN progress_percent END DESC,
      CASE WHEN p_sort = 'progress_low' THEN progress_percent END ASC,
      CASE WHEN p_sort = 'newest' THEN enrolled_at END DESC,
      CASE WHEN p_sort = 'name' THEN sort_name END ASC,
      CASE WHEN p_sort = 'course' THEN lower(course_title) END ASC,
      CASE WHEN p_sort IN ('activity', 'progress_high', 'newest') THEN enrollment_id END DESC,
      CASE WHEN p_sort IN ('progress_low', 'name', 'course') THEN enrollment_id END ASC
    OFFSET v_offset
    LIMIT v_page_size
  ),
  summary AS (
    SELECT
      count(*)::integer AS journeys,
      count(DISTINCT user_id)::integer AS learners,
      coalesce(round(avg(progress_percent)), 0)::integer AS average_progress,
      count(*) FILTER (WHERE progress_status = 'completed')::integer AS completed,
      count(*) FILTER (WHERE progress_status = 'in_progress')::integer AS in_progress,
      count(*) FILTER (WHERE progress_status = 'not_started')::integer AS not_started,
      count(DISTINCT user_id) FILTER (WHERE last_activity_at >= v_range_start)::integer AS active_learners
    FROM filtered
  ),
  completion_trend AS (
    SELECT
      date_trunc(
        CASE
          WHEN p_range IN ('7', '30') THEN 'day'
          WHEN p_range = '90' THEN 'week'
          ELSE 'month'
        END,
        progress.completed_at
      ) AS bucket,
      count(*)::integer AS completions,
      count(DISTINCT progress.user_id)::integer AS learners
    FROM public.lesson_progress AS progress
    JOIN filtered ON filtered.enrollment_id = progress.enrollment_id
    WHERE progress.is_completed = true
      AND progress.completed_at >= v_range_start
    GROUP BY 1
    ORDER BY 1
  ),
  course_health AS (
    SELECT
      course_id,
      course_title,
      count(*)::integer AS learners,
      coalesce(round(avg(progress_percent)), 0)::integer AS average_progress,
      count(*) FILTER (WHERE progress_status = 'completed')::integer AS completed,
      count(*) FILTER (WHERE progress_status = 'in_progress')::integer AS in_progress,
      count(*) FILTER (WHERE progress_status = 'not_started')::integer AS not_started
    FROM filtered
    GROUP BY course_id, course_title
    ORDER BY average_progress DESC, course_title
  ),
  module_learner_progress AS (
    SELECT
      filtered.enrollment_id,
      filtered.course_id,
      filtered.course_title,
      module.id AS module_id,
      module.title AS module_title,
      module.display_order,
      count(lesson.id)::integer AS total_lessons,
      count(progress.id) FILTER (WHERE progress.is_completed)::integer AS completed_lessons,
      count(progress.id)::integer AS started_lessons
    FROM filtered
    JOIN public.course_modules AS module ON module.course_id = filtered.course_id
    LEFT JOIN public.lessons AS lesson ON lesson.module_id = module.id
    LEFT JOIN public.lesson_progress AS progress
      ON progress.enrollment_id = filtered.enrollment_id
      AND progress.lesson_id = lesson.id
    GROUP BY filtered.enrollment_id, filtered.course_id, filtered.course_title,
      module.id, module.title, module.display_order
  ),
  module_health AS (
    SELECT
      course_id,
      course_title,
      module_id,
      module_title,
      display_order,
      count(*)::integer AS learner_journeys,
      count(*) FILTER (WHERE started_lessons > 0)::integer AS learners_started,
      coalesce(round(avg(
        CASE WHEN total_lessons = 0 THEN 0
        ELSE completed_lessons::numeric * 100 / total_lessons END
      )), 0)::integer AS average_progress
    FROM module_learner_progress
    GROUP BY course_id, course_title, module_id, module_title, display_order
    ORDER BY average_progress ASC, course_title, display_order
  )
  SELECT jsonb_build_object(
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(row_data)) FROM ordered AS row_data), '[]'::jsonb),
    'total_count', (SELECT journeys FROM summary),
    'summary', jsonb_build_object(
      'journeys', (SELECT journeys FROM summary),
      'learners', (SELECT learners FROM summary),
      'average_progress', (SELECT average_progress FROM summary),
      'completed', (SELECT completed FROM summary),
      'in_progress', (SELECT in_progress FROM summary),
      'not_started', (SELECT not_started FROM summary),
      'active_learners', (SELECT active_learners FROM summary)
    ),
    'trend', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'bucket', bucket,
        'completions', completions,
        'learners', learners
      ) ORDER BY bucket)
      FROM completion_trend
    ), '[]'::jsonb),
    'course_health', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'course_id', course_id,
        'course_title', course_title,
        'learners', learners,
        'average_progress', average_progress,
        'completed', completed,
        'in_progress', in_progress,
        'not_started', not_started
      ) ORDER BY average_progress DESC, course_title)
      FROM course_health
    ), '[]'::jsonb),
    'module_health', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'course_id', course_id,
        'course_title', course_title,
        'module_id', module_id,
        'module_title', module_title,
        'display_order', display_order,
        'learner_journeys', learner_journeys,
        'learners_started', learners_started,
        'average_progress', average_progress
      ) ORDER BY average_progress ASC, course_title, display_order)
      FROM module_health
    ), '[]'::jsonb),
    'courses', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', course.id, 'title', course.title) ORDER BY course.title)
      FROM public.courses AS course
      WHERE course.deleted_at IS NULL
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_learning_progress_detail(
  p_enrollment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING errcode = '42501';
  END IF;

  WITH journey AS (
    SELECT
      enrollment.id AS enrollment_id,
      enrollment.user_id,
      enrollment.course_id,
      enrollment.created_at AS enrolled_at,
      profile.email,
      profile.first_name,
      profile.last_name,
      profile.avatar_url,
      course.title AS course_title,
      course.slug AS course_slug
    FROM public.user_enrollments AS enrollment
    JOIN public.users AS profile ON profile.id = enrollment.user_id
    JOIN public.courses AS course ON course.id = enrollment.course_id
    WHERE enrollment.id = p_enrollment_id
      AND enrollment.payment_status = 'completed'
  ),
  curriculum AS (
    SELECT
      module.id AS module_id,
      module.title AS module_title,
      module.description AS module_description,
      module.display_order AS module_order,
      lesson.id AS lesson_id,
      lesson.title AS lesson_title,
      lesson.type::text AS lesson_type,
      lesson.display_order AS lesson_order,
      progress.is_completed,
      progress.started_at,
      progress.completed_at,
      progress.last_accessed_at,
      CASE
        WHEN progress.is_completed THEN 'completed'
        WHEN progress.id IS NOT NULL THEN 'started'
        ELSE 'not_started'
      END AS lesson_status
    FROM journey
    JOIN public.course_modules AS module ON module.course_id = journey.course_id
    LEFT JOIN public.lessons AS lesson ON lesson.module_id = module.id
    LEFT JOIN public.lesson_progress AS progress
      ON progress.enrollment_id = journey.enrollment_id
      AND progress.lesson_id = lesson.id
  ),
  module_rows AS (
    SELECT
      module_id,
      module_title,
      module_description,
      module_order,
      count(lesson_id)::integer AS total_lessons,
      count(lesson_id) FILTER (WHERE lesson_status IN ('started', 'completed'))::integer AS started_lessons,
      count(lesson_id) FILTER (WHERE lesson_status = 'completed')::integer AS completed_lessons,
      CASE WHEN count(lesson_id) = 0 THEN 0 ELSE least(100, round(
        count(lesson_id) FILTER (WHERE lesson_status = 'completed')::numeric * 100 / count(lesson_id)
      )::integer) END AS progress_percent,
      coalesce(jsonb_agg(jsonb_build_object(
        'id', lesson_id,
        'title', lesson_title,
        'type', lesson_type,
        'display_order', lesson_order,
        'status', lesson_status,
        'started_at', started_at,
        'completed_at', completed_at,
        'last_accessed_at', last_accessed_at
      ) ORDER BY lesson_order) FILTER (WHERE lesson_id IS NOT NULL), '[]'::jsonb) AS lessons
    FROM curriculum
    GROUP BY module_id, module_title, module_description, module_order
  ),
  totals AS (
    SELECT
      coalesce(sum(total_lessons), 0)::integer AS total_lessons,
      coalesce(sum(started_lessons), 0)::integer AS started_lessons,
      coalesce(sum(completed_lessons), 0)::integer AS completed_lessons,
      CASE WHEN coalesce(sum(total_lessons), 0) = 0 THEN 0 ELSE least(100, round(
        sum(completed_lessons)::numeric * 100 / sum(total_lessons)
      )::integer) END AS progress_percent
    FROM module_rows
  ),
  recent_activity AS (
    SELECT lesson_id, lesson_title, lesson_type, lesson_status, last_accessed_at, completed_at
    FROM curriculum
    WHERE last_accessed_at IS NOT NULL
    ORDER BY last_accessed_at DESC
    LIMIT 8
  )
  SELECT jsonb_build_object(
    'journey', (SELECT to_jsonb(journey) FROM journey),
    'overall', (SELECT to_jsonb(totals) FROM totals),
    'modules', coalesce((
      SELECT jsonb_agg(to_jsonb(module_rows) ORDER BY module_order)
      FROM module_rows
    ), '[]'::jsonb),
    'recent_activity', coalesce((
      SELECT jsonb_agg(to_jsonb(recent_activity) ORDER BY last_accessed_at DESC)
      FROM recent_activity
    ), '[]'::jsonb)
  )
  INTO v_result;

  IF v_result->'journey' IS NULL OR v_result->'journey' = 'null'::jsonb THEN
    RETURN NULL;
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_learning_progress_dashboard(text, uuid, text, text, text, text, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_learning_progress_dashboard(text, uuid, text, text, text, text, integer, integer)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_learning_progress_detail(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_learning_progress_detail(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_learning_progress_dashboard(text, uuid, text, text, text, text, integer, integer) IS
  'Admin-only learner-course progress reporting with true curriculum denominators, module health, completion trends, filters, and pagination.';

COMMENT ON FUNCTION public.admin_learning_progress_detail(uuid) IS
  'Admin-only learner-course detail with module and lesson states; excludes assessment outcomes and playback telemetry.';
