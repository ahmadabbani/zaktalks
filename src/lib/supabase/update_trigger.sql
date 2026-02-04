-- 1. Create the function that syncs updates from auth.users to public.users
create or replace function public.handle_auth_user_update()
returns trigger as $$
begin
  update public.users
  set 
    email_verified = (new.email_confirmed_at is not null),
    email = new.email,
    updated_at = now()
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger that fires whenever auth.users is updated
-- (This handles email verification, email changes, last sign in updates, etc.)
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row
  execute procedure public.handle_auth_user_update();

-- 3. RETROACTIVE FIX: Update existing users who are already verified
update public.users
set email_verified = true
from auth.users
where public.users.id = auth.users.id
and auth.users.email_confirmed_at is not null;
