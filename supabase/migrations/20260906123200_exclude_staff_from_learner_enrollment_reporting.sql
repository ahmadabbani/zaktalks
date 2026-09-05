-- Staff test access is intentionally absent from learner enrollment reporting.
-- It remains available to the course player, but cannot inflate enrollment
-- summaries, trends, course mixes, or learner counts.
create or replace function public.admin_enrollments_dashboard(
  p_search text default null,
  p_status text default 'all',
  p_course_id uuid default null,
  p_source text default 'all',
  p_range text default '90',
  p_sort text default 'newest',
  p_page_size integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 25), 50));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_range_start timestamp with time zone;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if coalesce(p_status, 'all') not in ('all', 'completed', 'pending', 'failed', 'refunded')
    or coalesce(p_source, 'all') not in ('all', 'guest', 'account', 'direct')
    or coalesce(p_range, '90') not in ('30', '90', '365', 'all')
    or coalesce(p_sort, 'newest') not in ('newest', 'oldest', 'name', 'course', 'status') then
    raise exception 'Invalid enrollment filter' using errcode = '22023';
  end if;

  v_range_start := case coalesce(p_range, '90')
    when '30' then now() - interval '30 days'
    when '90' then now() - interval '90 days'
    when '365' then now() - interval '365 days'
    else null
  end;

  with enrollment_base as (
    select
      enrollment.id,
      enrollment.user_id,
      enrollment.course_id,
      enrollment.payment_status::text as access_status,
      enrollment.created_at,
      enrollment.updated_at,
      profile.email,
      profile.first_name,
      profile.last_name,
      profile.email_verified,
      profile.password_set,
      profile.avatar_url,
      course.title as course_title,
      course.slug as course_slug,
      course.is_published as course_published,
      case
        when checkout.password_setup_email_sent_at is not null then 'guest'
        when checkout.id is not null then 'account'
        else 'direct'
      end as access_source,
      coalesce(
        nullif(lower(trim(concat_ws(' ', profile.first_name, profile.last_name))), ''),
        lower(profile.email)
      ) as sort_name
    from public.user_enrollments as enrollment
    join public.users as profile on profile.id = enrollment.user_id
    join public.courses as course on course.id = enrollment.course_id
    left join lateral (
      select session.id, session.password_setup_email_sent_at
      from public.checkout_sessions as session
      where session.enrollment_id = enrollment.id
      order by session.created_at desc
      limit 1
    ) as checkout on true
    where enrollment.payment_status <> 'staff'::public.payment_status
  ),
  filtered as (
    select base.*
    from enrollment_base as base
    where (v_range_start is null or base.created_at >= v_range_start)
      and (
        nullif(trim(coalesce(p_search, '')), '') is null
        or base.email ilike '%' || trim(p_search) || '%'
        or concat_ws(' ', base.first_name, base.last_name) ilike '%' || trim(p_search) || '%'
        or base.course_title ilike '%' || trim(p_search) || '%'
      )
      and (coalesce(p_status, 'all') = 'all' or base.access_status = p_status)
      and (p_course_id is null or base.course_id = p_course_id)
      and (coalesce(p_source, 'all') = 'all' or base.access_source = p_source)
  ),
  ordered as (
    select filtered.*
    from filtered
    order by
      case when p_sort = 'newest' then created_at end desc,
      case when p_sort = 'oldest' then created_at end asc,
      case when p_sort = 'name' then sort_name end asc,
      case when p_sort = 'course' then lower(course_title) end asc,
      case when p_sort = 'status' then access_status end asc,
      case when p_sort in ('newest', 'status') then id end desc,
      case when p_sort in ('oldest', 'name', 'course') then id end asc
    offset v_offset
    limit v_page_size
  ),
  trend as (
    select
      date_trunc(
        case
          when p_range = '30' then 'day'
          when p_range = '90' then 'week'
          when p_range = 'all' then 'year'
          else 'month'
        end,
        created_at
      ) as bucket,
      count(*)::integer as total,
      count(*) filter (where access_status = 'completed')::integer as active
    from filtered
    group by 1
    order by 1
  ),
  course_mix as (
    select
      course_id,
      course_title,
      count(*)::integer as total,
      count(*) filter (where access_status = 'completed')::integer as active,
      count(distinct user_id) filter (where access_status = 'completed')::integer as learners
    from filtered
    group by course_id, course_title
    order by active desc, course_title asc
  ),
  summary as (
    select
      count(*)::integer as total,
      count(*) filter (where access_status = 'completed')::integer as active,
      count(distinct user_id) filter (where access_status = 'completed')::integer as learners,
      count(*) filter (where access_status = 'pending')::integer as pending,
      count(*) filter (where access_status = 'failed')::integer as failed,
      count(*) filter (where access_status = 'refunded')::integer as revoked
    from filtered
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(row_data)) from ordered as row_data), '[]'::jsonb),
    'total_count', (select total from summary),
    'summary', jsonb_build_object(
      'total', (select total from summary),
      'active', (select active from summary),
      'learners', (select learners from summary),
      'pending', (select pending from summary),
      'failed', (select failed from summary),
      'revoked', (select revoked from summary)
    ),
    'trend', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket, 'total', total, 'active', active) order by bucket)
      from trend
    ), '[]'::jsonb),
    'course_mix', coalesce((
      select jsonb_agg(jsonb_build_object(
        'course_id', course_id,
        'course_title', course_title,
        'total', total,
        'active', active,
        'learners', learners
      ) order by active desc, course_title)
      from course_mix
    ), '[]'::jsonb),
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object('id', course.id, 'title', course.title) order by course.title)
      from public.courses as course
      where course.deleted_at is null
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$function$;

revoke all on function public.admin_enrollments_dashboard(text, text, uuid, text, text, text, integer, integer)
  from public, anon;
grant execute on function public.admin_enrollments_dashboard(text, text, uuid, text, text, text, integer, integer)
  to authenticated, service_role;

comment on function public.admin_enrollments_dashboard(text, text, uuid, text, text, text, integer, integer) is
  'Admin-only paid learner enrollment reporting; internal staff testing access is excluded.';
