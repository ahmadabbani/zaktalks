begin;

-- A course may have one optional, gated introduction video before Module 1.
-- It remains a real lesson so enrollment checks, verified video progress and
-- sequential unlocking continue to use the existing lesson pipeline.
alter table public.lessons
  add column if not exists is_course_introduction boolean not null default false;

alter table public.lessons
  alter column module_id drop not null;

alter table public.lessons
  drop constraint if exists lessons_course_introduction_placement_check,
  add constraint lessons_course_introduction_placement_check
    check (
      (
        is_course_introduction = true
        and module_id is null
        and type = 'video'::public.lesson_type
        and assessment_key is null
      )
      or
      (
        is_course_introduction = false
        and module_id is not null
      )
    );

create unique index if not exists lessons_one_course_introduction_idx
  on public.lessons (course_id)
  where is_course_introduction = true;

create index if not exists lessons_course_sequence_idx
  on public.lessons (course_id, is_course_introduction desc, module_id, display_order, id);

comment on column public.lessons.is_course_introduction is
  'True only for the optional gated video shown before Module 1. At most one is allowed per course.';

-- Video analytics should treat this as a real video while presenting its
-- course-level placement clearly instead of requiring a module row.
do $migration$
declare
  function_definition text;
  updated_definition text;
begin
  if to_regprocedure('public.admin_video_analytics_dashboard(text,uuid,text,text,text,integer,integer)') is not null then
    function_definition := pg_get_functiondef(
      'public.admin_video_analytics_dashboard(text,uuid,text,text,text,integer,integer)'::regprocedure
    );
    updated_definition := replace(
      function_definition,
      'module.title AS module_title,',
      'coalesce(module.title, ''Course introduction'') AS module_title,'
    );
    updated_definition := replace(
      updated_definition,
      'module.display_order AS module_order,',
      'coalesce(module.display_order, 0) AS module_order,'
    );
    updated_definition := replace(
      updated_definition,
      'JOIN public.course_modules AS module ON module.id = lesson.module_id',
      'LEFT JOIN public.course_modules AS module ON module.id = lesson.module_id'
    );
    updated_definition := replace(
      updated_definition,
      'OR module.title ILIKE ''%'' || trim(p_search) || ''%''',
      'OR coalesce(module.title, ''Course introduction'') ILIKE ''%'' || trim(p_search) || ''%'''
    );

    if updated_definition = function_definition then
      raise exception 'Could not update admin_video_analytics_dashboard for course introductions';
    end if;
    execute updated_definition;
  end if;

  if to_regprocedure('public.admin_video_analytics_detail(uuid,text,text,text,integer,integer)') is not null then
    function_definition := pg_get_functiondef(
      'public.admin_video_analytics_detail(uuid,text,text,text,integer,integer)'::regprocedure
    );
    updated_definition := replace(
      function_definition,
      'module.title AS module_title,',
      'coalesce(module.title, ''Course introduction'') AS module_title,'
    );
    updated_definition := replace(
      updated_definition,
      'module.display_order AS module_order,',
      'coalesce(module.display_order, 0) AS module_order,'
    );
    updated_definition := replace(
      updated_definition,
      'JOIN public.course_modules AS module ON module.id = lesson.module_id',
      'LEFT JOIN public.course_modules AS module ON module.id = lesson.module_id'
    );

    if updated_definition = function_definition then
      raise exception 'Could not update admin_video_analytics_detail for course introductions';
    end if;
    execute updated_definition;
  end if;
end;
$migration$;

commit;
