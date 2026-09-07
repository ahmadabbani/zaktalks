begin;

-- A paid guest should not become inactive before they can actually use their
-- account. When password setup and verification finish, begin a fresh reminder
-- grace period without changing any lesson-progress record.
create or replace function public.refresh_course_activity_when_account_ready()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.role = 'user'
     and new.password_set = true
     and new.email_verified = true
     and (
       old.password_set is distinct from new.password_set
       or old.email_verified is distinct from new.email_verified
     ) then
    update public.course_enrollment_activity
    set last_activity_at = clock_timestamp(),
        updated_at = clock_timestamp()
    where user_id = new.id;
  end if;

  return new;
end;
$function$;

revoke all on function public.refresh_course_activity_when_account_ready()
  from public, anon, authenticated;

drop trigger if exists refresh_course_activity_after_account_ready on public.users;
create trigger refresh_course_activity_after_account_ready
after update of password_set, email_verified on public.users
for each row
execute function public.refresh_course_activity_when_account_ready();

commit;
