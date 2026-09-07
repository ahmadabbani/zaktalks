begin;

-- Keep the audit payload intentionally small. It records only the name of a
-- changed area and whether that area was added, updated, or removed. Content,
-- links, file paths, and previous values are never copied into the audit log.
alter table public.content_creation_audit_log
  add column if not exists changes jsonb not null default '[]'::jsonb;

alter table public.content_creation_audit_log
  drop constraint if exists content_creation_audit_action_check,
  add constraint content_creation_audit_action_check
    check (action in ('created', 'updated', 'deleted')),
  drop constraint if exists content_creation_audit_changes_check,
  add constraint content_creation_audit_changes_check
    check (
      case
        when jsonb_typeof(changes) = 'array' then jsonb_array_length(changes) <= 100
        else false
      end
    );

create or replace function public.record_content_activity(
  p_actor_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_changes jsonb default '[]'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text;
  v_actor_name text;
  v_actor_email text;
  v_course_id uuid;
  v_module_id uuid;
  v_lesson_id uuid;
  v_entity_title text;
  v_course_title text;
  v_module_title text;
  v_lesson_type text;
  v_assessment_key text;
  v_is_course_introduction boolean := false;
  v_changes jsonb := '[]'::jsonb;
  v_audit_id bigint;
begin
  if p_action not in ('created', 'updated', 'deleted') then
    raise exception 'Unsupported content activity action.';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'array' then
    raise exception 'Content activity changes must be an array.';
  end if;

  if jsonb_array_length(p_changes) > 100 then
    raise exception 'Too many content activity changes.';
  end if;

  -- Rebuild every entry so callers cannot persist values or arbitrary keys.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'field', left(btrim(item.value ->> 'field'), 120),
        'operation', item.value ->> 'operation'
      )
      order by item.ordinality
    ),
    '[]'::jsonb
  )
  into v_changes
  from jsonb_array_elements(p_changes) with ordinality as item(value, ordinality)
  where jsonb_typeof(item.value) = 'object'
    and nullif(btrim(item.value ->> 'field'), '') is not null
    and item.value ->> 'operation' in ('added', 'updated', 'removed');

  select
    staff.role,
    trim(concat_ws(' ', staff.first_name, staff.last_name)),
    staff.email
  into v_actor_role, v_actor_name, v_actor_email
  from public.users as staff
  where staff.id = p_actor_user_id
    and staff.role in ('admin', 'creator');

  if not found then
    raise exception 'A valid staff actor is required.';
  end if;

  v_actor_name := coalesce(nullif(v_actor_name, ''), v_actor_email, 'Staff member');
  v_actor_email := coalesce(v_actor_email, '');

  case p_entity_type
    when 'course' then
      select course.id, course.title, course.title
      into v_course_id, v_entity_title, v_course_title
      from public.courses as course
      where course.id = p_entity_id
        and course.deleted_at is null;
    when 'module' then
      select module.course_id, module.id, module.title, course.title, module.title
      into v_course_id, v_module_id, v_entity_title, v_course_title, v_module_title
      from public.course_modules as module
      join public.courses as course on course.id = module.course_id
      where module.id = p_entity_id
        and course.deleted_at is null;
    when 'lesson' then
      select
        lesson.course_id,
        lesson.module_id,
        lesson.id,
        lesson.title,
        course.title,
        module.title,
        lesson.type,
        lesson.assessment_key,
        coalesce(lesson.is_course_introduction, false)
      into
        v_course_id,
        v_module_id,
        v_lesson_id,
        v_entity_title,
        v_course_title,
        v_module_title,
        v_lesson_type,
        v_assessment_key,
        v_is_course_introduction
      from public.lessons as lesson
      join public.courses as course on course.id = lesson.course_id
      left join public.course_modules as module on module.id = lesson.module_id
      where lesson.id = p_entity_id
        and course.deleted_at is null;
    else
      raise exception 'Unsupported content entity type.';
  end case;

  if v_entity_title is null or v_course_title is null then
    raise exception 'The content record was not found.';
  end if;

  insert into public.content_creation_audit_log (
    actor_user_id,
    actor_role,
    actor_name,
    actor_email,
    action,
    entity_type,
    entity_id,
    course_id,
    module_id,
    lesson_id,
    entity_title,
    course_title,
    module_title,
    lesson_type,
    assessment_key,
    is_course_introduction,
    changes
  ) values (
    p_actor_user_id,
    v_actor_role,
    v_actor_name,
    v_actor_email,
    p_action,
    p_entity_type,
    p_entity_id,
    v_course_id,
    v_module_id,
    v_lesson_id,
    v_entity_title,
    v_course_title,
    v_module_title,
    v_lesson_type,
    v_assessment_key,
    v_is_course_introduction,
    v_changes
  )
  returning id into v_audit_id;

  return v_audit_id;
