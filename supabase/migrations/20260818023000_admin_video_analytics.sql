-- Accurate, admin-only video analytics built from verified lesson progress.
-- The application stores furthest verified playback coverage, not raw playback
-- events, so this report deliberately avoids claiming session counts, replay
-- counts, or second-by-second retention.

CREATE INDEX IF NOT EXISTS lessons_video_curriculum_idx
  ON public.lessons (course_id, module_id, display_order, id)
  WHERE type = 'video';

CREATE INDEX IF NOT EXISTS lesson_progress_lesson_access_idx
  ON public.lesson_progress (lesson_id, last_accessed_at DESC);

CREATE INDEX IF NOT EXISTS lesson_progress_lesson_completion_idx
  ON public.lesson_progress (lesson_id, completed_at DESC)
  WHERE is_completed;

CREATE OR REPLACE FUNCTION public.admin_video_analytics_dashboard(
  p_search text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
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
  v_bucket text;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING errcode = '42501';
  END IF;

  IF coalesce(p_activity, 'all') NOT IN ('all', 'active', 'completed', 'no_activity')
    OR coalesce(p_range, '30') NOT IN ('7', '30', '90', '365', 'all')
    OR coalesce(p_sort, 'activity') NOT IN ('activity', 'viewers', 'reach', 'completion', 'curriculum', 'duration') THEN
    RAISE EXCEPTION 'Invalid video analytics filter' USING errcode = '22023';
  END IF;

  v_range_start := CASE coalesce(p_range, '30')
    WHEN '7' THEN now() - interval '7 days'
    WHEN '30' THEN now() - interval '30 days'
    WHEN '90' THEN now() - interval '90 days'
    WHEN '365' THEN now() - interval '365 days'
    ELSE NULL
  END;

  v_bucket := CASE coalesce(p_range, '30')
    WHEN '7' THEN 'day'
    WHEN '30' THEN 'day'
    WHEN '90' THEN 'week'
    ELSE 'month'
  END;

  WITH video_lessons AS (
    SELECT
      lesson.id AS lesson_id,
      lesson.course_id,
      lesson.module_id,
      lesson.title AS lesson_title,
      lesson.description AS lesson_description,
      lesson.duration_seconds,
      lesson.display_order AS lesson_order,
      module.title AS module_title,
      module.display_order AS module_order,
      course.title AS course_title,
      course.slug AS course_slug,
      course.is_published AS course_published
    FROM public.lessons AS lesson
    JOIN public.course_modules AS module ON module.id = lesson.module_id
    JOIN public.courses AS course ON course.id = lesson.course_id
    WHERE lesson.type = 'video'
      AND (p_course_id IS NULL OR lesson.course_id = p_course_id)
      AND (
        nullif(trim(coalesce(p_search, '')), '') IS NULL
        OR lesson.title ILIKE '%' || trim(p_search) || '%'
        OR module.title ILIKE '%' || trim(p_search) || '%'
        OR course.title ILIKE '%' || trim(p_search) || '%'
      )
  ),
  scoped_progress AS (
    SELECT
      progress.*,
      lesson.course_id,
      lesson.duration_seconds,
      CASE
        WHEN progress.is_completed THEN 100::numeric
        WHEN lesson.duration_seconds > 0 THEN least(
          100::numeric,
          greatest(progress.max_position_reached_seconds, progress.watch_time_seconds)::numeric * 100 / lesson.duration_seconds
        )
        ELSE NULL
      END AS reach_percent,
      (
        progress.playback_status = 'playing'
        AND progress.last_heartbeat_at >= now() - interval '45 seconds'
      ) AS active_now
    FROM public.lesson_progress AS progress
    JOIN video_lessons AS lesson ON lesson.lesson_id = progress.lesson_id
    WHERE v_range_start IS NULL OR progress.last_accessed_at >= v_range_start
  ),
  lesson_stats AS (
    SELECT
      lesson.*,
      count(progress.id)::integer AS viewer_count,
      count(progress.id) FILTER (WHERE progress.is_completed)::integer AS completed_viewers,
      count(progress.id) FILTER (
        WHERE NOT progress.is_completed
          AND greatest(progress.max_position_reached_seconds, progress.watch_time_seconds) > 0
      )::integer AS resume_ready,
      count(progress.id) FILTER (WHERE progress.active_now)::integer AS active_now,
      count(progress.id) FILTER (
        WHERE NOT progress.is_completed AND progress.playback_status = 'paused'
      )::integer AS paused_viewers,
      count(progress.id) FILTER (WHERE progress.reach_percent IS NOT NULL)::integer AS measurable_viewers,
      count(progress.id) FILTER (WHERE progress.reach_percent IS NULL)::integer AS unknown_reach_viewers,
      coalesce(round(avg(progress.reach_percent) FILTER (WHERE progress.reach_percent IS NOT NULL)), 0)::integer AS average_reach,
      coalesce(sum(greatest(progress.watch_time_seconds, progress.max_position_reached_seconds)), 0)::bigint AS verified_coverage_seconds,
      min(progress.started_at) AS first_started_at,
      max(progress.last_accessed_at) AS last_activity_at
    FROM video_lessons AS lesson
    LEFT JOIN scoped_progress AS progress ON progress.lesson_id = lesson.lesson_id
    GROUP BY
      lesson.lesson_id, lesson.course_id, lesson.module_id, lesson.lesson_title,
      lesson.lesson_description, lesson.duration_seconds, lesson.lesson_order,
      lesson.module_title, lesson.module_order, lesson.course_title,
      lesson.course_slug, lesson.course_published
  ),
  classified AS (
    SELECT
      stats.*,
      CASE
        WHEN stats.viewer_count = 0 THEN 'no_activity'
        WHEN stats.completed_viewers = stats.viewer_count THEN 'completed'
        ELSE 'active'
      END AS activity_state,
      CASE WHEN stats.viewer_count > 0 THEN round(stats.completed_viewers::numeric * 100 / stats.viewer_count)::integer ELSE 0 END AS completion_rate
    FROM lesson_stats AS stats
  ),
  filtered AS (
    SELECT *
    FROM classified
    WHERE coalesce(p_activity, 'all') = 'all'
      OR activity_state = p_activity
  ),
  ordered AS (
    SELECT
      filtered.*,
      row_number() OVER (
        ORDER BY
          CASE WHEN p_sort = 'activity' THEN last_activity_at END DESC NULLS LAST,
          CASE WHEN p_sort = 'viewers' THEN viewer_count END DESC,
          CASE WHEN p_sort = 'reach' THEN average_reach END DESC,
          CASE WHEN p_sort = 'completion' THEN completion_rate END DESC,
          CASE WHEN p_sort = 'duration' THEN duration_seconds END DESC NULLS LAST,
          course_title,
          module_order,
          lesson_order,
          lesson_id
      ) AS row_number
    FROM filtered
  ),
  paged AS (
    SELECT *
    FROM ordered
    WHERE row_number > v_offset AND row_number <= v_offset + v_page_size
  ),
  filtered_progress AS (
    SELECT progress.*
    FROM scoped_progress AS progress
    JOIN filtered ON filtered.lesson_id = progress.lesson_id
  ),
  summary AS (
    SELECT
      (SELECT count(*)::integer FROM filtered) AS video_lessons,
      count(progress.id)::integer AS viewing_records,
      count(DISTINCT progress.user_id)::integer AS unique_viewers,
      count(progress.id) FILTER (WHERE progress.is_completed)::integer AS completed_views,
      count(progress.id) FILTER (
        WHERE NOT progress.is_completed
          AND greatest(progress.max_position_reached_seconds, progress.watch_time_seconds) > 0
      )::integer AS resume_ready,
      count(progress.id) FILTER (WHERE progress.active_now)::integer AS active_now,
      count(progress.id) FILTER (WHERE progress.reach_percent IS NOT NULL)::integer AS measurable_views,
      count(progress.id) FILTER (WHERE progress.reach_percent IS NULL)::integer AS unknown_reach_views,
      coalesce(round(avg(progress.reach_percent) FILTER (WHERE progress.reach_percent IS NOT NULL)), 0)::integer AS average_reach,
      coalesce(sum(greatest(progress.watch_time_seconds, progress.max_position_reached_seconds)), 0)::bigint AS verified_coverage_seconds,
      CASE WHEN count(progress.id) > 0
        THEN round(count(progress.id) FILTER (WHERE progress.is_completed)::numeric * 100 / count(progress.id))::integer
        ELSE 0
      END AS completion_rate,
      (SELECT count(*) FILTER (WHERE duration_seconds IS NULL)::integer FROM filtered) AS lessons_missing_duration
    FROM filtered_progress AS progress
  ),
  course_comparison AS (
    SELECT
      filtered.course_id,
      filtered.course_title,
      count(DISTINCT filtered.lesson_id)::integer AS video_lessons,
      count(progress.id)::integer AS viewing_records,
      count(DISTINCT progress.user_id)::integer AS unique_viewers,
      count(progress.id) FILTER (WHERE progress.is_completed)::integer AS completed_views,
      CASE WHEN count(progress.id) > 0
        THEN round(count(progress.id) FILTER (WHERE progress.is_completed)::numeric * 100 / count(progress.id))::integer
        ELSE 0
      END AS completion_rate,
      coalesce(round(avg(progress.reach_percent) FILTER (WHERE progress.reach_percent IS NOT NULL)), 0)::integer AS average_reach
    FROM filtered
    LEFT JOIN filtered_progress AS progress ON progress.lesson_id = filtered.lesson_id
    GROUP BY filtered.course_id, filtered.course_title
  ),
  reach_distribution AS (
    SELECT
      count(*) FILTER (WHERE reach_percent >= 0 AND reach_percent < 25)::integer AS reach_0_24,
      count(*) FILTER (WHERE reach_percent >= 25 AND reach_percent < 50)::integer AS reach_25_49,
      count(*) FILTER (WHERE reach_percent >= 50 AND reach_percent < 75)::integer AS reach_50_74,
      count(*) FILTER (WHERE reach_percent >= 75 AND reach_percent < 97)::integer AS reach_75_96,
      count(*) FILTER (WHERE reach_percent >= 97)::integer AS completed,
      count(*) FILTER (WHERE reach_percent IS NULL)::integer AS unknown
    FROM filtered_progress
  ),
  playback_snapshot AS (
    SELECT
      count(*) FILTER (WHERE active_now)::integer AS active_now,
      count(*) FILTER (WHERE NOT is_completed AND playback_status = 'paused')::integer AS paused,
      count(*) FILTER (WHERE NOT is_completed AND playback_status = 'ended')::integer AS ended_incomplete,
      count(*) FILTER (
        WHERE NOT is_completed
          AND playback_status IN ('inactive', 'playing')
          AND NOT active_now
      )::integer AS inactive,
      count(*) FILTER (WHERE is_completed)::integer AS completed
    FROM filtered_progress
  ),
  event_rows AS (
    SELECT progress.started_at AS occurred_at, 'start'::text AS event_type
    FROM public.lesson_progress AS progress
    JOIN filtered ON filtered.lesson_id = progress.lesson_id
    WHERE progress.started_at IS NOT NULL
      AND (v_range_start IS NULL OR progress.started_at >= v_range_start)
    UNION ALL
    SELECT progress.completed_at AS occurred_at, 'completion'::text AS event_type
    FROM public.lesson_progress AS progress
    JOIN filtered ON filtered.lesson_id = progress.lesson_id
    WHERE progress.is_completed
      AND progress.completed_at IS NOT NULL
      AND (v_range_start IS NULL OR progress.completed_at >= v_range_start)
  ),
  trend AS (
    SELECT
      date_trunc(v_bucket, occurred_at) AS bucket,
      count(*) FILTER (WHERE event_type = 'start')::integer AS starts,
      count(*) FILTER (WHERE event_type = 'completion')::integer AS completions
    FROM event_rows
    GROUP BY date_trunc(v_bucket, occurred_at)
  ),
  course_options AS (
    SELECT DISTINCT course.id AS course_id, course.title AS course_title
    FROM public.lessons AS lesson
    JOIN public.courses AS course ON course.id = lesson.course_id
    WHERE lesson.type = 'video'
  )
  SELECT jsonb_build_object(
    'summary', coalesce((SELECT to_jsonb(summary) FROM summary), '{}'::jsonb),
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(paged) - 'row_number' ORDER BY row_number) FROM paged), '[]'::jsonb),
    'total_count', (SELECT count(*) FROM filtered),
    'course_comparison', coalesce((SELECT jsonb_agg(to_jsonb(course_comparison) ORDER BY unique_viewers DESC, course_title) FROM course_comparison), '[]'::jsonb),
    'reach_distribution', coalesce((SELECT to_jsonb(reach_distribution) FROM reach_distribution), '{}'::jsonb),
    'playback_snapshot', coalesce((SELECT to_jsonb(playback_snapshot) FROM playback_snapshot), '{}'::jsonb),
    'trend', coalesce((SELECT jsonb_agg(to_jsonb(trend) ORDER BY bucket) FROM trend), '[]'::jsonb),
    'courses', coalesce((SELECT jsonb_agg(to_jsonb(course_options) ORDER BY course_title) FROM course_options), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_video_analytics_detail(
  p_lesson_id uuid,
  p_range text DEFAULT '30',
  p_status text DEFAULT 'all',
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

  IF coalesce(p_range, '30') NOT IN ('7', '30', '90', '365', 'all')
    OR coalesce(p_status, 'all') NOT IN ('all', 'active_now', 'resume_ready', 'paused', 'completed')
    OR coalesce(p_sort, 'activity') NOT IN ('activity', 'reach', 'name', 'completed') THEN
    RAISE EXCEPTION 'Invalid video detail filter' USING errcode = '22023';
  END IF;

  v_range_start := CASE coalesce(p_range, '30')
    WHEN '7' THEN now() - interval '7 days'
    WHEN '30' THEN now() - interval '30 days'
    WHEN '90' THEN now() - interval '90 days'
    WHEN '365' THEN now() - interval '365 days'
    ELSE NULL
  END;

  WITH lesson_record AS (
    SELECT
      lesson.id AS lesson_id,
      lesson.title AS lesson_title,
      lesson.description AS lesson_description,
      lesson.duration_seconds,
      lesson.display_order AS lesson_order,
      module.id AS module_id,
      module.title AS module_title,
      module.display_order AS module_order,
      course.id AS course_id,
      course.title AS course_title,
      course.slug AS course_slug
    FROM public.lessons AS lesson
    JOIN public.course_modules AS module ON module.id = lesson.module_id
    JOIN public.courses AS course ON course.id = lesson.course_id
    WHERE lesson.id = p_lesson_id AND lesson.type = 'video'
  ),
  viewer_base AS (
    SELECT
      progress.id AS progress_id,
      progress.user_id,
      progress.enrollment_id,
      profile.email,
      profile.first_name,
      profile.last_name,
      profile.avatar_url,
      progress.is_completed,
      progress.playback_status,
      progress.watch_time_seconds,
      progress.last_position_seconds,
      progress.max_position_reached_seconds,
      progress.started_at,
      progress.completed_at,
      progress.last_accessed_at,
      progress.last_heartbeat_at,
      lesson.duration_seconds,
      CASE
        WHEN progress.is_completed THEN 100
        WHEN lesson.duration_seconds > 0 THEN round(least(
          100::numeric,
          greatest(progress.max_position_reached_seconds, progress.watch_time_seconds)::numeric * 100 / lesson.duration_seconds
        ))::integer
        ELSE NULL
      END AS reach_percent,
      (
        progress.playback_status = 'playing'
        AND progress.last_heartbeat_at >= now() - interval '45 seconds'
      ) AS active_now,
      CASE
        WHEN progress.is_completed THEN 'completed'
        WHEN progress.playback_status = 'playing' AND progress.last_heartbeat_at >= now() - interval '45 seconds' THEN 'active_now'
        WHEN progress.playback_status = 'paused' THEN 'paused'
        WHEN greatest(progress.max_position_reached_seconds, progress.watch_time_seconds) > 0 THEN 'resume_ready'
        ELSE 'started'
      END AS viewer_status,
      coalesce(nullif(lower(trim(concat_ws(' ', profile.first_name, profile.last_name))), ''), lower(profile.email)) AS sort_name
    FROM public.lesson_progress AS progress
    JOIN lesson_record AS lesson ON lesson.lesson_id = progress.lesson_id
    JOIN public.users AS profile ON profile.id = progress.user_id
    WHERE v_range_start IS NULL OR progress.last_accessed_at >= v_range_start
  ),
  filtered AS (
    SELECT *
    FROM viewer_base
    WHERE coalesce(p_status, 'all') = 'all'
      OR viewer_status = p_status
      OR (p_status = 'resume_ready' AND NOT is_completed AND greatest(max_position_reached_seconds, watch_time_seconds) > 0)
  ),
  ordered AS (
    SELECT
      filtered.*,
      row_number() OVER (
        ORDER BY
          CASE WHEN p_sort = 'activity' THEN last_accessed_at END DESC NULLS LAST,
          CASE WHEN p_sort = 'reach' THEN reach_percent END DESC NULLS LAST,
          CASE WHEN p_sort = 'name' THEN sort_name END,
          CASE WHEN p_sort = 'completed' THEN completed_at END DESC NULLS LAST,
          last_accessed_at DESC NULLS LAST,
          progress_id
      ) AS row_number
    FROM filtered
  ),
  paged AS (
    SELECT *
    FROM ordered
    WHERE row_number > v_offset AND row_number <= v_offset + v_page_size
  ),
  summary AS (
    SELECT
      count(*)::integer AS viewers,
      count(*) FILTER (WHERE is_completed)::integer AS completed,
      count(*) FILTER (WHERE active_now)::integer AS active_now,
      count(*) FILTER (WHERE NOT is_completed AND greatest(max_position_reached_seconds, watch_time_seconds) > 0)::integer AS resume_ready,
      count(*) FILTER (WHERE reach_percent IS NOT NULL)::integer AS measurable_viewers,
      count(*) FILTER (WHERE reach_percent IS NULL)::integer AS unknown_reach,
      coalesce(round(avg(reach_percent) FILTER (WHERE reach_percent IS NOT NULL)), 0)::integer AS average_reach,
      coalesce(sum(greatest(watch_time_seconds, max_position_reached_seconds)), 0)::bigint AS verified_coverage_seconds
    FROM viewer_base
  )
  SELECT jsonb_build_object(
    'lesson', coalesce((SELECT to_jsonb(lesson_record) FROM lesson_record), '{}'::jsonb),
    'summary', coalesce((SELECT to_jsonb(summary) FROM summary), '{}'::jsonb),
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(paged) - 'row_number' - 'sort_name' ORDER BY row_number) FROM paged), '[]'::jsonb),
    'total_count', (SELECT count(*) FROM filtered)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_video_analytics_dashboard(text, uuid, text, text, text, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_video_analytics_dashboard(text, uuid, text, text, text, integer, integer)
  TO authenticated;

REVOKE ALL ON FUNCTION public.admin_video_analytics_detail(uuid, text, text, text, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_video_analytics_detail(uuid, text, text, text, integer, integer)
  TO authenticated;

COMMENT ON FUNCTION public.admin_video_analytics_dashboard(text, uuid, text, text, text, integer, integer) IS
  'Admin-only verified video coverage, starts, completions, playback state, duration quality, course comparison, and paginated lesson reporting.';

COMMENT ON FUNCTION public.admin_video_analytics_detail(uuid, text, text, text, integer, integer) IS
  'Admin-only learner-level video progress detail for one lesson without exposing raw rows to the browser.';
