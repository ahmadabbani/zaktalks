-- Admin-only reporting for scored lesson-player attempts and scoreless
-- worksheet submissions. Raw worksheet answers are deliberately excluded.

CREATE INDEX IF NOT EXISTS specific_assessment_submissions_lesson_submitted_idx
  ON public.specific_assessment_submissions (lesson_id, submitted_at DESC);

CREATE OR REPLACE FUNCTION public.admin_assessment_results_dashboard(
  p_lens text DEFAULT 'learner',
  p_search text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_kind text DEFAULT 'all',
  p_range text DEFAULT '30',
  p_sort text DEFAULT 'activity',
  p_page_size integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_cutoff timestamptz;
  v_result jsonb;
  v_search text := NULLIF(btrim(COALESCE(p_search, '')), '');
  v_limit integer := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  IF p_lens NOT IN ('learner', 'assessment') THEN p_lens := 'learner'; END IF;
  IF p_kind NOT IN ('all', 'scored', 'worksheet') THEN p_kind := 'all'; END IF;
  IF p_sort NOT IN ('activity', 'name', 'attempts', 'score') THEN p_sort := 'activity'; END IF;

  v_cutoff := CASE p_range
    WHEN '7' THEN now() - interval '7 days'
    WHEN '30' THEN now() - interval '30 days'
    WHEN '90' THEN now() - interval '90 days'
    WHEN '365' THEN now() - interval '365 days'
    ELSE NULL
  END;

  IF p_lens = 'learner' THEN
    WITH scored AS (
      SELECT a.user_id, a.lesson_id, a.course_id, a.module_id, 'scored'::text AS kind,
        a.completed_at AS event_at, a.score_percent
      FROM public.assessment_attempts a
      WHERE (v_cutoff IS NULL OR a.completed_at >= v_cutoff)
        AND (p_course_id IS NULL OR a.course_id = p_course_id)
        AND p_kind IN ('all', 'scored')
    ),
    worksheets AS (
      SELECT s.user_id, s.lesson_id, l.course_id, l.module_id, 'worksheet'::text AS kind,
        s.submitted_at AS event_at, NULL::numeric AS score_percent
      FROM public.specific_assessment_submissions s
      JOIN public.lessons l ON l.id = s.lesson_id
      WHERE (v_cutoff IS NULL OR s.submitted_at >= v_cutoff)
        AND (p_course_id IS NULL OR l.course_id = p_course_id)
        AND p_kind IN ('all', 'worksheet')
    ),
    events AS (SELECT * FROM scored UNION ALL SELECT * FROM worksheets),
    filtered AS (
      SELECT e.*
      FROM events e
      JOIN public.users u ON u.id = e.user_id
      WHERE v_search IS NULL
        OR concat_ws(' ', u.first_name, u.last_name, u.email) ILIKE '%' || v_search || '%'
    ),
    latest_scored AS (
      SELECT DISTINCT ON (f.user_id, f.lesson_id) f.user_id, f.lesson_id, f.score_percent
      FROM filtered f
      WHERE f.kind = 'scored'
      ORDER BY f.user_id, f.lesson_id, f.event_at DESC
    ),
    activity AS (
      SELECT f.user_id,
        count(DISTINCT f.lesson_id)::integer AS assessment_count,
        count(*) FILTER (WHERE f.kind = 'scored')::integer AS scored_attempts,
        count(*) FILTER (WHERE f.kind = 'worksheet')::integer AS worksheet_submissions,
        GREATEST(
          count(*) FILTER (WHERE f.kind = 'scored')
          - count(DISTINCT f.lesson_id) FILTER (WHERE f.kind = 'scored'), 0
        )::integer AS retakes,
        max(f.event_at) AS last_activity_at
      FROM filtered f
      GROUP BY f.user_id
    ),
    latest_scores AS (
      SELECT ls.user_id,
        round(avg(ls.score_percent), 1) AS average_latest_score,
        round(max(ls.score_percent), 1) AS best_score
      FROM latest_scored ls
      GROUP BY ls.user_id
    ),
    rollup AS (
      SELECT a.*, u.first_name, u.last_name, u.email, u.email_verified,
        latest.average_latest_score, latest.best_score
      FROM activity a
      JOIN public.users u ON u.id = a.user_id
      LEFT JOIN latest_scores latest ON latest.user_id = a.user_id
    ),
    ordered AS (
      SELECT r.*
      FROM rollup r
      ORDER BY
        CASE WHEN p_sort = 'name' THEN lower(concat_ws(' ', r.first_name, r.last_name, r.email)) END ASC,
        CASE WHEN p_sort = 'attempts' THEN r.scored_attempts + r.worksheet_submissions END DESC,
        CASE WHEN p_sort = 'score' THEN r.average_latest_score END DESC NULLS LAST,
        r.last_activity_at DESC,
        r.user_id
      LIMIT v_limit OFFSET v_offset
    ),
    score_distribution AS (
      SELECT
        count(*) FILTER (WHERE score_percent < 50)::integer AS under_50,
        count(*) FILTER (WHERE score_percent >= 50 AND score_percent < 70)::integer AS from_50_69,
        count(*) FILTER (WHERE score_percent >= 70 AND score_percent < 85)::integer AS from_70_84,
        count(*) FILTER (WHERE score_percent >= 85)::integer AS from_85_100
      FROM latest_scored
    )
    SELECT jsonb_build_object(
      'rows', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY
        CASE WHEN p_sort = 'name' THEN lower(concat_ws(' ', o.first_name, o.last_name, o.email)) END ASC,
        CASE WHEN p_sort = 'attempts' THEN o.scored_attempts + o.worksheet_submissions END DESC,
        CASE WHEN p_sort = 'score' THEN o.average_latest_score END DESC NULLS LAST,
        o.last_activity_at DESC) FROM ordered o), '[]'::jsonb),
      'total_count', (SELECT count(*) FROM rollup),
      'summary', jsonb_build_object(
        'learners', (SELECT count(DISTINCT user_id) FROM filtered),
        'assessments', (SELECT count(DISTINCT lesson_id) FROM filtered),
        'scored_attempts', (SELECT count(*) FROM filtered WHERE kind = 'scored'),
        'worksheet_submissions', (SELECT count(*) FROM filtered WHERE kind = 'worksheet'),
        'retakes', (SELECT COALESCE(sum(retakes), 0) FROM activity),
        'average_latest_score', (SELECT round(avg(score_percent), 1) FROM latest_scored)
      ),
      'score_distribution', COALESCE((SELECT to_jsonb(d) FROM score_distribution d), '{}'::jsonb)
    ) INTO v_result;
  ELSE
    WITH scored AS (
      SELECT a.user_id, a.lesson_id, a.course_id, a.module_id, 'scored'::text AS kind,
        a.completed_at AS event_at, a.score_percent
      FROM public.assessment_attempts a
      WHERE (v_cutoff IS NULL OR a.completed_at >= v_cutoff)
        AND (p_course_id IS NULL OR a.course_id = p_course_id)
        AND p_kind IN ('all', 'scored')
    ),
    worksheets AS (
      SELECT s.user_id, s.lesson_id, l.course_id, l.module_id, 'worksheet'::text AS kind,
        s.submitted_at AS event_at, NULL::numeric AS score_percent
      FROM public.specific_assessment_submissions s
      JOIN public.lessons l ON l.id = s.lesson_id
      WHERE (v_cutoff IS NULL OR s.submitted_at >= v_cutoff)
        AND (p_course_id IS NULL OR l.course_id = p_course_id)
        AND p_kind IN ('all', 'worksheet')
    ),
    events AS (SELECT * FROM scored UNION ALL SELECT * FROM worksheets),
    filtered AS (
      SELECT e.*, l.title AS lesson_title, l.assessment_key, c.title AS course_title,
        m.title AS module_title
      FROM events e
      JOIN public.lessons l ON l.id = e.lesson_id
      JOIN public.courses c ON c.id = e.course_id
      JOIN public.course_modules m ON m.id = e.module_id
      WHERE v_search IS NULL
        OR concat_ws(' ', l.title, l.assessment_key, c.title, m.title) ILIKE '%' || v_search || '%'
    ),
    latest_scored AS (
      SELECT DISTINCT ON (f.user_id, f.lesson_id) f.user_id, f.lesson_id, f.score_percent
      FROM filtered f
      WHERE f.kind = 'scored'
      ORDER BY f.user_id, f.lesson_id, f.event_at DESC
    ),
    activity AS (
      SELECT f.lesson_id, min(f.course_id::text)::uuid AS course_id,
        min(f.module_id::text)::uuid AS module_id, min(f.lesson_title) AS lesson_title,
        min(f.assessment_key) AS assessment_key, min(f.course_title) AS course_title,
        min(f.module_title) AS module_title,
        CASE WHEN bool_or(f.kind = 'scored') THEN 'scored' ELSE 'worksheet' END AS kind,
        count(DISTINCT f.user_id)::integer AS learner_count,
        count(*) FILTER (WHERE f.kind = 'scored')::integer AS scored_attempts,
        count(*) FILTER (WHERE f.kind = 'worksheet')::integer AS worksheet_submissions,
        GREATEST(
          count(*) FILTER (WHERE f.kind = 'scored')
          - count(DISTINCT f.user_id) FILTER (WHERE f.kind = 'scored'), 0
        )::integer AS retakes,
        max(f.event_at) AS last_activity_at
      FROM filtered f
      GROUP BY f.lesson_id
    ),
    scores AS (
      SELECT ls.lesson_id, round(avg(ls.score_percent), 1) AS average_latest_score,
        round(min(ls.score_percent), 1) AS lowest_latest_score,
        round(max(ls.score_percent), 1) AS highest_latest_score
      FROM latest_scored ls
      GROUP BY ls.lesson_id
    ),
    rollup AS (
      SELECT a.*, s.average_latest_score, s.lowest_latest_score, s.highest_latest_score
      FROM activity a LEFT JOIN scores s ON s.lesson_id = a.lesson_id
    ),
    ordered AS (
      SELECT r.* FROM rollup r
      ORDER BY
        CASE WHEN p_sort = 'name' THEN lower(r.lesson_title) END ASC,
        CASE WHEN p_sort = 'attempts' THEN r.scored_attempts + r.worksheet_submissions END DESC,
        CASE WHEN p_sort = 'score' THEN r.average_latest_score END DESC NULLS LAST,
        r.last_activity_at DESC,
        r.lesson_id
      LIMIT v_limit OFFSET v_offset
    ),
    score_distribution AS (
      SELECT
        count(*) FILTER (WHERE score_percent < 50)::integer AS under_50,
        count(*) FILTER (WHERE score_percent >= 50 AND score_percent < 70)::integer AS from_50_69,
        count(*) FILTER (WHERE score_percent >= 70 AND score_percent < 85)::integer AS from_70_84,
        count(*) FILTER (WHERE score_percent >= 85)::integer AS from_85_100
      FROM latest_scored
    )
    SELECT jsonb_build_object(
      'rows', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY
        CASE WHEN p_sort = 'name' THEN lower(o.lesson_title) END ASC,
        CASE WHEN p_sort = 'attempts' THEN o.scored_attempts + o.worksheet_submissions END DESC,
        CASE WHEN p_sort = 'score' THEN o.average_latest_score END DESC NULLS LAST,
        o.last_activity_at DESC) FROM ordered o), '[]'::jsonb),
      'total_count', (SELECT count(*) FROM rollup),
      'summary', jsonb_build_object(
        'learners', (SELECT count(DISTINCT user_id) FROM filtered),
        'assessments', (SELECT count(DISTINCT lesson_id) FROM filtered),
        'scored_attempts', (SELECT count(*) FROM filtered WHERE kind = 'scored'),
        'worksheet_submissions', (SELECT count(*) FROM filtered WHERE kind = 'worksheet'),
        'retakes', (SELECT COALESCE(sum(retakes), 0) FROM activity),
        'average_latest_score', (SELECT round(avg(score_percent), 1) FROM latest_scored)
      ),
      'score_distribution', COALESCE((SELECT to_jsonb(d) FROM score_distribution d), '{}'::jsonb)
    ) INTO v_result;
  END IF;

  RETURN v_result || jsonb_build_object(
    'courses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('course_id', c.id, 'course_title', c.title) ORDER BY c.title)
      FROM public.courses c
      WHERE EXISTS (SELECT 1 FROM public.lessons l WHERE l.course_id = c.id AND l.type = 'assessment'::public.lesson_type)
    ), '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_assessment_learner_detail(
  p_user_id uuid,
  p_range text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_cutoff timestamptz;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required.'; END IF;
  v_cutoff := CASE p_range WHEN '7' THEN now() - interval '7 days' WHEN '30' THEN now() - interval '30 days' WHEN '90' THEN now() - interval '90 days' WHEN '365' THEN now() - interval '365 days' ELSE NULL END;

  WITH identity AS (
    SELECT id, first_name, last_name, email, email_verified FROM public.users WHERE id = p_user_id
  ),
  scored_groups AS (
    SELECT a.lesson_id, min(a.course_id::text)::uuid AS course_id, min(a.module_id::text)::uuid AS module_id,
      count(*)::integer AS attempt_count, round(avg(a.score_percent), 1) AS average_score,
      round(max(a.score_percent), 1) AS best_score, max(a.completed_at) AS last_activity_at
    FROM public.assessment_attempts a
    WHERE a.user_id = p_user_id AND (v_cutoff IS NULL OR a.completed_at >= v_cutoff)
    GROUP BY a.lesson_id
  ),
  scored_results AS (
    SELECT g.lesson_id, 'scored'::text AS kind, l.title AS lesson_title, l.assessment_key,
      c.title AS course_title, m.title AS module_title, g.attempt_count, g.average_score,
      g.best_score, g.last_activity_at, NULL::uuid AS submission_id, false AS has_file,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', a.id, 'attempt_number', a.attempt_number, 'score_value', a.score_value,
          'score_max', a.score_max, 'score_percent', a.score_percent,
          'result_label', a.result_label, 'score_details', a.score_details,
          'completed_at', a.completed_at
        ) ORDER BY a.attempt_number DESC)
        FROM public.assessment_attempts a
        WHERE a.user_id = p_user_id AND a.lesson_id = g.lesson_id
          AND (v_cutoff IS NULL OR a.completed_at >= v_cutoff)
      ), '[]'::jsonb) AS history
    FROM scored_groups g
    JOIN public.lessons l ON l.id = g.lesson_id
    JOIN public.courses c ON c.id = g.course_id
    JOIN public.course_modules m ON m.id = g.module_id
  ),
  worksheet_results AS (
    SELECT s.lesson_id, 'worksheet'::text AS kind, l.title AS lesson_title, s.assessment_key,
      c.title AS course_title, m.title AS module_title, 1::integer AS attempt_count,
      NULL::numeric AS average_score, NULL::numeric AS best_score, s.submitted_at AS last_activity_at,
      s.id AS submission_id, (s.generated_file_path IS NOT NULL) AS has_file,
      '[]'::jsonb AS history
    FROM public.specific_assessment_submissions s
    JOIN public.lessons l ON l.id = s.lesson_id
    JOIN public.courses c ON c.id = l.course_id
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE s.user_id = p_user_id AND (v_cutoff IS NULL OR s.submitted_at >= v_cutoff)
  ),
  results AS (SELECT * FROM scored_results UNION ALL SELECT * FROM worksheet_results)
  SELECT jsonb_build_object(
    'learner', COALESCE((SELECT to_jsonb(i) FROM identity i), '{}'::jsonb),
    'summary', jsonb_build_object(
      'assessments', (SELECT count(*) FROM results),
      'scored_attempts', (SELECT COALESCE(sum(attempt_count), 0) FROM results WHERE kind = 'scored'),
      'worksheets', (SELECT count(*) FROM results WHERE kind = 'worksheet'),
      'average_latest_score', (SELECT round(avg((history->0->>'score_percent')::numeric), 1) FROM results WHERE kind = 'scored' AND jsonb_array_length(history) > 0)
    ),
    'results', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.last_activity_at DESC) FROM results r), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_assessment_detail(
  p_lesson_id uuid,
  p_range text DEFAULT 'all',
  p_search text DEFAULT NULL,
  p_sort text DEFAULT 'activity',
  p_page_size integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_cutoff timestamptz;
  v_result jsonb;
  v_search text := NULLIF(btrim(COALESCE(p_search, '')), '');
  v_limit integer := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required.'; END IF;
  IF p_sort NOT IN ('activity', 'name', 'attempts', 'score') THEN p_sort := 'activity'; END IF;
  v_cutoff := CASE p_range WHEN '7' THEN now() - interval '7 days' WHEN '30' THEN now() - interval '30 days' WHEN '90' THEN now() - interval '90 days' WHEN '365' THEN now() - interval '365 days' ELSE NULL END;

  WITH lesson_context AS (
    SELECT l.id AS lesson_id, l.title AS lesson_title, l.assessment_key, c.title AS course_title,
      m.title AS module_title
    FROM public.lessons l JOIN public.courses c ON c.id = l.course_id
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE l.id = p_lesson_id AND l.type = 'assessment'::public.lesson_type
  ),
  scored_activity AS (
    SELECT a.user_id, count(*)::integer AS attempt_count, round(avg(a.score_percent), 1) AS average_score,
      round(max(a.score_percent), 1) AS best_score, min(a.completed_at) AS first_activity_at,
      max(a.completed_at) AS last_activity_at
    FROM public.assessment_attempts a
    WHERE a.lesson_id = p_lesson_id AND (v_cutoff IS NULL OR a.completed_at >= v_cutoff)
    GROUP BY a.user_id
  ),
  scored_rows AS (
    SELECT sa.user_id, u.first_name, u.last_name, u.email, 'scored'::text AS kind,
      sa.attempt_count, sa.average_score, sa.best_score, sa.first_activity_at, sa.last_activity_at,
      NULL::uuid AS submission_id, false AS has_file,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'attempt_number', a.attempt_number, 'score_value', a.score_value,
        'score_max', a.score_max, 'score_percent', a.score_percent,
        'result_label', a.result_label, 'score_details', a.score_details,
        'completed_at', a.completed_at
      ) ORDER BY a.attempt_number DESC) FROM public.assessment_attempts a
      WHERE a.user_id = sa.user_id AND a.lesson_id = p_lesson_id
        AND (v_cutoff IS NULL OR a.completed_at >= v_cutoff)), '[]'::jsonb) AS history
    FROM scored_activity sa JOIN public.users u ON u.id = sa.user_id
  ),
  worksheet_rows AS (
    SELECT s.user_id, u.first_name, u.last_name, u.email, 'worksheet'::text AS kind,
      1::integer AS attempt_count, NULL::numeric AS average_score, NULL::numeric AS best_score,
      s.submitted_at AS first_activity_at, s.submitted_at AS last_activity_at,
      s.id AS submission_id, (s.generated_file_path IS NOT NULL) AS has_file, '[]'::jsonb AS history
    FROM public.specific_assessment_submissions s JOIN public.users u ON u.id = s.user_id
    WHERE s.lesson_id = p_lesson_id AND (v_cutoff IS NULL OR s.submitted_at >= v_cutoff)
  ),
  all_rows AS (SELECT * FROM scored_rows UNION ALL SELECT * FROM worksheet_rows),
  filtered AS (
    SELECT r.* FROM all_rows r
    WHERE v_search IS NULL OR concat_ws(' ', r.first_name, r.last_name, r.email) ILIKE '%' || v_search || '%'
  ),
  ordered AS (
    SELECT f.* FROM filtered f
    ORDER BY
      CASE WHEN p_sort = 'name' THEN lower(concat_ws(' ', f.first_name, f.last_name, f.email)) END ASC,
      CASE WHEN p_sort = 'attempts' THEN f.attempt_count END DESC,
      CASE WHEN p_sort = 'score' THEN f.average_score END DESC NULLS LAST,
      f.last_activity_at DESC, f.user_id
    LIMIT v_limit OFFSET v_offset
  )
  SELECT jsonb_build_object(
    'assessment', COALESCE((SELECT to_jsonb(lc) FROM lesson_context lc), '{}'::jsonb),
    'summary', jsonb_build_object(
      'learners', (SELECT count(*) FROM all_rows),
      'scored_attempts', (SELECT COALESCE(sum(attempt_count), 0) FROM all_rows WHERE kind = 'scored'),
      'worksheet_submissions', (SELECT count(*) FROM all_rows WHERE kind = 'worksheet'),
      'retakes', (SELECT COALESCE(sum(GREATEST(attempt_count - 1, 0)), 0) FROM all_rows WHERE kind = 'scored'),
      'average_latest_score', (SELECT round(avg((history->0->>'score_percent')::numeric), 1) FROM all_rows WHERE kind = 'scored' AND jsonb_array_length(history) > 0)
    ),
    'rows', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY
      CASE WHEN p_sort = 'name' THEN lower(concat_ws(' ', o.first_name, o.last_name, o.email)) END ASC,
      CASE WHEN p_sort = 'attempts' THEN o.attempt_count END DESC,
      CASE WHEN p_sort = 'score' THEN o.average_score END DESC NULLS LAST,
      o.last_activity_at DESC) FROM ordered o), '[]'::jsonb),
    'total_count', (SELECT count(*) FROM filtered)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_assessment_results_dashboard(text, text, uuid, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assessment_results_dashboard(text, text, uuid, text, text, text, integer, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_assessment_learner_detail(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assessment_learner_detail(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_assessment_detail(uuid, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assessment_detail(uuid, text, text, text, integer, integer) TO authenticated, service_role;

