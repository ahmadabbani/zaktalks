-- Keep signed-in purchase history fast at any depth and evaluate auth.uid()
-- once per query while preserving the existing ownership boundary.

CREATE INDEX IF NOT EXISTS checkout_sessions_user_history_idx
  ON public.checkout_sessions (user_id, created_at DESC, id DESC)
  WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS checkout_read_own ON public.checkout_sessions;
CREATE POLICY checkout_read_own
  ON public.checkout_sessions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

COMMENT ON INDEX public.checkout_sessions_user_history_idx IS
  'Supports RLS-scoped learner purchase history and descending cursor pagination.';
