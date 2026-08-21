-- Course-focused learning analytics for the admin workspace.
-- Playback telemetry, assessment outcomes, certificates, and payment values
-- intentionally remain in their dedicated reporting areas.

CREATE INDEX IF NOT EXISTS lesson_progress_course_activity_idx
  ON public.lesson_progress (last_accessed_at DESC, enrollment_id);

CREATE INDEX IF NOT EXISTS lesson_progress_course_completed_idx
  ON public.lesson_progress (completed_at DESC, enrollment_id)
  WHERE is_completed = true;

CREATE OR REPLACE FUNCTION public.admin_course_performance_dashboard(
  p_search text DEFAULT NULL,
  p_publication text DEFAULT 'all',
  p_health text DEFAULT 'all',
  p_range text DEFAULT '30',
  p_sort text DEFAULT 'learners'
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

  IF coalesce(p_publication, 'all') NOT IN ('all', 'published', 'draft')
    OR coalesce(p_health, 'all') NOT IN ('all', 'healthy', 'developing', 'needs_attention', 'no_learners')
    OR coalesce(p_range, '30') NOT IN ('7', '30', '90', '365')
    OR coalesce(p_sort, 'learners') NOT IN ('learners', 'progress', 'activity', 'completion', 'newest', 'name') THEN
    RAISE EXCEPTION 'Invalid course performance filter' USING errcode = '22023';
  END IF;

  v_range_start := now() - (coalesce(p_range, '30')::integer * interval '1 day');

  WITH active_enrollments AS (
    SELECT id, user_id, course_id, created_at
    FROM public.user_enrollments
    WHERE payment_status = 'completed'
  ),
  lesson_counts AS (
    SELECT course_id, count(*)::integer AS total_lessons
    FROM public.lessons
    GROUP BY course_id
  ),
  module_counts AS (
    SELECT course_id, count(*)::integer AS total_modules
    FROM public.course_modules
    GROUP BY course_id
  ),
  progress_stats AS (
    SELECT
      enrollment_id,
      count(*)::integer AS started_lessons,
      count(*) FILTER (WHERE is_completed)::integer AS completed_lessons,
      min(started_at) AS first_started_at,
      max(last_accessed_at) AS last_activity_at,
      max(completed_at) FILTER (WHERE is_completed) AS last_completion_at
    FROM public.lesson_progress
    GROUP BY enrollment_id
  ),
  journeys AS (
    SELECT
      enrollment.id AS enrollment_id,
      enrollment.user_id,
      enrollment.course_id,
      enrollment.created_at AS enrolled_at,
      coalesce(lesson_counts.total_lessons, 0) AS total_lessons,
      coalesce(progress_stats.started_lessons, 0) AS started_lessons,
      coalesce(progress_stats.completed_lessons, 0) AS completed_lessons,
      progress_stats.first_started_at,
      progress_stats.last_activity_at,
      progress_stats.last_completion_at,
      CASE
        WHEN coalesce(lesson_counts.total_lessons, 0) > 0
          AND coalesce(progress_stats.completed_lessons, 0) >= lesson_counts.total_lessons THEN 'completed'
        WHEN coalesce(progress_stats.started_lessons, 0) > 0 THEN 'in_progress'
        ELSE 'not_started'
      END AS journey_status,
      CASE WHEN coalesce(lesson_counts.total_lessons, 0) = 0 THEN 0 ELSE least(100, round(
        coalesce(progress_stats.completed_lessons, 0)::numeric * 100 / lesson_counts.total_lessons
      )::integer) END AS progress_percent
    FROM active_enrollments AS enrollment
    LEFT JOIN lesson_counts ON lesson_counts.course_id = enrollment.course_id
    LEFT JOIN progress_stats ON progress_stats.enrollment_id = enrollment.id
  ),
  module_curriculum AS (
    SELECT
      module.id AS module_id,
      module.course_id,
      module.title AS module_title,
      module.display_order,
      count(lesson.id)::integer AS total_lessons
    FROM public.course_modules AS module
    LEFT JOIN public.lessons AS lesson ON lesson.module_id = module.id
    GROUP BY module.id, module.course_id, module.title, module.display_order
  ),
  module_progress AS (
    SELECT
      enrollment.id AS enrollment_id,
      enrollment.course_id,
      lesson.module_id,
      count(progress.id) FILTER (WHERE progress.is_completed)::integer AS completed_lessons
    FROM active_enrollments AS enrollment
    JOIN public.lessons AS lesson ON lesson.course_id = enrollment.course_id
    LEFT JOIN public.lesson_progress AS progress
      ON progress.enrollment_id = enrollment.id
      AND progress.lesson_id = lesson.id
    GROUP BY enrollment.id, enrollment.course_id, lesson.module_id
  ),
  module_averages AS (
    SELECT
      curriculum.course_id,
      curriculum.module_id,
      curriculum.module_title,
      curriculum.display_order,
      CASE WHEN count(enrollment.id) = 0 OR curriculum.total_lessons = 0 THEN 0 ELSE round(avg(
        coalesce(module_progress.completed_lessons, 0)::numeric * 100 / curriculum.total_lessons
      ))::integer END AS average_progress
    FROM module_curriculum AS curriculum
    LEFT JOIN active_enrollments AS enrollment ON enrollment.course_id = curriculum.course_id
    LEFT JOIN module_progress
      ON module_progress.enrollment_id = enrollment.id
      AND module_progress.module_id = curriculum.module_id
    GROUP BY curriculum.course_id, curriculum.module_id, curriculum.module_title,
      curriculum.display_order, curriculum.total_lessons
  ),
  bottlenecks AS (
    SELECT DISTINCT ON (course_id)
      course_id,
      module_id,
      module_title,
      display_order,
      average_progress
    FROM module_averages
    ORDER BY course_id, average_progress ASC, display_order ASC
  ),
  course_rows AS (
    SELECT
      course.id AS course_id,
      course.title,
      course.slug,
      course.is_published,
      course.tutor_name,
      course.created_at,
      course.updated_at,
      coalesce(module_counts.total_modules, 0) AS total_modules,
      coalesce(lesson_counts.total_lessons, 0) AS total_lessons,
      count(journey.enrollment_id)::integer AS enrolled_learners,
      count(journey.enrollment_id) FILTER (WHERE journey.journey_status = 'not_started')::integer AS not_started,
      count(journey.enrollment_id) FILTER (WHERE journey.journey_status = 'in_progress')::integer AS in_progress,
      count(journey.enrollment_id) FILTER (WHERE journey.journey_status = 'completed')::integer AS completed,
      count(journey.enrollment_id) FILTER (WHERE journey.last_activity_at >= v_range_start)::integer AS active_learners,
      count(journey.enrollment_id) FILTER (
        WHERE journey.journey_status = 'in_progress'
          AND journey.last_activity_at IS NOT NULL
          AND journey.last_activity_at < v_range_start
      )::integer AS at_risk,
      coalesce(round(avg(journey.progress_percent)), 0)::integer AS average_progress,
      CASE WHEN count(journey.enrollment_id) = 0 THEN 0 ELSE round(
        count(journey.enrollment_id) FILTER (WHERE journey.journey_status = 'completed')::numeric
        * 100 / count(journey.enrollment_id)
      )::integer END AS completion_rate,
      max(journey.last_activity_at) AS last_activity_at,
      bottlenecks.module_id AS attention_module_id,
      bottlenecks.module_title AS attention_module_title,
      coalesce(bottlenecks.average_progress, 0) AS attention_module_progress,
      CASE
        WHEN count(journey.enrollment_id) = 0 THEN 'no_learners'
        WHEN coalesce(round(avg(journey.progress_percent)), 0) >= 70 THEN 'healthy'
        WHEN coalesce(round(avg(journey.progress_percent)), 0) >= 30 THEN 'developing'
        ELSE 'needs_attention'
      END AS health_status
    FROM public.courses AS course
    LEFT JOIN journeys AS journey ON journey.course_id = course.id
    LEFT JOIN lesson_counts ON lesson_counts.course_id = course.id
    LEFT JOIN module_counts ON module_counts.course_id = course.id
    LEFT JOIN bottlenecks ON bottlenecks.course_id = course.id
    WHERE course.deleted_at IS NULL
    GROUP BY course.id, course.title, course.slug, course.is_published, course.tutor_name,
      course.created_at, course.updated_at, module_counts.total_modules, lesson_counts.total_lessons,
      bottlenecks.module_id, bottlenecks.module_title, bottlenecks.average_progress
  ),
  filtered_courses AS (
    SELECT *
    FROM course_rows
    WHERE (
        nullif(trim(coalesce(p_search, '')), '') IS NULL
        OR title ILIKE '%' || trim(p_search) || '%'
        OR slug ILIKE '%' || trim(p_search) || '%'
        OR tutor_name ILIKE '%' || trim(p_search) || '%'
      )
      AND (
        p_publication = 'all'
        OR (p_publication = 'published' AND is_published)
        OR (p_publication = 'draft' AND NOT is_published)
      )
      AND (p_health = 'all' OR health_status = p_health)
  ),
  ordered_courses AS (
    SELECT *
    FROM filtered_courses
    ORDER BY
      CASE WHEN p_sort = 'learners' THEN enrolled_learners END DESC,
      CASE WHEN p_sort = 'progress' THEN average_progress END DESC,
      CASE WHEN p_sort = 'activity' THEN coalesce(last_activity_at, '-infinity'::timestamp with time zone) END DESC,
      CASE WHEN p_sort = 'completion' THEN completion_rate END DESC,
      CASE WHEN p_sort = 'newest' THEN created_at END DESC,
      CASE WHEN p_sort = 'name' THEN lower(title) END ASC,
      lower(title) ASC
  ),
  summary AS (
    SELECT
      count(*)::integer AS courses,
      count(*) FILTER (WHERE is_published)::integer AS published,
      coalesce(sum(enrolled_learners), 0)::integer AS enrollments,
      coalesce(sum(active_learners), 0)::integer AS active_learners,
      coalesce(sum(completed), 0)::integer AS completed,
      coalesce(sum(at_risk), 0)::integer AS at_risk,
      CASE WHEN coalesce(sum(enrolled_learners), 0) = 0 THEN 0 ELSE round(
        sum(average_progress * enrolled_learners)::numeric / sum(enrolled_learners)
      )::integer END AS average_progress
    FROM filtered_courses
  ),
  enrollment_trend AS (
    SELECT
      date_trunc(CASE WHEN p_range IN ('7', '30') THEN 'day' WHEN p_range = '90' THEN 'week' ELSE 'month' END, enrollment.created_at) AS bucket,
      count(*)::integer AS enrollments
    FROM active_enrollments AS enrollment
    JOIN filtered_courses ON filtered_courses.course_id = enrollment.course_id
    WHERE enrollment.created_at >= v_range_start
    GROUP BY 1
    ORDER BY 1
  ),
  activity_trend AS (
    SELECT
      date_trunc(CASE WHEN p_range IN ('7', '30') THEN 'day' WHEN p_range = '90' THEN 'week' ELSE 'month' END, progress.last_accessed_at) AS bucket,
      count(*)::integer AS activity_signals,
      count(DISTINCT progress.user_id)::integer AS learners
    FROM public.lesson_progress AS progress
    JOIN active_enrollments AS enrollment ON enrollment.id = progress.enrollment_id
    JOIN filtered_courses ON filtered_courses.course_id = enrollment.course_id
    WHERE progress.last_accessed_at >= v_range_start
    GROUP BY 1
    ORDER BY 1
  )
  SELECT jsonb_build_object(
    'courses', coalesce((SELECT jsonb_agg(to_jsonb(course_row)) FROM ordered_courses AS course_row), '[]'::jsonb),
    'summary', (SELECT to_jsonb(summary) FROM summary),
    'enrollment_trend', coalesce((SELECT jsonb_agg(to_jsonb(trend) ORDER BY bucket) FROM enrollment_trend AS trend), '[]'::jsonb),
    'activity_trend', coalesce((SELECT jsonb_agg(to_jsonb(trend) ORDER BY bucket) FROM activity_trend AS trend), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_course_performance_detail(
  p_course_id uuid,
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'all',
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
  v_range_start timestamp with time zone;
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 25), 50));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING errcode = '42501';
  END IF;

  IF coalesce(p_status, 'all') NOT IN ('all', 'not_started', 'in_progress', 'completed', 'at_risk')
    OR coalesce(p_range, '30') NOT IN ('7', '30', '90', '365')
    OR coalesce(p_sort, 'activity') NOT IN ('activity', 'progress_high', 'progress_low', 'enrolled', 'name', 'completed') THEN
    RAISE EXCEPTION 'Invalid course performance detail filter' USING errcode = '22023';
  END IF;

  v_range_start := now() - (coalesce(p_range, '30')::integer * interval '1 day');

  WITH selected_course AS (
    SELECT id, title, slug, description, tutor_name, is_published, created_at, updated_at
    FROM public.courses
    WHERE id = p_course_id AND deleted_at IS NULL
  ),
  active_enrollments AS (
    SELECT enrollment.id, enrollment.user_id, enrollment.course_id, enrollment.created_at
    FROM public.user_enrollments AS enrollment
    JOIN selected_course ON selected_course.id = enrollment.course_id
    WHERE enrollment.payment_status = 'completed'
  ),
  lesson_count AS (
    SELECT count(*)::integer AS total_lessons
    FROM public.lessons
    WHERE course_id = p_course_id
  ),
  progress_stats AS (
    SELECT
      progress.enrollment_id,
      count(*)::integer AS started_lessons,
      count(*) FILTER (WHERE progress.is_completed)::integer AS completed_lessons,
      min(progress.started_at) AS first_started_at,
      max(progress.last_accessed_at) AS last_activity_at,
      max(progress.completed_at) FILTER (WHERE progress.is_completed) AS last_completion_at
    FROM public.lesson_progress AS progress
    JOIN active_enrollments ON active_enrollments.id = progress.enrollment_id
    GROUP BY progress.enrollment_id
  ),
  last_module AS (
    SELECT DISTINCT ON (progress.enrollment_id)
      progress.enrollment_id,
      module.id AS module_id,
      module.title AS module_title,
      module.display_order
    FROM public.lesson_progress AS progress
    JOIN active_enrollments ON active_enrollments.id = progress.enrollment_id
    JOIN public.lessons AS lesson ON lesson.id = progress.lesson_id
    JOIN public.course_modules AS module ON module.id = lesson.module_id
    ORDER BY progress.enrollment_id, progress.last_accessed_at DESC NULLS LAST, module.display_order DESC
  ),
  journeys AS (
    SELECT
      enrollment.id AS enrollment_id,
      enrollment.user_id,
      enrollment.created_at AS enrolled_at,
      profile.email,
      profile.first_name,
      profile.last_name,
      profile.email_verified,
      profile.avatar_url,
      coalesce(lesson_count.total_lessons, 0) AS total_lessons,
      coalesce(progress_stats.started_lessons, 0) AS started_lessons,
      coalesce(progress_stats.completed_lessons, 0) AS completed_lessons,
      progress_stats.first_started_at,
      progress_stats.last_activity_at,
      progress_stats.last_completion_at,
      last_module.module_id AS current_module_id,
      last_module.module_title AS current_module_title,
      CASE
        WHEN coalesce(lesson_count.total_lessons, 0) > 0
          AND coalesce(progress_stats.completed_lessons, 0) >= lesson_count.total_lessons THEN 'completed'
        WHEN coalesce(progress_stats.started_lessons, 0) > 0 THEN 'in_progress'
        ELSE 'not_started'
      END AS journey_status,
      CASE WHEN coalesce(lesson_count.total_lessons, 0) = 0 THEN 0 ELSE least(100, round(
        coalesce(progress_stats.completed_lessons, 0)::numeric * 100 / lesson_count.total_lessons
      )::integer) END AS progress_percent,
      coalesce(nullif(lower(trim(concat_ws(' ', profile.first_name, profile.last_name))), ''), lower(profile.email)) AS sort_name
    FROM active_enrollments AS enrollment
    JOIN public.users AS profile ON profile.id = enrollment.user_id
    CROSS JOIN lesson_count
    LEFT JOIN progress_stats ON progress_stats.enrollment_id = enrollment.id
    LEFT JOIN last_module ON last_module.enrollment_id = enrollment.id
  ),
  course_summary AS (
    SELECT
      count(*)::integer AS enrolled_learners,
      count(*) FILTER (WHERE journey_status = 'not_started')::integer AS not_started,
      count(*) FILTER (WHERE journey_status = 'in_progress')::integer AS in_progress,
      count(*) FILTER (WHERE journey_status = 'completed')::integer AS completed,
      count(*) FILTER (WHERE last_activity_at >= v_range_start)::integer AS active_learners,
      count(*) FILTER (
        WHERE journey_status = 'in_progress'
          AND last_activity_at IS NOT NULL
          AND last_activity_at < v_range_start
      )::integer AS at_risk,
      coalesce(round(avg(progress_percent)), 0)::integer AS average_progress,
      CASE WHEN count(*) = 0 THEN 0 ELSE round(
        count(*) FILTER (WHERE journey_status = 'completed')::numeric * 100 / count(*)
      )::integer END AS completion_rate,
      min(enrolled_at) AS first_enrollment_at,
      max(enrolled_at) AS latest_enrollment_at,
      max(last_activity_at) AS last_activity_at
    FROM journeys
  ),
  filtered_journeys AS (
    SELECT *
    FROM journeys
    WHERE (
        nullif(trim(coalesce(p_search, '')), '') IS NULL
        OR email ILIKE '%' || trim(p_search) || '%'
        OR concat_ws(' ', first_name, last_name) ILIKE '%' || trim(p_search) || '%'
      )
      AND (
        p_status = 'all'
        OR journey_status = p_status
        OR (p_status = 'at_risk' AND journey_status = 'in_progress' AND last_activity_at IS NOT NULL AND last_activity_at < v_range_start)
      )
  ),
  ordered_journeys AS (
    SELECT *
    FROM filtered_journeys
    ORDER BY
      CASE WHEN p_sort = 'activity' THEN coalesce(last_activity_at, '-infinity'::timestamp with time zone) END DESC,
      CASE WHEN p_sort = 'progress_high' THEN progress_percent END DESC,
      CASE WHEN p_sort = 'progress_low' THEN progress_percent END ASC,
      CASE WHEN p_sort = 'enrolled' THEN enrolled_at END DESC,
      CASE WHEN p_sort = 'name' THEN sort_name END ASC,
      CASE WHEN p_sort = 'completed' THEN last_completion_at END DESC NULLS LAST,
      enrollment_id
    OFFSET v_offset LIMIT v_page_size
  ),
  module_curriculum AS (
    SELECT
      module.id AS module_id,
      module.title AS module_title,
      module.description AS module_description,
      module.display_order,
      count(lesson.id)::integer AS total_lessons
    FROM public.course_modules AS module
    LEFT JOIN public.lessons AS lesson ON lesson.module_id = module.id
    WHERE module.course_id = p_course_id
    GROUP BY module.id, module.title, module.description, module.display_order
  ),
  module_learner AS (
    SELECT
      enrollment.id AS enrollment_id,
      curriculum.module_id,
      curriculum.total_lessons,
      count(progress.id)::integer AS started_lessons,
      count(progress.id) FILTER (WHERE progress.is_completed)::integer AS completed_lessons
    FROM active_enrollments AS enrollment
    CROSS JOIN module_curriculum AS curriculum
    LEFT JOIN public.lessons AS lesson ON lesson.module_id = curriculum.module_id
    LEFT JOIN public.lesson_progress AS progress
      ON progress.enrollment_id = enrollment.id
      AND progress.lesson_id = lesson.id
    GROUP BY enrollment.id, curriculum.module_id, curriculum.total_lessons
  ),
  module_health AS (
    SELECT
      curriculum.module_id,
      curriculum.module_title,
      curriculum.module_description,
      curriculum.display_order,
      curriculum.total_lessons,
      count(learner.enrollment_id)::integer AS enrolled_learners,
      count(learner.enrollment_id) FILTER (WHERE learner.started_lessons > 0)::integer AS learners_reached,
      count(learner.enrollment_id) FILTER (
        WHERE learner.total_lessons > 0 AND learner.completed_lessons >= learner.total_lessons
      )::integer AS learners_completed,
      CASE WHEN count(learner.enrollment_id) = 0 OR curriculum.total_lessons = 0 THEN 0 ELSE round(avg(
        coalesce(learner.completed_lessons, 0)::numeric * 100 / curriculum.total_lessons
      ))::integer END AS average_progress
    FROM module_curriculum AS curriculum
    LEFT JOIN module_learner AS learner ON learner.module_id = curriculum.module_id
    GROUP BY curriculum.module_id, curriculum.module_title, curriculum.module_description,
      curriculum.display_order, curriculum.total_lessons
  ),
  activity_calendar AS (
    SELECT
      progress.last_accessed_at::date AS activity_date,
      count(*)::integer AS signals,
      count(DISTINCT progress.user_id)::integer AS learners
    FROM public.lesson_progress AS progress
    JOIN active_enrollments ON active_enrollments.id = progress.enrollment_id
    WHERE progress.last_accessed_at >= current_date - interval '83 days'
    GROUP BY progress.last_accessed_at::date
    ORDER BY activity_date
  ),
  completion_trend AS (
    SELECT
      date_trunc(CASE WHEN p_range IN ('7', '30') THEN 'day' WHEN p_range = '90' THEN 'week' ELSE 'month' END, last_completion_at) AS bucket,
      count(*)::integer AS completions
    FROM journeys
    WHERE journey_status = 'completed' AND last_completion_at >= v_range_start
    GROUP BY 1
    ORDER BY 1
  )
  SELECT jsonb_build_object(
    'course', (SELECT to_jsonb(selected_course) FROM selected_course),
    'summary', (SELECT to_jsonb(course_summary) FROM course_summary),
    'curriculum', jsonb_build_object(
      'modules', (SELECT count(*) FROM module_curriculum),
      'lessons', (SELECT total_lessons FROM lesson_count)
    ),
    'modules', coalesce((SELECT jsonb_agg(to_jsonb(module_row) ORDER BY display_order) FROM module_health AS module_row), '[]'::jsonb),
    'activity_calendar', coalesce((SELECT jsonb_agg(to_jsonb(activity_row) ORDER BY activity_date) FROM activity_calendar AS activity_row), '[]'::jsonb),
    'completion_trend', coalesce((SELECT jsonb_agg(to_jsonb(trend_row) ORDER BY bucket) FROM completion_trend AS trend_row), '[]'::jsonb),
    'learners', coalesce((SELECT jsonb_agg(to_jsonb(learner_row)) FROM ordered_journeys AS learner_row), '[]'::jsonb),
    'learner_total', (SELECT count(*) FROM filtered_journeys)
  ) INTO v_result;

  IF v_result->'course' IS NULL OR v_result->'course' = 'null'::jsonb THEN
    RETURN NULL;
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_course_performance_dashboard(text, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_course_performance_dashboard(text, text, text, text, text)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_course_performance_detail(uuid, text, text, text, text, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_course_performance_detail(uuid, text, text, text, text, integer, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_course_performance_dashboard(text, text, text, text, text) IS
  'Admin-only portfolio view with one row per course, current learner health, curriculum size, bottlenecks, and dated trends.';

COMMENT ON FUNCTION public.admin_course_performance_detail(uuid, text, text, text, text, integer, integer) IS
  'Admin-only course learning analysis with module health, recorded activity signals, completion trends, and paginated learner journeys.';