end;
$function$;

-- Preserve the creation recorder used by the already deployed application.
create or replace function public.record_content_creation_activity(
  p_actor_user_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns bigint
language sql
security definer
set search_path = ''
as $function$
  select public.record_content_activity(
    p_actor_user_id,
    'created',
    p_entity_type,
    p_entity_id,
    '[]'::jsonb
  );
$function$;

-- Deletion and its audit row share one database transaction. The application
-- can remove already-discovered storage objects after this function commits.
create or replace function public.delete_content_with_activity(
  p_actor_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_expected_course_id uuid default null,
  p_expected_is_course_introduction boolean default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_audit_id bigint;
  v_deleted_count integer;
begin
  case p_entity_type
    when 'course' then
      if p_expected_course_id is not null and p_expected_course_id <> p_entity_id then
        raise exception 'Course identity does not match.';
      end if;

      if not exists (
        select 1 from public.courses
        where id = p_entity_id and deleted_at is null
      ) then
        raise exception 'Course not found.';
      end if;

      v_audit_id := public.record_content_activity(
        p_actor_user_id, 'deleted', 'course', p_entity_id, '[]'::jsonb
      );

      delete from public.course_images where course_id = p_entity_id;
      delete from public.course_faqs where course_id = p_entity_id;
      delete from public.lessons where course_id = p_entity_id;
      delete from public.user_enrollments where course_id = p_entity_id;

      update public.courses
      set deleted_at = now(), updated_at = now()
      where id = p_entity_id and deleted_at is null;
      get diagnostics v_deleted_count = row_count;

    when 'module' then
      if not exists (
        select 1
        from public.course_modules
        where id = p_entity_id
          and (p_expected_course_id is null or course_id = p_expected_course_id)
      ) then
        raise exception 'Module not found.';
      end if;

      if exists (select 1 from public.lessons where module_id = p_entity_id) then
        raise exception 'Move or delete this module''s lessons before deleting the module.';
      end if;

      v_audit_id := public.record_content_activity(
        p_actor_user_id, 'deleted', 'module', p_entity_id, '[]'::jsonb
      );

      delete from public.course_modules
      where id = p_entity_id
        and (p_expected_course_id is null or course_id = p_expected_course_id);
      get diagnostics v_deleted_count = row_count;

    when 'lesson' then
      if not exists (
        select 1
        from public.lessons
        where id = p_entity_id
          and (p_expected_course_id is null or course_id = p_expected_course_id)
          and (
            p_expected_is_course_introduction is null
            or is_course_introduction = p_expected_is_course_introduction
          )
      ) then
        raise exception 'Lesson not found.';
      end if;

      v_audit_id := public.record_content_activity(
        p_actor_user_id, 'deleted', 'lesson', p_entity_id, '[]'::jsonb
      );

      delete from public.lessons
      where id = p_entity_id
        and (p_expected_course_id is null or course_id = p_expected_course_id)
        and (
          p_expected_is_course_introduction is null
          or is_course_introduction = p_expected_is_course_introduction
        );
      get diagnostics v_deleted_count = row_count;

    else
      raise exception 'Unsupported content entity type.';
  end case;

  if coalesce(v_deleted_count, 0) <> 1 then
    raise exception 'The content record could not be deleted safely.';
  end if;

  return v_audit_id;
end;
$function$;

revoke all on function public.record_content_activity(uuid, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_content_activity(uuid, text, text, uuid, jsonb)
  to service_role;

revoke all on function public.delete_content_with_activity(uuid, text, uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.delete_content_with_activity(uuid, text, uuid, uuid, boolean)
  to service_role;

revoke all on function public.record_content_creation_activity(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.record_content_creation_activity(uuid, text, uuid)
  to service_role;

comment on table public.content_creation_audit_log is
  'Append-only staff audit history for course, module, and lesson creation, updates, and deletion.';
comment on column public.content_creation_audit_log.changes is
  'Safe field labels and added, updated, or removed operations only. No content values are stored.';
comment on function public.record_content_activity(uuid, text, text, uuid, jsonb) is
  'Service-role-only recorder that derives content snapshots and stores sanitized field labels only.';
comment on function public.delete_content_with_activity(uuid, text, uuid, uuid, boolean) is
  'Service-role-only atomic content deletion and audit operation.';

commit;
