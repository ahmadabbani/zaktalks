begin;

alter table public.course_reviews
  add column if not exists is_test boolean not null default false;

comment on column public.course_reviews.is_test is
  'Marks local admin-preview submissions; public review queries must exclude these records.';

commit;
