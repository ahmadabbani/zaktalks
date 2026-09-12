begin;

alter table public.course_reviews
  add column if not exists is_published boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists moderated_by uuid references public.users(id) on delete set null;

create index if not exists course_reviews_publication_idx
  on public.course_reviews (is_published, created_at desc);

comment on column public.course_reviews.is_published is
  'Only administrator-approved reviews may be displayed publicly.';

-- Learners retain read access only to their own reviews. Moderation writes use
-- the server-side service role after a protected admin-role check.

commit;
