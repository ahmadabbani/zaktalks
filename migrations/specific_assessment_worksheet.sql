-- ============================================
-- FILLABLE SPECIFIC ASSESSMENT WORKSHEETS
-- Run this in Supabase SQL Editor
-- ============================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'specific-assessments',
  'specific-assessments',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.specific_assessment_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL UNIQUE REFERENCES public.lessons(id) ON DELETE CASCADE,
  assessment_key TEXT NOT NULL,
  default_file_path TEXT NOT NULL,
  default_file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.specific_assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.user_enrollments(id) ON DELETE SET NULL,
  assessment_key TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_file_path TEXT,
  generated_file_name TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_specific_assessment_lessons_assessment_key
ON public.specific_assessment_lessons(assessment_key);

CREATE INDEX IF NOT EXISTS idx_specific_assessment_submissions_user_lesson
ON public.specific_assessment_submissions(user_id, lesson_id);

ALTER TABLE public.specific_assessment_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specific_assessment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage specific assessment lessons" ON public.specific_assessment_lessons;
CREATE POLICY "Admins manage specific assessment lessons"
ON public.specific_assessment_lessons
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Enrolled users read specific assessment lessons" ON public.specific_assessment_lessons;
CREATE POLICY "Enrolled users read specific assessment lessons"
ON public.specific_assessment_lessons
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.user_enrollments ue ON ue.course_id = l.course_id
    WHERE l.id = specific_assessment_lessons.lesson_id
    AND ue.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins manage specific assessment submissions" ON public.specific_assessment_submissions;
CREATE POLICY "Admins manage specific assessment submissions"
ON public.specific_assessment_submissions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users read own specific assessment submissions" ON public.specific_assessment_submissions;
CREATE POLICY "Users read own specific assessment submissions"
ON public.specific_assessment_submissions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own enrolled specific assessment submissions" ON public.specific_assessment_submissions;
CREATE POLICY "Users insert own enrolled specific assessment submissions"
ON public.specific_assessment_submissions
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.user_enrollments ue ON ue.course_id = l.course_id
    WHERE l.id = specific_assessment_submissions.lesson_id
    AND ue.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users update own enrolled specific assessment submissions" ON public.specific_assessment_submissions;
CREATE POLICY "Users update own enrolled specific assessment submissions"
ON public.specific_assessment_submissions
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.user_enrollments ue ON ue.course_id = l.course_id
    WHERE l.id = specific_assessment_submissions.lesson_id
    AND ue.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins manage specific assessment files" ON storage.objects;
CREATE POLICY "Admins manage specific assessment files"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'specific-assessments'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'specific-assessments'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Authenticated users read specific assessment templates" ON storage.objects;
CREATE POLICY "Authenticated users read specific assessment templates"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'specific-assessments'
  AND name LIKE 'templates/%'
);

DROP POLICY IF EXISTS "Users read own generated specific assessments" ON storage.objects;
CREATE POLICY "Users read own generated specific assessments"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'specific-assessments'
  AND name LIKE ('submissions/' || auth.uid()::text || '/%')
);

COMMIT;
