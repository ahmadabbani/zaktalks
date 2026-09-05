begin;

alter table public.courses
  add column if not exists lesson_numbering_style text not null default 'module';

alter table public.courses
  drop constraint if exists courses_lesson_numbering_style_check,
  add constraint courses_lesson_numbering_style_check
    check (lesson_numbering_style in ('module', 'none'));

comment on column public.courses.lesson_numbering_style is
  'Controls generated lesson labels in learner-facing curriculum views. Assessments never consume a lesson number.';

commit;
