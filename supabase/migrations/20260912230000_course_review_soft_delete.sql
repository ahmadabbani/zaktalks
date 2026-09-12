begin;

alter table public.course_reviews
  add column if not exists deleted_at timestamptz;

create index if not exists course_reviews_active_created_idx
  on public.course_reviews (created_at desc)
  where deleted_at is null;

comment on column public.course_reviews.deleted_at is
  'Admin-removed reviews remain recorded to prevent duplicate resubmission.';

commit;
