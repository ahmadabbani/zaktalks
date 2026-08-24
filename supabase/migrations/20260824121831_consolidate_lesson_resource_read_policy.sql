begin;

drop policy if exists "Enrolled learners read lesson resources"
on public.lesson_resources;

drop policy if exists "Admins read lesson resources"
on public.lesson_resources;

create policy "Authorized users read lesson resources"
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
    where lesson.id = lesson_resources.lesson_id
      and enrollment.user_id = (select auth.uid())
      and enrollment.payment_status = 'completed'
  )
);

commit;
