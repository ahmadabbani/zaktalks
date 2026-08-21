alter table public.lesson_progress
  add column last_heartbeat_at timestamp with time zone;

update public.lesson_progress
set
  watch_time_seconds = greatest(coalesce(watch_time_seconds, 0), 0),
  last_position_seconds = greatest(coalesce(last_position_seconds, 0), 0),
  max_position_reached_seconds = greatest(coalesce(max_position_reached_seconds, 0), 0);

alter table public.lesson_progress
  alter column watch_time_seconds set default 0,
  alter column watch_time_seconds set not null,
  alter column last_position_seconds set default 0,
  alter column last_position_seconds set not null,
  alter column max_position_reached_seconds set default 0,
  alter column max_position_reached_seconds set not null;

alter table public.lesson_progress
  add constraint lesson_progress_watch_time_nonnegative
    check (watch_time_seconds >= 0),
  add constraint lesson_progress_last_position_nonnegative
    check (last_position_seconds >= 0),
  add constraint lesson_progress_max_position_nonnegative
    check (max_position_reached_seconds >= 0);

alter table public.lessons
  add constraint lessons_duration_positive
    check (duration_seconds is null or duration_seconds > 0);

create index lesson_progress_lesson_idx
  on public.lesson_progress (lesson_id);

drop policy if exists progress_insert_own on public.lesson_progress;
drop policy if exists progress_update_own on public.lesson_progress;
drop policy if exists progress_read_own on public.lesson_progress;
drop policy if exists progress_admin_read on public.lesson_progress;

create policy progress_select_authenticated
  on public.lesson_progress
  as permissive
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select public.is_admin())
  );

revoke all on table public.lesson_progress from anon;
revoke insert, update, delete on table public.lesson_progress from authenticated;
grant select on table public.lesson_progress to authenticated;
grant all on table public.lesson_progress to service_role;
