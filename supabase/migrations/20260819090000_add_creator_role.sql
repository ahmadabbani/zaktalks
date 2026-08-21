-- Add the creator account type without granting it any administrative privileges.
-- Access is intentionally added separately after the creator permission matrix is defined.

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['user'::text, 'creator'::text, 'admin'::text]));

COMMENT ON COLUMN public.users.role IS
  'Account authorization role: user, creator, or admin. Creator permissions are enforced by application and database authorization rules.';
