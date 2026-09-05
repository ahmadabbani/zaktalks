alter table public.lessons
  add column if not exists assessment_time_estimate text,
  add column if not exists assessment_statement_count integer,
  add column if not exists assessment_completion_guidance text;

alter table public.lessons
  drop constraint if exists lessons_assessment_time_estimate_valid,
  add constraint lessons_assessment_time_estimate_valid check (
    assessment_time_estimate is null
    or assessment_time_estimate in (
      'About 3 minutes',
      'About 6–8 minutes',
      'About 8–10 minutes',
      'About 10–12 minutes',
      'About 12–14 minutes'
    )
  ),
  drop constraint if exists lessons_assessment_statement_count_valid,
  add constraint lessons_assessment_statement_count_valid check (
    assessment_statement_count is null
    or assessment_statement_count between 1 and 1000
  ),
  drop constraint if exists lessons_assessment_completion_guidance_length,
  add constraint lessons_assessment_completion_guidance_length check (
    assessment_completion_guidance is null
    or char_length(assessment_completion_guidance) <= 2000
  );

comment on column public.lessons.assessment_time_estimate is
  'Admin-selected learner-facing time estimate for an assessment lesson.';
comment on column public.lessons.assessment_statement_count is
  'Learner-facing number of statements in an assessment lesson.';
comment on column public.lessons.assessment_completion_guidance is
  'Plain-text learner guidance shown before starting an assessment.';
