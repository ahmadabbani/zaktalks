begin;

-- A dedicated activity signal for course reminders. Learning progress remains
-- the source of truth for playback, completion, unlocking, and analytics.
create table public.course_enrollment_activity (
  enrollment_id uuid primary key references public.user_enrollments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  last_lesson_id uuid references public.lessons(id) on delete set null,
  last_activity_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint course_enrollment_activity_user_course_key unique (user_id, course_id)
);

create index course_enrollment_activity_last_activity_idx
  on public.course_enrollment_activity (last_activity_at, enrollment_id);

alter table public.course_enrollment_activity enable row level security;

revoke all on table public.course_enrollment_activity from public, anon, authenticated;
grant select, insert, update, delete on table public.course_enrollment_activity to service_role;

comment on table public.course_enrollment_activity is
  'Reminder-only per-enrollment activity. It does not affect learning progress, completion, unlocking, or analytics.';

-- Course reminders are optional and can be managed from the learner profile.
alter table public.users
  add column if not exists course_reminders_enabled boolean not null default true;

-- Securely refresh activity for the signed-in learner. Staff test enrollments
-- and browser-provided user/course identifiers are never accepted.
create or replace function public.touch_course_enrollment_activity(p_lesson_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_enrollment_id uuid;
  v_course_id uuid;
  v_activity_at timestamp with time zone := clock_timestamp();
begin
  if v_user_id is null or p_lesson_id is null then
    return false;
  end if;

  select enrollment.id, lesson.course_id
  into v_enrollment_id, v_course_id
  from public.lessons as lesson
  join public.user_enrollments as enrollment
    on enrollment.course_id = lesson.course_id
   and enrollment.user_id = v_user_id
   and enrollment.payment_status = 'completed'::public.payment_status
  join public.users as profile
    on profile.id = enrollment.user_id
   and profile.role = 'user'
  join public.courses as course
    on course.id = lesson.course_id
   and course.deleted_at is null
  where lesson.id = p_lesson_id
  limit 1;

  if v_enrollment_id is null then
    return false;
  end if;

  insert into public.course_enrollment_activity (
    enrollment_id,
    user_id,
    course_id,
    last_lesson_id,
    last_activity_at,
    created_at,
    updated_at
  ) values (
    v_enrollment_id,
    v_user_id,
    v_course_id,
    p_lesson_id,
    v_activity_at,
    v_activity_at,
    v_activity_at
  )
  on conflict (enrollment_id) do update set
    last_lesson_id = case
      when excluded.last_activity_at >= public.course_enrollment_activity.last_activity_at
        then excluded.last_lesson_id
      else public.course_enrollment_activity.last_lesson_id
    end,
    last_activity_at = greatest(
      public.course_enrollment_activity.last_activity_at,
      excluded.last_activity_at
    ),
    updated_at = greatest(
      public.course_enrollment_activity.updated_at,
      excluded.updated_at
    );

  return true;
end;
$function$;

revoke all on function public.touch_course_enrollment_activity(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.touch_course_enrollment_activity(uuid)
  to authenticated, service_role;

-- One durable row per inactivity episode. A new learner activity timestamp
-- creates a new episode; continuous inactivity can therefore send only once.
create table public.course_inactivity_notifications (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.user_enrollments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  activity_at timestamp with time zone not null,
  claimed_at timestamp with time zone,
  sent_at timestamp with time zone,
  resend_email_id text,
  attempts integer not null default 0,
  last_error text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint course_inactivity_notifications_episode_key unique (enrollment_id, activity_at),
  constraint course_inactivity_notifications_attempts_check check (attempts >= 0)
);

create index course_inactivity_notifications_pending_idx
  on public.course_inactivity_notifications (activity_at, claimed_at)
  where sent_at is null;

alter table public.course_inactivity_notifications enable row level security;

revoke all on table public.course_inactivity_notifications from public, anon, authenticated;
grant select, insert, update, delete on table public.course_inactivity_notifications to service_role;

comment on table public.course_inactivity_notifications is
  'Idempotent delivery records for learner course-inactivity reminder episodes.';

-- Existing paid learners receive a full grace period after this feature is
-- deployed, preventing an unexpected reminder burst from historical activity.
insert into public.course_enrollment_activity (
  enrollment_id,
  user_id,
  course_id,
  last_lesson_id,
  last_activity_at,
  created_at,
  updated_at
)
select
  enrollment.id,
  enrollment.user_id,
  enrollment.course_id,
  latest_progress.lesson_id,
  now(),
  now(),
  now()
from public.user_enrollments as enrollment
join public.users as profile
  on profile.id = enrollment.user_id
 and profile.role = 'user'
join public.courses as course
  on course.id = enrollment.course_id
 and course.deleted_at is null
left join lateral (
  select progress.lesson_id
  from public.lesson_progress as progress
  join public.lessons as lesson
    on lesson.id = progress.lesson_id
   and lesson.course_id = enrollment.course_id
  where progress.enrollment_id = enrollment.id
  order by coalesce(
    progress.last_accessed_at,
    progress.completed_at,
    progress.updated_at,
    progress.started_at
  ) desc nulls last,
  progress.id desc
  limit 1
) as latest_progress on true
where enrollment.payment_status = 'completed'::public.payment_status
on conflict (enrollment_id) do nothing;

-- Atomically identify and lease reminder work. Progress timestamps are folded
-- into the reminder signal so normal video pause/heartbeat/completion writes
-- remain useful without changing their existing implementation.
create or replace function public.claim_course_inactivity_reminders(
  p_inactivity_hours integer default 12,
  p_limit integer default 50,
  p_stale_seconds integer default 900
)
returns table (
  notification_id uuid,
  claimed_at timestamp with time zone,
  enrollment_id uuid,
  recipient_email text,
  recipient_first_name text,
  course_name text,
  course_slug text,
  last_lesson_name text,
  next_lesson_id uuid,
  next_lesson_name text,
  progress_percentage integer,
  activity_at timestamp with time zone
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_claimed_at timestamp with time zone := clock_timestamp();
  v_hours integer := least(greatest(coalesce(p_inactivity_hours, 12), 1), 8760);
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_stale_seconds integer := least(greatest(coalesce(p_stale_seconds, 900), 60), 86400);
begin
  return query
  with curriculum as (
    select
      lesson.id as lesson_id,
      lesson.course_id,
      lesson.title as lesson_title,
      row_number() over (
        partition by lesson.course_id
        order by
          case when lesson.is_course_introduction then 0 else 1 end,
          coalesce(module.display_order, -1),
          lesson.display_order,
          lesson.created_at,
          lesson.id
      ) as lesson_position
    from public.lessons as lesson
    left join public.course_modules as module on module.id = lesson.module_id
  ),
  eligible_enrollments as (
    select
      enrollment.id as enrollment_id,
      enrollment.user_id,
      enrollment.course_id,
      enrollment.created_at as enrolled_at,
      profile.email,
      profile.first_name,
      course.title as course_name,
      course.slug as course_slug
    from public.user_enrollments as enrollment
    join public.users as profile
      on profile.id = enrollment.user_id
     and profile.role = 'user'
     and profile.course_reminders_enabled = true
     and nullif(btrim(profile.email), '') is not null
    join public.courses as course
      on course.id = enrollment.course_id
     and course.deleted_at is null
    where enrollment.payment_status = 'completed'::public.payment_status
  ),
  progress_summary as (
    select
      enrollment.enrollment_id,
      count(curriculum.lesson_id)::integer as total_units,
      count(curriculum.lesson_id) filter (where progress.is_completed = true)::integer as completed_units,
      max(coalesce(
        progress.last_accessed_at,
        progress.completed_at,
        progress.updated_at,
        progress.started_at
      )) as progress_activity_at
    from eligible_enrollments as enrollment
    join curriculum on curriculum.course_id = enrollment.course_id
    left join public.lesson_progress as progress
      on progress.enrollment_id = enrollment.enrollment_id
     and progress.lesson_id = curriculum.lesson_id
    group by enrollment.enrollment_id
  ),
  latest_progress as (
    select distinct on (progress.enrollment_id)
      progress.enrollment_id,
      progress.lesson_id,
      curriculum.lesson_title,
      coalesce(
        progress.last_accessed_at,
        progress.completed_at,
        progress.updated_at,
        progress.started_at
      ) as progress_activity_at
    from public.lesson_progress as progress
    join eligible_enrollments as enrollment
      on enrollment.enrollment_id = progress.enrollment_id
    join curriculum
      on curriculum.lesson_id = progress.lesson_id
     and curriculum.course_id = enrollment.course_id
    order by
      progress.enrollment_id,
      coalesce(
        progress.last_accessed_at,
        progress.completed_at,
        progress.updated_at,
        progress.started_at
      ) desc nulls last,
      progress.id desc
  ),
  next_lessons as (
    select distinct on (enrollment.enrollment_id)
      enrollment.enrollment_id,
      curriculum.lesson_id,
      curriculum.lesson_title
    from eligible_enrollments as enrollment
    join curriculum on curriculum.course_id = enrollment.course_id
    left join public.lesson_progress as progress
      on progress.enrollment_id = enrollment.enrollment_id
     and progress.lesson_id = curriculum.lesson_id
    where coalesce(progress.is_completed, false) = false
    order by enrollment.enrollment_id, curriculum.lesson_position
  ),
  candidates as (
    select
      enrollment.enrollment_id,
      enrollment.user_id,
      enrollment.course_id,
      enrollment.email,
      enrollment.first_name,
      enrollment.course_name,
      enrollment.course_slug,
      coalesce(
        case
          when activity.last_activity_at >= coalesce(latest.progress_activity_at, '-infinity'::timestamp with time zone)
            then activity_lesson.title
          else latest.lesson_title
        end,
        next_lesson.lesson_title,
        'Your course introduction'
      ) as last_lesson_name,
      next_lesson.lesson_id as next_lesson_id,
      next_lesson.lesson_title as next_lesson_name,
      case
        when summary.total_units > 0
          then round((summary.completed_units::numeric * 100) / summary.total_units)::integer
        else 0
      end as progress_percentage,
      greatest(
        enrollment.enrolled_at,
        coalesce(activity.last_activity_at, enrollment.enrolled_at),
        coalesce(summary.progress_activity_at, enrollment.enrolled_at)
      ) as activity_at
    from eligible_enrollments as enrollment
    join progress_summary as summary on summary.enrollment_id = enrollment.enrollment_id
    join next_lessons as next_lesson on next_lesson.enrollment_id = enrollment.enrollment_id
    left join public.course_enrollment_activity as activity
      on activity.enrollment_id = enrollment.enrollment_id
    left join public.lessons as activity_lesson on activity_lesson.id = activity.last_lesson_id
    left join latest_progress as latest on latest.enrollment_id = enrollment.enrollment_id
    where summary.total_units > 0
      and summary.completed_units < summary.total_units
      and greatest(
        enrollment.enrolled_at,
        coalesce(activity.last_activity_at, enrollment.enrolled_at),
        coalesce(summary.progress_activity_at, enrollment.enrolled_at)
      ) <= now() - (v_hours * interval '1 hour')
    order by greatest(
      enrollment.enrolled_at,
      coalesce(activity.last_activity_at, enrollment.enrolled_at),
      coalesce(summary.progress_activity_at, enrollment.enrolled_at)
    ), enrollment.enrollment_id
    limit v_limit
  ),
  registered as (
    insert into public.course_inactivity_notifications (
      enrollment_id,
      user_id,
      course_id,
      activity_at,
      created_at,
      updated_at
    )
    select
      candidate.enrollment_id,
      candidate.user_id,
      candidate.course_id,
      candidate.activity_at,
      now(),
      now()
    from candidates as candidate
    on conflict on constraint course_inactivity_notifications_episode_key do nothing
    returning id
  ),
  claimable as (
    select notification.id
    from public.course_inactivity_notifications as notification
    join candidates as candidate
      on candidate.enrollment_id = notification.enrollment_id
     and candidate.activity_at = notification.activity_at
    where notification.sent_at is null
      and (
        notification.claimed_at is null
        or notification.claimed_at <= now() - (v_stale_seconds * interval '1 second')
      )
    order by candidate.activity_at, notification.id
    for update of notification skip locked
  ),
  claimed as (
    update public.course_inactivity_notifications as notification
    set claimed_at = v_claimed_at,
        attempts = notification.attempts + 1,
        last_error = null,
        updated_at = now()
    from claimable
    where notification.id = claimable.id
    returning notification.id, notification.enrollment_id, notification.activity_at
  )
  select
    claimed.id,
    v_claimed_at,
    candidate.enrollment_id,
    candidate.email,
    candidate.first_name,
    candidate.course_name,
    candidate.course_slug,
    candidate.last_lesson_name,
    candidate.next_lesson_id,
    candidate.next_lesson_name,
    candidate.progress_percentage,
    candidate.activity_at
  from claimed
  join candidates as candidate
    on candidate.enrollment_id = claimed.enrollment_id
   and candidate.activity_at = claimed.activity_at
  order by candidate.activity_at, claimed.id;
end;
$function$;

create or replace function public.course_inactivity_reminder_claim_is_current(
  p_notification_id uuid,
  p_claimed_at timestamp with time zone,
  p_inactivity_hours integer default 12
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  with notification_record as (
    select notification.*
    from public.course_inactivity_notifications as notification
    where notification.id = p_notification_id
      and notification.claimed_at = p_claimed_at
      and notification.sent_at is null
  ),
  current_state as (
    select
      notification.id,
      notification.activity_at,
      greatest(
        enrollment.created_at,
        coalesce(activity.last_activity_at, enrollment.created_at),
        coalesce(max(coalesce(
          progress.last_accessed_at,
          progress.completed_at,
          progress.updated_at,
          progress.started_at
        )), enrollment.created_at)
      ) as current_activity_at,
      count(lesson.id)::integer as total_units,
      count(lesson.id) filter (where progress.is_completed = true)::integer as completed_units
    from notification_record as notification
    join public.user_enrollments as enrollment
      on enrollment.id = notification.enrollment_id
     and enrollment.payment_status = 'completed'::public.payment_status
    join public.users as profile
      on profile.id = enrollment.user_id
     and profile.role = 'user'
     and profile.course_reminders_enabled = true
    join public.courses as course
      on course.id = enrollment.course_id
     and course.deleted_at is null
    join public.lessons as lesson on lesson.course_id = enrollment.course_id
    left join public.lesson_progress as progress
      on progress.enrollment_id = enrollment.id
     and progress.lesson_id = lesson.id
    left join public.course_enrollment_activity as activity
      on activity.enrollment_id = enrollment.id
    group by notification.id, notification.activity_at, enrollment.created_at, activity.last_activity_at
  )
  select exists (
    select 1
    from current_state
    where current_state.total_units > 0
      and current_state.completed_units < current_state.total_units
      and current_state.current_activity_at = current_state.activity_at
      and current_state.current_activity_at <= now() - (
        least(greatest(coalesce(p_inactivity_hours, 12), 1), 8760) * interval '1 hour'
      )
  );
$function$;

create or replace function public.record_course_inactivity_reminder_result(
  p_notification_id uuid,
  p_claimed_at timestamp with time zone,
  p_sent boolean,
  p_email_id text default null,
  p_error text default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_row_count integer := 0;
begin
  update public.course_inactivity_notifications
  set claimed_at = null,
      sent_at = case when p_sent then now() else sent_at end,
      resend_email_id = case when p_sent then p_email_id else resend_email_id end,
      last_error = case
        when p_sent then null
        else left(coalesce(p_error, 'Unknown email error'), 2000)
      end,
      updated_at = now()
  where id = p_notification_id
    and claimed_at = p_claimed_at
    and sent_at is null;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$function$;

revoke all on function public.claim_course_inactivity_reminders(integer, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_course_inactivity_reminders(integer, integer, integer)
  to service_role;

revoke all on function public.course_inactivity_reminder_claim_is_current(uuid, timestamp with time zone, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.course_inactivity_reminder_claim_is_current(uuid, timestamp with time zone, integer)
  to service_role;

revoke all on function public.record_course_inactivity_reminder_result(uuid, timestamp with time zone, boolean, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.record_course_inactivity_reminder_result(uuid, timestamp with time zone, boolean, text, text)
  to service_role;

commit;
