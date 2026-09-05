alter table public.lessons
  drop constraint if exists lessons_assessment_statement_count_valid,
  drop column if exists assessment_statement_count;
