begin;

-- The role is read from the protected public.users profile associated with the
-- authenticated Supabase user. Browser values and user-editable metadata are
-- never accepted as an authorization source.
create or replace function public.is_staff_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.users as profile
    where profile.id = (select auth.uid())
      and profile.role in ('admin', 'creator')
  );
$function$;

revoke all on function public.is_staff_account() from public, anon;
grant execute on function public.is_staff_account() to authenticated, service_role;

-- Staff access uses a dedicated enrollment status. This preserves the existing
-- enrollment foreign keys required by progress and assessment history without
-- pretending that a payment occurred or marking a course as completed.
create or replace function public.sync_staff_course_access_for_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.role in ('admin', 'creator') then
    insert into public.user_enrollments (
      user_id,
      course_id,
      payment_status,
      amount_paid_cents,
      original_price_cents,
      discount_applied_cents,
      points_earned,
      first_purchase_discount_applied,
      completed_at,
      created_at,
      updated_at
    )
    select
      new.id,
      course.id,
      'staff'::public.payment_status,
      0,
      0,
      0,
      0,
      false,
      null,
      now(),
      now()
    from public.courses as course
    where course.deleted_at is null
    on conflict on constraint user_enrollments_user_id_course_id_key do nothing;
  elsif tg_op = 'UPDATE' and old.role in ('admin', 'creator') then
    delete from public.user_enrollments
    where user_id = new.id
      and payment_status = 'staff'::public.payment_status;
  end if;

  return new;
end;
$function$;

revoke all on function public.sync_staff_course_access_for_user() from public, anon, authenticated;

drop trigger if exists sync_staff_course_access_after_user_role on public.users;
create trigger sync_staff_course_access_after_user_role
after insert or update of role on public.users
for each row
execute function public.sync_staff_course_access_for_user();

create or replace function public.sync_staff_course_access_for_course()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.deleted_at is null then
    insert into public.user_enrollments (
      user_id,
      course_id,
      payment_status,
      amount_paid_cents,
      original_price_cents,
      discount_applied_cents,
      points_earned,
      first_purchase_discount_applied,
      completed_at,
      created_at,
      updated_at
    )
    select
      profile.id,
      new.id,
      'staff'::public.payment_status,
      0,
      0,
      0,
      0,
      false,
      null,
      now(),
      now()
    from public.users as profile
    where profile.role in ('admin', 'creator')
    on conflict on constraint user_enrollments_user_id_course_id_key do nothing;
  end if;

  return new;
end;
$function$;

revoke all on function public.sync_staff_course_access_for_course() from public, anon, authenticated;

drop trigger if exists sync_staff_course_access_after_course_write on public.courses;
create trigger sync_staff_course_access_after_course_write
after insert or update of deleted_at on public.courses
for each row
execute function public.sync_staff_course_access_for_course();

-- Backfill every current staff account across every current course. Existing
-- paid enrollments win the unique conflict and are never replaced.
insert into public.user_enrollments (
  user_id,
  course_id,
  payment_status,
  amount_paid_cents,
  original_price_cents,
  discount_applied_cents,
  points_earned,
  first_purchase_discount_applied,
  completed_at,
  created_at,
  updated_at
)
select
  profile.id,
  course.id,
  'staff'::public.payment_status,
  0,
  0,
  0,
  0,
  false,
  null,
  now(),
  now()
from public.users as profile
cross join public.courses as course
where profile.role in ('admin', 'creator')
  and course.deleted_at is null
on conflict on constraint user_enrollments_user_id_course_id_key do nothing;

-- Staff may read all course records for testing, including unpublished courses.
drop policy if exists courses_staff_read on public.courses;
create policy courses_staff_read
on public.courses
for select
to authenticated
using ((select public.is_staff_account()));

drop policy if exists course_faqs_staff_read on public.course_faqs;
create policy course_faqs_staff_read
on public.course_faqs
for select
to authenticated
using ((select public.is_staff_account()));

drop policy if exists course_images_staff_read on public.course_images;
create policy course_images_staff_read
on public.course_images
for select
to authenticated
using ((select public.is_staff_account()));

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
      and (
        enrollment.payment_status = 'completed'::public.payment_status
        or (
          enrollment.payment_status = 'staff'::public.payment_status
          and (select public.is_staff_account())
        )
      )
  )
);

drop policy if exists "Authorized users read completed lesson resources"
on public.lesson_resources;

create policy "Authorized users read completed lesson resources"
on public.lesson_resources
for select
to authenticated
using (
  exists (
    select 1
    from public.users as app_user
    where app_user.id = (select auth.uid())
      and app_user.role = 'admin'
  )
  or exists (
    select 1
    from public.lessons as lesson
    join public.user_enrollments as enrollment
      on enrollment.course_id = lesson.course_id
    join public.lesson_progress as progress
      on progress.lesson_id = lesson.id
     and progress.user_id = enrollment.user_id
    where lesson.id = lesson_resources.lesson_id
      and enrollment.user_id = (select auth.uid())
      and (
        enrollment.payment_status = 'completed'::public.payment_status
        or (
          enrollment.payment_status = 'staff'::public.payment_status
          and (select public.is_staff_account())
        )
      )
      and progress.is_completed = true
  )
);

drop policy if exists "Completed learners read lesson resource PDFs"
on storage.objects;

