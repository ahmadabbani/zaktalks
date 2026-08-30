-- Paid lesson content must never be readable through the anonymous Data API.
-- Public curriculum pages fetch an explicit, non-sensitive projection from
-- server-only code instead.
drop policy if exists lessons_public_read on public.lessons;
drop policy if exists lessons_paid_enrollment_read on public.lessons;

create policy lessons_paid_enrollment_read
on public.lessons
for select
to authenticated
using (
  exists (
    select 1
    from public.user_enrollments as enrollment
    where enrollment.user_id = (select auth.uid())
      and enrollment.course_id = lessons.course_id
      and enrollment.payment_status = 'completed'::public.payment_status
  )
);

-- Anonymous visitors receive curriculum metadata from the application server,
-- not direct access to the table that also contains video URLs and assessment
-- identifiers.
revoke all privileges on table public.lessons from anon;

-- Preserve the existing authenticated learner and server-side staff paths.
grant select on table public.lessons to authenticated;
grant all privileges on table public.lessons to service_role;
