begin;

alter table public.lesson_resources
  drop constraint if exists lesson_resources_lesson_id_key;

alter table public.lesson_resources
  add column if not exists display_order integer not null default 1;

alter table public.lesson_resources
  drop constraint if exists lesson_resources_display_order_check,
  add constraint lesson_resources_display_order_check
    check (display_order > 0);

create index if not exists lesson_resources_lesson_order_idx
  on public.lesson_resources (lesson_id, display_order, created_at);

comment on table public.lesson_resources is
  'Ordered private text, link, and PDF resources attached to lessons.';

create or replace function public.replace_lesson_resources(
  p_lesson_id uuid,
  p_resources jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  resource jsonb;
  resource_id uuid;
  keep_ids uuid[] := array[]::uuid[];
begin
  if jsonb_typeof(p_resources) <> 'array' then
    raise exception 'Lesson resources must be an array.';
  end if;

  if jsonb_array_length(p_resources) > 20 then
    raise exception 'A lesson can have up to 20 additional resources.';
  end if;

  for resource in select value from jsonb_array_elements(p_resources)
  loop
    resource_id := (resource ->> 'id')::uuid;

    if exists (
      select 1
      from public.lesson_resources existing
      where existing.id = resource_id
        and existing.lesson_id <> p_lesson_id
    ) then
      raise exception 'A lesson resource does not belong to this lesson.';
    end if;

    insert into public.lesson_resources (
      id,
      lesson_id,
      resource_type,
      text_content,
      rich_content,
      external_url,
      storage_path,
      original_file_name,
      file_size_bytes,
      display_order,
      updated_at
    ) values (
      resource_id,
      p_lesson_id,
      resource ->> 'resource_type',
      resource ->> 'text_content',
      coalesce(resource -> 'rich_content', '{}'::jsonb),
      resource ->> 'external_url',
      resource ->> 'storage_path',
      resource ->> 'original_file_name',
      (resource ->> 'file_size_bytes')::bigint,
      (resource ->> 'display_order')::integer,
      now()
    )
    on conflict (id) do update set
      resource_type = excluded.resource_type,
      text_content = excluded.text_content,
      rich_content = excluded.rich_content,
      external_url = excluded.external_url,
      storage_path = excluded.storage_path,
      original_file_name = excluded.original_file_name,
      file_size_bytes = excluded.file_size_bytes,
      display_order = excluded.display_order,
      updated_at = now()
    where public.lesson_resources.lesson_id = p_lesson_id;

    keep_ids := array_append(keep_ids, resource_id);
  end loop;

  delete from public.lesson_resources existing
  where existing.lesson_id = p_lesson_id
    and not (existing.id = any(keep_ids));
end;
$$;

revoke all on function public.replace_lesson_resources(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_lesson_resources(uuid, jsonb) to service_role;

commit;
