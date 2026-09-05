-- Additive, presentation-only formatting metadata. Existing plain-text columns
-- remain authoritative so old courses and all current integrations keep working.
alter table public.courses
  add column if not exists rich_content jsonb not null default '{}'::jsonb;

alter table public.course_modules
  add column if not exists rich_content jsonb not null default '{}'::jsonb;

alter table public.lessons
  add column if not exists rich_content jsonb not null default '{}'::jsonb;

alter table public.courses
  drop constraint if exists courses_rich_content_is_object,
  add constraint courses_rich_content_is_object
    check (jsonb_typeof(rich_content) = 'object');

alter table public.course_modules
  drop constraint if exists course_modules_rich_content_is_object,
  add constraint course_modules_rich_content_is_object
    check (jsonb_typeof(rich_content) = 'object');

alter table public.lessons
  drop constraint if exists lessons_rich_content_is_object,
  add constraint lessons_rich_content_is_object
    check (jsonb_typeof(rich_content) = 'object');

comment on column public.courses.rich_content is
  'Safe inline formatting metadata (normal, bold, italic). Plain course columns remain canonical.';

comment on column public.course_modules.rich_content is
  'Safe inline formatting metadata for the module description. The description column remains canonical.';

comment on column public.lessons.rich_content is
  'Safe inline formatting metadata for the lesson description. The description column remains canonical.';
