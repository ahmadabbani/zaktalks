-- Produce evidence-based module attention signals for the course portfolio.
-- Unreached future modules are excluded, and small samples are reported as
-- early data instead of being labelled as a problem.

CREATE OR REPLACE FUNCTION public.admin_course_module_attention_signals(
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
    RAISE EXCEPTION 'Invalid module attention range' USING errcode = '22023';
  END IF;

  v_range_start := now() - (coalesce(p_range, '30')::integer * interval '1 day');

  WITH active_enrollments AS (
    SELECT id, course_id
    FROM public.user_enrollments
    WHERE payment_status = 'completed'
  ),
  course_enrollment_counts AS (
    SELECT course_id, count(*)::integer AS enrolled_learners
    FROM active_enrollments
    GROUP BY course_id
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
  module_learner AS (
    SELECT
      enrollment.id AS enrollment_id,
      curriculum.course_id,
      curriculum.module_id,
      curriculum.total_lessons,
      count(progress.id)::integer AS started_lessons,
      count(progress.id) FILTER (WHERE progress.is_completed)::integer AS completed_lessons,
      max(progress.last_accessed_at) AS last_activity_at
    FROM module_curriculum AS curriculum
    JOIN active_enrollments AS enrollment ON enrollment.course_id = curriculum.course_id
    LEFT JOIN public.lessons AS lesson ON lesson.module_id = curriculum.module_id
    LEFT JOIN public.lesson_progress AS progress
      ON progress.enrollment_id = enrollment.id
      AND progress.lesson_id = lesson.id
    GROUP BY enrollment.id, curriculum.course_id, curriculum.module_id, curriculum.total_lessons
  ),
  module_stats AS (
    SELECT
      curriculum.course_id,
      curriculum.module_id,
      curriculum.module_title,
      curriculum.display_order,
      curriculum.total_lessons,
      count(learner.enrollment_id)::integer AS enrolled_learners,
      count(learner.enrollment_id) FILTER (
        WHERE coalesce(learner.started_lessons, 0) > 0
      )::integer AS reached_learners,
      count(learner.enrollment_id) FILTER (
        WHERE curriculum.total_lessons > 0
          AND coalesce(learner.completed_lessons, 0) >= curriculum.total_lessons
      )::integer AS completed_learners,
      count(learner.enrollment_id) FILTER (
        WHERE coalesce(learner.started_lessons, 0) > 0
          AND (
            curriculum.total_lessons = 0
            OR coalesce(learner.completed_lessons, 0) < curriculum.total_lessons
          )
          AND learner.last_activity_at < v_range_start
      )::integer AS stalled_learners,
      coalesce(round(avg(
        CASE
          WHEN coalesce(learner.started_lessons, 0) > 0 AND curriculum.total_lessons > 0
            THEN coalesce(learner.completed_lessons, 0)::numeric * 100 / curriculum.total_lessons
          ELSE NULL
        END
      )), 0)::integer AS reached_average_progress
    FROM module_curriculum AS curriculum
    LEFT JOIN module_learner AS learner ON learner.module_id = curriculum.module_id
    GROUP BY curriculum.course_id, curriculum.module_id, curriculum.module_title,
      curriculum.display_order, curriculum.total_lessons
  ),
  reached_candidates AS (
    SELECT
      stats.*,
      row_number() OVER (
        PARTITION BY stats.course_id
        ORDER BY
          CASE
            WHEN stats.reached_learners >= 3
              AND stats.stalled_learners >= 2
              AND stats.stalled_learners::numeric / stats.reached_learners >= 0.4
              THEN 0
            ELSE 1
          END,
          CASE WHEN stats.reached_learners = 0 THEN 0
            ELSE stats.stalled_learners::numeric / stats.reached_learners END DESC,
          stats.reached_average_progress ASC,
          stats.display_order ASC
      ) AS attention_rank
    FROM module_stats AS stats
    WHERE stats.reached_learners > 0
  ),
  selected_candidates AS (
    SELECT *
    FROM reached_candidates
    WHERE attention_rank = 1
  ),
  course_signals AS (
    SELECT
      course.id AS course_id,
      candidate.module_id,
      candidate.module_title,
      candidate.display_order,
      coalesce(enrollments.enrolled_learners, 0)::integer AS enrolled_learners,
      coalesce(candidate.reached_learners, 0)::integer AS reached_learners,
      coalesce(candidate.completed_learners, 0)::integer AS completed_learners,
      coalesce(candidate.stalled_learners, 0)::integer AS stalled_learners,
      coalesce(candidate.reached_average_progress, 0)::integer AS reached_average_progress,
      CASE
        WHEN coalesce(enrollments.enrolled_learners, 0) = 0 THEN 'no_learners'
        WHEN candidate.module_id IS NULL THEN 'no_activity'
        WHEN enrollments.enrolled_learners < 3 OR candidate.reached_learners < 3 THEN 'early_data'
        WHEN candidate.stalled_learners >= 2
          AND candidate.stalled_learners::numeric / candidate.reached_learners >= 0.4
          THEN 'needs_attention'
        ELSE 'normal'
      END AS attention_status
    FROM public.courses AS course
    LEFT JOIN course_enrollment_counts AS enrollments ON enrollments.course_id = course.id
    LEFT JOIN selected_candidates AS candidate ON candidate.course_id = course.id
    WHERE course.deleted_at IS NULL
  )
  SELECT coalesce(jsonb_agg(to_jsonb(signal) ORDER BY signal.course_id), '[]'::jsonb)
  INTO v_result
  FROM course_signals AS signal;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_course_module_attention_signals(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_course_module_attention_signals(text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_course_module_attention_signals(text) IS
  'Admin-only module signals based on reached learners, stalled incomplete journeys, recency, and minimum sample size.';
