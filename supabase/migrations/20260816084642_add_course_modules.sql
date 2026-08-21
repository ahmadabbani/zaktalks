create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null,
  title text not null,
  description text,
  display_order integer not null default 1,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint course_modules_course_id_fkey
    foreign key (course_id) references public.courses(id) on delete cascade,
  constraint course_modules_title_check
    check (char_length(btrim(title)) between 1 and 120),
  constraint course_modules_display_order_check
    check (display_order > 0),
  constraint course_modules_id_course_id_key
    unique (id, course_id)
);

create index course_modules_course_order_idx
  on public.course_modules (course_id, display_order);

alter table public.lessons
  add column module_id uuid;

-- Preserve every existing lesson and its order by placing each current
-- course curriculum into an initial module. Admins can reorganize it later.
insert into public.course_modules (course_id, title, display_order)
select distinct lessons.course_id, 'Module 01', 1
from public.lessons;

update public.lessons
set module_id = course_modules.id
from public.course_modules
where course_modules.course_id = lessons.course_id
  and course_modules.display_order = 1
  and course_modules.title = 'Module 01';

alter table public.lessons
  alter column module_id set not null,
  add constraint lessons_module_course_fkey
    foreign key (module_id, course_id)
    references public.course_modules(id, course_id)
    on delete restrict;

create index lessons_module_order_idx
  on public.lessons (module_id, display_order);

alter table public.course_modules enable row level security;

create policy course_modules_admin_all
  on public.course_modules
  as permissive
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy course_modules_public_read
  on public.course_modules
  as permissive
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.courses
      where courses.id = course_modules.course_id
        and courses.is_published = true
        and courses.deleted_at is null
    )
  );

grant select on table public.course_modules to anon;
grant select, insert, update, delete on table public.course_modules to authenticated;
grant all privileges on table public.course_modules to service_role;
