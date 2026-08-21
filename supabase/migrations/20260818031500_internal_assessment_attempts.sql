-- Preserve every scored lesson-player assessment submission. External-link
-- assessments and scoreless worksheets keep their existing storage paths.

CREATE TABLE public.assessment_attempts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.user_enrollments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  assessment_key text NOT NULL,
  assessment_type text NOT NULL,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  score_value numeric(10, 2) NOT NULL CHECK (score_value >= 0),
  score_max numeric(10, 2) NOT NULL CHECK (score_max > 0),
  score_percent numeric(5, 2) NOT NULL CHECK (score_percent >= 0 AND score_percent <= 100),
  result_label text,
  score_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(score_details) = 'object'),
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id, attempt_number)
);

CREATE INDEX assessment_attempts_user_completed_idx
  ON public.assessment_attempts (user_id, completed_at DESC);
CREATE INDEX assessment_attempts_lesson_completed_idx
  ON public.assessment_attempts (lesson_id, completed_at DESC);
CREATE INDEX assessment_attempts_course_completed_idx
  ON public.assessment_attempts (course_id, completed_at DESC);
CREATE INDEX assessment_attempts_enrollment_idx
  ON public.assessment_attempts (enrollment_id);

ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY assessment_attempts_read_own
  ON public.assessment_attempts
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY assessment_attempts_admin_read
  ON public.assessment_attempts
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

