begin;

alter table public.lesson_resources
  add column if not exists rich_content jsonb not null default '{}'::jsonb;

alter table public.lesson_resources
  drop constraint if exists lesson_resources_rich_content_is_object,
  add constraint lesson_resources_rich_content_is_object
    check (jsonb_typeof(rich_content) = 'object');

comment on column public.lesson_resources.rich_content is
  'Safe bold and italic formatting for text resources. text_content remains the canonical plain-text fallback.';

commit;