create policy "Completed learners read lesson resource PDFs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lesson-resources'
  and exists (
    select 1
    from public.lesson_resources as resource
    join public.lessons as lesson
      on lesson.id = resource.lesson_id
    join public.user_enrollments as enrollment
      on enrollment.course_id = lesson.course_id
    join public.lesson_progress as progress
      on progress.lesson_id = lesson.id
     and progress.user_id = enrollment.user_id
    where resource.resource_type = 'pdf'
      and resource.storage_path = storage.objects.name
      and enrollment.user_id = (select auth.uid())
      and (
        enrollment.payment_status = 'completed'::public.payment_status
        or (
          enrollment.payment_status = 'staff'::public.payment_status
          and (select public.is_staff_account())
        )
      )
      and progress.is_completed = true
  )
);

create or replace function public.record_internal_assessment_attempt(
  p_attempt_id uuid,
  p_user_id uuid,
  p_lesson_id uuid,
  p_enrollment_id uuid,
  p_assessment_key text,
  p_assessment_type text,
  p_score_value numeric,
  p_score_max numeric,
  p_score_percent numeric,
  p_result_label text default null,
  p_score_details jsonb default '{}'::jsonb
)
returns table(attempt_id uuid, attempt_number integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_lesson public.lessons%rowtype;
  v_enrollment public.user_enrollments%rowtype;
  v_existing public.assessment_attempts%rowtype;
  v_attempt_number integer;
  v_now timestamptz := now();
begin
  if p_attempt_id is null or p_user_id is null or p_lesson_id is null or p_enrollment_id is null then
    raise exception 'Assessment attempt context is incomplete.';
  end if;

  if p_score_value < 0 or p_score_max <= 0 or p_score_percent < 0 or p_score_percent > 100 then
    raise exception 'Assessment score is invalid.';
  end if;

  if p_score_details is null or jsonb_typeof(p_score_details) <> 'object' then
    raise exception 'Assessment score details must be an object.';
  end if;

  select * into v_lesson
  from public.lessons
  where id = p_lesson_id
    and type = 'assessment'::public.lesson_type;

  if not found or v_lesson.assessment_key is distinct from p_assessment_key then
    raise exception 'Assessment lesson was not found.';
  end if;

  select * into v_enrollment
  from public.user_enrollments
  where id = p_enrollment_id
    and user_id = p_user_id
    and course_id = v_lesson.course_id
    and (
      payment_status = 'completed'::public.payment_status
      or (
        payment_status = 'staff'::public.payment_status
        and exists (
          select 1
          from public.users as profile
          where profile.id = p_user_id
            and profile.role in ('admin', 'creator')
        )
      )
    );

  if not found then
    raise exception 'Active course access was not found.';
  end if;

  select * into v_existing
  from public.assessment_attempts
  where id = p_attempt_id;

  if found then
    if v_existing.user_id <> p_user_id or v_existing.lesson_id <> p_lesson_id then
      raise exception 'Assessment attempt identifier is already in use.';
    end if;

    return query select v_existing.id, v_existing.attempt_number;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text || ':' || p_lesson_id::text, 0)
  );

  select * into v_existing
  from public.assessment_attempts
  where id = p_attempt_id;

  if found then
    return query select v_existing.id, v_existing.attempt_number;
    return;
  end if;

  select coalesce(max(item.attempt_number), 0) + 1
  into v_attempt_number
  from public.assessment_attempts as item
  where item.user_id = p_user_id
    and item.lesson_id = p_lesson_id;

  insert into public.assessment_attempts (
    id, user_id, enrollment_id, course_id, module_id, lesson_id,
    assessment_key, assessment_type, attempt_number, score_value, score_max,
    score_percent, result_label, score_details, completed_at, created_at
  ) values (
    p_attempt_id, p_user_id, v_enrollment.id, v_lesson.course_id,
    v_lesson.module_id, v_lesson.id, v_lesson.assessment_key,
    p_assessment_type, v_attempt_number, round(p_score_value, 2),
    round(p_score_max, 2), round(p_score_percent, 2),
    nullif(btrim(p_result_label), ''), p_score_details, v_now, v_now
  );

  insert into public.lesson_progress (
    user_id, lesson_id, enrollment_id, is_completed, watch_time_seconds,
    last_position_seconds, max_position_reached_seconds, score, attempts,
    completed_at, updated_at, playback_status, last_accessed_at,
    last_heartbeat_at
  ) values (
    p_user_id, v_lesson.id, v_enrollment.id, true, 0, 0, 0,
    round(p_score_percent)::integer, v_attempt_number, v_now, v_now,
    'inactive', v_now, null
  )
  on conflict (user_id, lesson_id) do update set
    enrollment_id = excluded.enrollment_id,
    is_completed = true,
    score = excluded.score,
    attempts = greatest(public.lesson_progress.attempts, excluded.attempts),
    completed_at = coalesce(public.lesson_progress.completed_at, excluded.completed_at),
    updated_at = excluded.updated_at,
    playback_status = 'inactive',
    last_accessed_at = excluded.last_accessed_at,
    last_heartbeat_at = null;

  return query select p_attempt_id, v_attempt_number;
end;
$function$;

revoke all on function public.record_internal_assessment_attempt(
  uuid, uuid, uuid, uuid, text, text, numeric, numeric, numeric, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.record_internal_assessment_attempt(
  uuid, uuid, uuid, uuid, text, text, numeric, numeric, numeric, text, jsonb
) to service_role;

commit;
