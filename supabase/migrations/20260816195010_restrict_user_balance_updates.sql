-- Profile owners can edit presentation fields, but payment/account state is
-- controlled only by trusted server code and database finalizers.
REVOKE UPDATE ON TABLE public.users FROM anon, authenticated;
GRANT UPDATE (first_name, last_name, avatar_url, updated_at)
  ON TABLE public.users TO authenticated;
