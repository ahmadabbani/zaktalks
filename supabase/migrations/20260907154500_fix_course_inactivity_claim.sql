begin;

-- Use a SQL function so RETURNS TABLE output names cannot be confused with
-- notification columns by PL/pgSQL name resolution.
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
language sql
security invoker
set search_path = ''
as $function$
  with settings as (
    select
      clock_timestamp() as lease_at,
      least(greatest(coalesce(p_inactivity_hours, 12), 1), 8760) as inactivity_hours,
      least(greatest(coalesce(p_limit, 50), 1), 100) as batch_limit,
      least(greatest(coalesce(p_stale_seconds, 900), 60), 86400) as stale_seconds
  ),
  curriculum as (
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
    cross join settings
    where summary.total_units > 0
      and summary.completed_units < summary.total_units
      and greatest(
        enrollment.enrolled_at,
        coalesce(activity.last_activity_at, enrollment.enrolled_at),
        coalesce(summary.progress_activity_at, enrollment.enrolled_at)
      ) <= now() - (settings.inactivity_hours * interval '1 hour')
    order by
      greatest(
        enrollment.enrolled_at,
        coalesce(activity.last_activity_at, enrollment.enrolled_at),
        coalesce(summary.progress_activity_at, enrollment.enrolled_at)
      ),
      enrollment.enrollment_id
    limit (select batch_limit from settings)
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
    cross join settings
    where notification.sent_at is null
      and (
        notification.claimed_at is null
        or notification.claimed_at <= now() - (settings.stale_seconds * interval '1 second')
      )
    order by candidate.activity_at, notification.id
    for update of notification skip locked
  ),
  claimed as (
    update public.course_inactivity_notifications as notification
    set claimed_at = settings.lease_at,
        attempts = notification.attempts + 1,
        last_error = null,
        updated_at = now()
    from claimable
    cross join settings
    where notification.id = claimable.id
    returning
      notification.id,
      notification.enrollment_id,
      notification.activity_at,
      notification.claimed_at
  )
  select
    claimed.id,
    claimed.claimed_at,
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
$function$;

revoke all on function public.claim_course_inactivity_reminders(integer, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_course_inactivity_reminders(integer, integer, integer)
  to service_role;

commit;
