begin;

create unique index if not exists lesson_resources_storage_path_uidx
  on public.lesson_resources (storage_path)
  where storage_path is not null;

drop policy if exists "Authorized users read lesson resources"
on public.lesson_resources;

create policy "Authorized users read completed lesson resources"
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
  or exists (
    select 1
    from public.lessons lesson
    join public.user_enrollments enrollment
      on enrollment.course_id = lesson.course_id
    join public.lesson_progress progress
      on progress.lesson_id = lesson.id
     and progress.user_id = enrollment.user_id
    where lesson.id = lesson_resources.lesson_id
      and enrollment.user_id = (select auth.uid())
      and enrollment.payment_status = 'completed'
      and progress.is_completed = true
  )
);

drop policy if exists "Enrolled learners read lesson resource PDFs"
on storage.objects;

create policy "Completed learners read lesson resource PDFs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lesson-resources'
  and exists (
    select 1
    from public.lesson_resources resource
    join public.lessons lesson
      on lesson.id = resource.lesson_id
    join public.user_enrollments enrollment
      on enrollment.course_id = lesson.course_id
    join public.lesson_progress progress
      on progress.lesson_id = lesson.id
     and progress.user_id = enrollment.user_id
    where resource.resource_type = 'pdf'
      and resource.storage_path = storage.objects.name
      and enrollment.user_id = (select auth.uid())
      and enrollment.payment_status = 'completed'
      and progress.is_completed = true
  )
);

commit;
