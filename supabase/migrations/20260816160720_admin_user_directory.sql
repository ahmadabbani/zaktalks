create index if not exists users_created_at_id_idx
  on public.users (created_at desc, id);

create index if not exists user_enrollments_completed_user_idx
  on public.user_enrollments (user_id)
  where payment_status = 'completed';

create or replace function public.admin_user_directory(
  p_search text default null,
  p_segment text default 'all',
  p_verification text default 'all',
  p_password text default 'all',
  p_activity text default 'all',
  p_sort text default 'newest',
  p_page_size integer default 25,
  p_cursor_timestamp timestamp with time zone default null,
  p_cursor_text text default null,
  p_cursor_number bigint default null,
  p_cursor_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 25), 50));
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if coalesce(p_segment, 'all') not in ('all', 'registered', 'enrolled', 'admins')
    or coalesce(p_verification, 'all') not in ('all', 'verified', 'pending')
    or coalesce(p_password, 'all') not in ('all', 'ready', 'pending')
    or coalesce(p_activity, 'all') not in ('all', 'active_7', 'active_30', 'inactive_30', 'never')
    or coalesce(p_sort, 'newest') not in ('newest', 'oldest', 'name', 'points', 'activity') then
    raise exception 'Invalid directory filter' using errcode = '22023';
  end if;

  with enrollment_stats as (
    select
      ue.user_id,
      count(*) filter (where ue.payment_status = 'completed')::integer as enrollment_count,
      count(*) filter (where ue.payment_status = 'pending')::integer as pending_enrollment_count,
      count(*) filter (where ue.payment_status = 'completed' and ue.certificate_url is not null)::integer as certificate_count
    from public.user_enrollments ue
    group by ue.user_id
  ),
  progress_stats as (
    select
      lp.user_id,
      count(*)::integer as started_lessons,
      count(*) filter (where lp.is_completed)::integer as completed_lessons,
      coalesce(sum(lp.attempts), 0)::integer as assessment_attempts,
      round(avg(lp.score) filter (where lp.score is not null), 1) as average_score,
      coalesce(sum(lp.watch_time_seconds), 0)::bigint as watch_time_seconds,
      max(lp.last_accessed_at) as last_learning_activity
    from public.lesson_progress lp
    group by lp.user_id
  ),
  base as (
    select
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.avatar_url,
      u.role,
      u.points,
      u.email_verified,
      u.password_set,
      u.first_purchase_discount_used,
      u.created_at,
      u.updated_at,
      coalesce(nullif(lower(trim(concat_ws(' ', u.first_name, u.last_name))), ''), lower(u.email)) as sort_name,
      coalesce(es.enrollment_count, 0) as enrollment_count,
      coalesce(es.pending_enrollment_count, 0) as pending_enrollment_count,
      coalesce(es.certificate_count, 0) as certificate_count,
      coalesce(ps.started_lessons, 0) as started_lessons,
      coalesce(ps.completed_lessons, 0) as completed_lessons,
      coalesce(ps.assessment_attempts, 0) as assessment_attempts,
      ps.average_score,
      coalesce(ps.watch_time_seconds, 0) as watch_time_seconds,
      ps.last_learning_activity
    from public.users u
    left join enrollment_stats es on es.user_id = u.id
    left join progress_stats ps on ps.user_id = u.id
  ),
  filtered as (
    select *
    from base b
    where
      (
        nullif(trim(coalesce(p_search, '')), '') is null
        or b.email ilike '%' || trim(p_search) || '%'
        or concat_ws(' ', b.first_name, b.last_name) ilike '%' || trim(p_search) || '%'
      )
      and (
        coalesce(p_segment, 'all') = 'all'
        or (p_segment = 'registered' and b.role <> 'admin' and b.enrollment_count = 0)
        or (p_segment = 'enrolled' and b.enrollment_count > 0)
        or (p_segment = 'admins' and b.role = 'admin')
      )
      and (
        coalesce(p_verification, 'all') = 'all'
        or (p_verification = 'verified' and b.email_verified)
        or (p_verification = 'pending' and not b.email_verified)
      )
      and (
        coalesce(p_password, 'all') = 'all'
        or (p_password = 'ready' and b.password_set)
        or (p_password = 'pending' and not b.password_set)
      )
      and (
        coalesce(p_activity, 'all') = 'all'
        or (p_activity = 'active_7' and b.last_learning_activity >= now() - interval '7 days')
        or (p_activity = 'active_30' and b.last_learning_activity >= now() - interval '30 days')
        or (p_activity = 'inactive_30' and b.last_learning_activity < now() - interval '30 days')
        or (p_activity = 'never' and b.last_learning_activity is null)
      )
  ),
  cursor_filtered as (
    select *
    from filtered f
    where p_cursor_id is null
      or (p_sort = 'newest' and (f.created_at, f.id) < (p_cursor_timestamp, p_cursor_id))
      or (p_sort = 'oldest' and (f.created_at, f.id) > (p_cursor_timestamp, p_cursor_id))
      or (p_sort = 'name' and (f.sort_name, f.id) > (p_cursor_text, p_cursor_id))
      or (p_sort = 'points' and (f.points, f.id) < (p_cursor_number, p_cursor_id))
      or (p_sort = 'activity' and (coalesce(f.last_learning_activity, '-infinity'::timestamp with time zone), f.id) < (p_cursor_timestamp, p_cursor_id))
  ),
  page_rows as (
    select *
    from cursor_filtered
    order by
      case when p_sort = 'newest' then created_at end desc,
      case when p_sort = 'oldest' then created_at end asc,
      case when p_sort = 'name' then sort_name end asc,
      case when p_sort = 'points' then points end desc,
      case when p_sort = 'activity' then coalesce(last_learning_activity, '-infinity'::timestamp with time zone) end desc,
      case when p_sort in ('newest', 'points', 'activity') then id end desc,
      case when p_sort in ('oldest', 'name') then id end asc
    limit v_page_size + 1
  ),
  numbered as (
    select page_rows.*, row_number() over () as page_order
    from page_rows
  )
  select jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(to_jsonb(r) - 'page_order' order by r.page_order)
      from numbered r
      where r.page_order <= v_page_size
    ), '[]'::jsonb),
    'has_more', (select count(*) > v_page_size from numbered),
    'total_count', (select count(*) from filtered)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_user_directory(text, text, text, text, text, text, integer, timestamp with time zone, text, bigint, uuid) from public;
revoke all on function public.admin_user_directory(text, text, text, text, text, text, integer, timestamp with time zone, text, bigint, uuid) from anon;
grant execute on function public.admin_user_directory(text, text, text, text, text, text, integer, timestamp with time zone, text, bigint, uuid) to authenticated;
grant execute on function public.admin_user_directory(text, text, text, text, text, text, integer, timestamp with time zone, text, bigint, uuid) to service_role;