REVOKE ALL ON TABLE public.assessment_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.assessment_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assessment_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.record_internal_assessment_attempt(
  p_attempt_id uuid,
  p_user_id uuid,
  p_lesson_id uuid,
  p_enrollment_id uuid,
  p_assessment_key text,
  p_assessment_type text,
  p_score_value numeric,
  p_score_max numeric,
  p_score_percent numeric,
  p_result_label text DEFAULT NULL,
  p_score_details jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(attempt_id uuid, attempt_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_lesson public.lessons%ROWTYPE;
  v_enrollment public.user_enrollments%ROWTYPE;
  v_existing public.assessment_attempts%ROWTYPE;
  v_attempt_number integer;
  v_now timestamptz := now();
BEGIN
  IF p_attempt_id IS NULL OR p_user_id IS NULL OR p_lesson_id IS NULL OR p_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'Assessment attempt context is incomplete.';
  END IF;

  IF p_score_value < 0 OR p_score_max <= 0 OR p_score_percent < 0 OR p_score_percent > 100 THEN
    RAISE EXCEPTION 'Assessment score is invalid.';
  END IF;

  IF p_score_details IS NULL OR jsonb_typeof(p_score_details) <> 'object' THEN
    RAISE EXCEPTION 'Assessment score details must be an object.';
  END IF;

  SELECT * INTO v_lesson
  FROM public.lessons
  WHERE id = p_lesson_id
    AND type = 'assessment'::public.lesson_type;

  IF NOT FOUND OR v_lesson.assessment_key IS DISTINCT FROM p_assessment_key THEN
    RAISE EXCEPTION 'Assessment lesson was not found.';
  END IF;

  SELECT * INTO v_enrollment
  FROM public.user_enrollments
  WHERE id = p_enrollment_id
    AND user_id = p_user_id
    AND course_id = v_lesson.course_id
    AND payment_status = 'completed'::public.payment_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active course access was not found.';
  END IF;

  SELECT * INTO v_existing
  FROM public.assessment_attempts
  WHERE id = p_attempt_id;

  IF FOUND THEN
    IF v_existing.user_id <> p_user_id OR v_existing.lesson_id <> p_lesson_id THEN
      RAISE EXCEPTION 'Assessment attempt identifier is already in use.';
    END IF;

    RETURN QUERY SELECT v_existing.id, v_existing.attempt_number;
    RETURN;
  END IF;

  -- Serialize attempts for one learner and lesson so concurrent submissions
  -- cannot receive the same attempt number.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text || ':' || p_lesson_id::text, 0)
  );

  SELECT * INTO v_existing
  FROM public.assessment_attempts
  WHERE id = p_attempt_id;

  IF FOUND THEN
    RETURN QUERY SELECT v_existing.id, v_existing.attempt_number;
    RETURN;
  END IF;

  SELECT COALESCE(MAX(item.attempt_number), 0) + 1
  INTO v_attempt_number
  FROM public.assessment_attempts AS item
  WHERE item.user_id = p_user_id
    AND item.lesson_id = p_lesson_id;

  INSERT INTO public.assessment_attempts (
    id,
    user_id,
    enrollment_id,
    course_id,
    module_id,
    lesson_id,
    assessment_key,
    assessment_type,
    attempt_number,
    score_value,
    score_max,
    score_percent,
    result_label,
    score_details,
    completed_at,
    created_at
  ) VALUES (
    p_attempt_id,
    p_user_id,
    v_enrollment.id,
    v_lesson.course_id,
    v_lesson.module_id,
    v_lesson.id,
    v_lesson.assessment_key,
    p_assessment_type,
    v_attempt_number,
    round(p_score_value, 2),
    round(p_score_max, 2),
    round(p_score_percent, 2),
    NULLIF(btrim(p_result_label), ''),
    p_score_details,
    v_now,
    v_now
  );

  INSERT INTO public.lesson_progress (
    user_id,
    lesson_id,
    enrollment_id,
    is_completed,
    watch_time_seconds,
    last_position_seconds,
    max_position_reached_seconds,
    score,
    attempts,
    completed_at,
    updated_at,
    playback_status,
    last_accessed_at,
    last_heartbeat_at
  ) VALUES (
    p_user_id,
    v_lesson.id,
    v_enrollment.id,
    true,
    0,
    0,
    0,
    round(p_score_percent)::integer,
    v_attempt_number,
    v_now,
    v_now,
    'inactive',
    v_now,
    NULL
  )
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    enrollment_id = EXCLUDED.enrollment_id,
    is_completed = true,
    score = EXCLUDED.score,
    attempts = GREATEST(public.lesson_progress.attempts, EXCLUDED.attempts),
    completed_at = COALESCE(public.lesson_progress.completed_at, EXCLUDED.completed_at),
    updated_at = EXCLUDED.updated_at,
    playback_status = 'inactive',
    last_accessed_at = EXCLUDED.last_accessed_at,
    last_heartbeat_at = NULL;

  RETURN QUERY SELECT p_attempt_id, v_attempt_number;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_internal_assessment_attempt(
  uuid, uuid, uuid, uuid, text, text, numeric, numeric, numeric, text, jsonb
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_internal_assessment_attempt(
  uuid, uuid, uuid, uuid, text, text, numeric, numeric, numeric, text, jsonb
) TO service_role;

-- Preserve the latest pre-migration score as attempt 1. Older retakes cannot
-- be reconstructed because the previous implementation overwrote them.
INSERT INTO public.assessment_attempts (
  id,
  user_id,
  enrollment_id,
  course_id,
  module_id,
  lesson_id,
  assessment_key,
  assessment_type,
  attempt_number,
  score_value,
  score_max,
  score_percent,
  result_label,
  score_details,
  completed_at,
  created_at
)
SELECT
  gen_random_uuid(),
  progress.user_id,
  progress.enrollment_id,
  lesson.course_id,
  lesson.module_id,
  lesson.id,
  lesson.assessment_key,
  CASE
    WHEN lesson.assessment_key = 'money-ego-states-v1' THEN 'correct-incorrect'
    WHEN lesson.assessment_key = 'stroking-questionnaire-v1' THEN 'stroke-profile'
    ELSE 'cathexis'
  END,
  1,
  progress.score,
  CASE WHEN lesson.assessment_key = 'money-ego-states-v1' THEN 20 ELSE 100 END,
  CASE
    WHEN lesson.assessment_key = 'money-ego-states-v1' THEN LEAST(100, progress.score * 5)
    ELSE progress.score
  END,
  NULL,
  jsonb_build_object('historical', true),
  COALESCE(progress.completed_at, progress.updated_at, progress.started_at),
  COALESCE(progress.completed_at, progress.updated_at, progress.started_at)
FROM public.lesson_progress AS progress
JOIN public.lessons AS lesson ON lesson.id = progress.lesson_id
WHERE lesson.type = 'assessment'::public.lesson_type
  AND progress.is_completed = true
  AND progress.score IS NOT NULL
ON CONFLICT (user_id, lesson_id, attempt_number) DO NOTHING;

UPDATE public.lesson_progress AS progress
SET attempts = GREATEST(progress.attempts, 1)
WHERE EXISTS (
  SELECT 1
  FROM public.assessment_attempts AS attempt
  WHERE attempt.user_id = progress.user_id
    AND attempt.lesson_id = progress.lesson_id
);

