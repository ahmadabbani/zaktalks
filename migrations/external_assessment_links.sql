-- ============================================
-- EXTERNAL ASSESSMENT LINKS
-- Run this in Supabase SQL Editor
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.external_assessment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_key TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_external_assessment_links_token
ON public.external_assessment_links(token);

CREATE INDEX IF NOT EXISTS idx_external_assessment_links_active
ON public.external_assessment_links(expires_at, revoked_at);

ALTER TABLE public.external_assessment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage external assessment links" ON public.external_assessment_links;
CREATE POLICY "Admins manage external assessment links"
ON public.external_assessment_links
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Public users intentionally get no direct table access.
-- The website validates public links server-side using the service role key,
-- then returns only the assessment key when the token is valid and active.

COMMIT;
