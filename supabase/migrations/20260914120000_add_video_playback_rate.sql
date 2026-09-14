-- The previous checkpoint's rate is used to validate elapsed real time before
-- a new rate is saved. This allows standard YouTube speed changes without
-- weakening the existing no-forward-seek protection.
alter table public.lesson_progress
  add column playback_rate numeric(3,2) not null default 1;

alter table public.lesson_progress
  add constraint lesson_progress_playback_rate_check
    check (playback_rate in (0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00));
