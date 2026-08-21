alter table public.lesson_progress
  add column playback_status text not null default 'inactive',
  add column last_accessed_at timestamp with time zone;

update public.lesson_progress
set last_accessed_at = coalesce(updated_at, completed_at, started_at, now());

alter table public.lesson_progress
  alter column last_accessed_at set default now(),
  alter column last_accessed_at set not null,
  add constraint lesson_progress_playback_status_check
    check (playback_status in ('inactive', 'playing', 'paused', 'ended'));

create index lesson_progress_last_accessed_idx
  on public.lesson_progress (last_accessed_at desc);
