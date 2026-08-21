-- Clear assessment participation reporting without comparing unrelated result scales.

CREATE OR REPLACE FUNCTION public.admin_assessment_activity_timeline(
  p_course_id uuid DEFAULT NULL,
  p_kind text DEFAULT 'all',
  p_range text DEFAULT '30'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_cutoff timestamptz;
  v_bucket text;
  v_step interval;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  IF p_kind NOT IN ('all', 'scored', 'worksheet') THEN p_kind := 'all'; END IF;
  IF p_range NOT IN ('7', '30', '90', '365', 'all') THEN p_range := '30'; END IF;

  v_cutoff := CASE p_range
    WHEN '7' THEN now() - interval '7 days'
    WHEN '30' THEN now() - interval '30 days'
    WHEN '90' THEN now() - interval '90 days'
    WHEN '365' THEN now() - interval '365 days'
    ELSE NULL
  END;

  v_bucket := CASE
    WHEN p_range = '7' THEN 'day'
    WHEN p_range IN ('30', '90') THEN 'week'
    ELSE 'month'
  END;

  v_step := CASE v_bucket
    WHEN 'day' THEN interval '1 day'
    WHEN 'week' THEN interval '1 week'
    ELSE interval '1 month'
  END;

  WITH events AS (
    SELECT a.completed_at AS event_at, a.user_id, 'scored'::text AS event_kind,
      a.attempt_number
    FROM public.assessment_attempts a
    WHERE (v_cutoff IS NULL OR a.completed_at >= v_cutoff)
      AND (p_course_id IS NULL OR a.course_id = p_course_id)
      AND p_kind IN ('all', 'scored')

    UNION ALL

    SELECT s.submitted_at AS event_at, s.user_id, 'worksheet'::text AS event_kind,
      NULL::integer AS attempt_number
    FROM public.specific_assessment_submissions s
    JOIN public.lessons l ON l.id = s.lesson_id
    WHERE (v_cutoff IS NULL OR s.submitted_at >= v_cutoff)
      AND (p_course_id IS NULL OR l.course_id = p_course_id)
      AND p_kind IN ('all', 'worksheet')
  ),
  bounds AS (
    SELECT
      CASE
        WHEN v_cutoff IS NOT NULL THEN pg_catalog.date_trunc(v_bucket, v_cutoff)
        ELSE pg_catalog.date_trunc(v_bucket, COALESCE(min(event_at), now()))
      END AS first_bucket,
      pg_catalog.date_trunc(v_bucket, now()) AS last_bucket
    FROM events
  ),
  buckets AS (
    SELECT series.bucket_start
    FROM bounds b
    CROSS JOIN LATERAL pg_catalog.generate_series(
      b.first_bucket,
      b.last_bucket,
      v_step
    ) AS series(bucket_start)
  ),
  activity AS (
    SELECT pg_catalog.date_trunc(v_bucket, e.event_at) AS bucket_start,
      count(*) FILTER (WHERE e.event_kind = 'scored' AND e.attempt_number = 1)::integer AS first_attempts,
      count(*) FILTER (WHERE e.event_kind = 'scored' AND e.attempt_number > 1)::integer AS retakes,
      count(*) FILTER (WHERE e.event_kind = 'worksheet')::integer AS worksheet_submissions,
      count(DISTINCT e.user_id)::integer AS unique_learners
    FROM events e
    GROUP BY pg_catalog.date_trunc(v_bucket, e.event_at)
  ),
  timeline AS (
    SELECT b.bucket_start,
      COALESCE(a.first_attempts, 0)::integer AS first_attempts,
      COALESCE(a.retakes, 0)::integer AS retakes,
      COALESCE(a.worksheet_submissions, 0)::integer AS worksheet_submissions,
      COALESCE(a.unique_learners, 0)::integer AS unique_learners
    FROM buckets b
    LEFT JOIN activity a ON a.bucket_start = b.bucket_start
    ORDER BY b.bucket_start
  )
  SELECT jsonb_build_object(
    'bucket', v_bucket,
    'rows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'bucket_start', t.bucket_start,
        'first_attempts', t.first_attempts,
        'retakes', t.retakes,
        'worksheet_submissions', t.worksheet_submissions,
        'unique_learners', t.unique_learners
      ) ORDER BY t.bucket_start)
      FROM timeline t
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'first_attempts', (SELECT count(*) FROM events WHERE event_kind = 'scored' AND attempt_number = 1),
      'retakes', (SELECT count(*) FROM events WHERE event_kind = 'scored' AND attempt_number > 1),
      'worksheet_submissions', (SELECT count(*) FROM events WHERE event_kind = 'worksheet'),
      'unique_learners', (SELECT count(DISTINCT user_id) FROM events)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_assessment_activity_timeline(uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assessment_activity_timeline(uuid, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_assessment_activity_timeline(uuid, text, text) IS
  'Admin-only assessment participation timeline using first attempts, retakes, worksheets, and unique learners.';
