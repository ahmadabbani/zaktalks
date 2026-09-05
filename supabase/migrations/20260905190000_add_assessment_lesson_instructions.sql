alter table public.lessons
  add column if not exists instructions text;

alter table public.lessons
  drop constraint if exists lessons_instructions_length,
  add constraint lessons_instructions_length
    check (instructions is null or char_length(instructions) <= 5000);

comment on column public.lessons.instructions is
  'Optional lesson-level instructions displayed before an assessment begins. Formatting is stored in rich_content.instructions.';
