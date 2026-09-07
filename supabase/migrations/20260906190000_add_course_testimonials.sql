begin;

alter table public.courses
  add column if not exists testimonials_heading text,
  add column if not exists testimonials_subheading text,
  add column if not exists testimonials jsonb not null default '[]'::jsonb;

alter table public.courses
  drop constraint if exists courses_testimonials_array_check,
  add constraint courses_testimonials_array_check
    check (jsonb_typeof(testimonials) = 'array');

comment on column public.courses.testimonials_heading is
  'Optional heading for the course testimonial section.';
comment on column public.courses.testimonials_subheading is
  'Optional supporting copy for the course testimonial section.';
comment on column public.courses.testimonials is
  'Ordered course testimonials containing learner name, testimonial copy, and image URL.';

commit;
