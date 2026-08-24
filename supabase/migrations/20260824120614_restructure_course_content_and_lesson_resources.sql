begin;

-- Keep the existing course content while giving each field its final meaning.
alter table public.courses
  rename column course_offers to what_youll_learn;

alter table public.courses
  rename column course_benefits to skills_youll_gain;

alter table public.courses
  rename column why_attend to details_to_know;

alter table public.courses
  alter column details_to_know type text
  using nullif(array_to_string(details_to_know, E'\n'), '');

alter table public.courses
  drop column the_problem,
  drop column the_shift;

comment on column public.courses.what_youll_learn is
  'Ordered learning outcomes displayed on the public course page.';
comment on column public.courses.skills_youll_gain is
  'Ordered skills learners can expect to develop.';
comment on column public.courses.details_to_know is
  'Plain-text practical details learners should know before enrolling.';

-- A lesson may have one optional resource. Keeping it in a separate table
-- prevents private resource metadata from inheriting the public lesson policy.
create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  resource_type text not null,
  text_content text,
  external_url text,
  storage_path text,
  original_file_name text,
  file_size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_resources_type_check
    check (resource_type in ('text', 'pdf', 'link')),
  constraint lesson_resources_file_size_check
    check (file_size_bytes is null or file_size_bytes >= 0),
  constraint lesson_resources_payload_check
    check (
      (resource_type = 'text'
        and nullif(btrim(text_content), '') is not null
        and external_url is null
        and storage_path is null
        and original_file_name is null
        and file_size_bytes is null)
      or
      (resource_type = 'link'
        and text_content is null
        and nullif(btrim(external_url), '') is not null
        and storage_path is null
        and original_file_name is null
        and file_size_bytes is null)
      or
      (resource_type = 'pdf'
        and text_content is null
        and external_url is null
        and nullif(btrim(storage_path), '') is not null
        and nullif(btrim(original_file_name), '') is not null
        and file_size_bytes is not null)
    )
);

comment on table public.lesson_resources is
  'Optional private text, link, or PDF resource attached to one lesson.';

alter table public.lesson_resources enable row level security;

revoke all on table public.lesson_resources from anon, authenticated;
grant select on table public.lesson_resources to authenticated;
grant all on table public.lesson_resources to service_role;

create policy "Enrolled learners read lesson resources"
on public.lesson_resources
for select
to authenticated
using (
  exists (
    select 1
    from public.lessons lesson
    join public.user_enrollments enrollment
      on enrollment.course_id = lesson.course_id
    where lesson.id = lesson_resources.lesson_id
      and enrollment.user_id = (select auth.uid())
      and enrollment.payment_status = 'completed'
  )
);

create policy "Admins read lesson resources"
on public.lesson_resources
for select
to authenticated
using (
  exists (
    select 1
    from public.users app_user
    where app_user.id = (select auth.uid())
      and app_user.role = 'admin'
  )
);

-- Administrative and creator writes go through permission-checked server
-- actions using the service role. No browser role receives write access.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'lesson-resources',
  'lesson-resources',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Enrolled learners read lesson resource PDFs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lesson-resources'
  and exists (
    select 1
    from public.user_enrollments enrollment
    where enrollment.user_id = (select auth.uid())
      and enrollment.payment_status = 'completed'
      and enrollment.course_id::text = (storage.foldername(name))[1]
  )
);

create policy "Admins manage lesson resource PDFs"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'lesson-resources'
  and exists (
    select 1
    from public.users app_user
    where app_user.id = (select auth.uid())
      and app_user.role = 'admin'
  )
)
with check (
  bucket_id = 'lesson-resources'
  and exists (
    select 1
    from public.users app_user
    where app_user.id = (select auth.uid())
      and app_user.role = 'admin'
  )
);

commit;
