begin;

create table public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating numeric(2, 1) not null,
  review_text text not null,
  created_at timestamptz not null default now(),
  constraint course_reviews_one_per_learner unique (course_id, user_id),
  constraint course_reviews_half_star_check
    check (rating between 0.5 and 5.0 and mod(rating * 2, 1) = 0),
  constraint course_reviews_text_length_check
    check (char_length(btrim(review_text)) between 1 and 2000)
);

create index course_reviews_course_created_idx
  on public.course_reviews (course_id, created_at desc);

alter table public.course_reviews enable row level security;

revoke all on public.course_reviews from public, anon, authenticated;
grant select on public.course_reviews to authenticated;

create policy course_reviews_read_own
on public.course_reviews
for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.submit_completed_course_review(
  p_course_id uuid,
  p_rating numeric,
  p_review_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_review_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in to review this course.';
  end if;

  if p_rating is null or p_rating < 0.5 or p_rating > 5
    or mod(p_rating * 2, 1) <> 0 then
    raise exception 'Choose a rating from half a star to five stars.';
  end if;

  if p_review_text is null
    or char_length(btrim(p_review_text)) not between 1 and 2000 then
    raise exception 'Write a review of up to 2000 characters.';
  end if;

  if not exists (
    select 1 from public.courses as course
    where course.id = p_course_id
      and course.deleted_at is null
      and course.is_published = true
  ) or not exists (
    select 1 from public.user_enrollments as enrollment
    where enrollment.user_id = v_user_id
      and enrollment.course_id = p_course_id
      and enrollment.payment_status = 'completed'::public.payment_status
  ) then
    raise exception 'This course is not available for your review.';
  end if;

  if not exists (
    select 1 from public.lessons as lesson
    where lesson.course_id = p_course_id
  ) or exists (
    select 1 from public.lessons as lesson
    where lesson.course_id = p_course_id
      and not exists (
        select 1 from public.lesson_progress as progress
        where progress.lesson_id = lesson.id
          and progress.user_id = v_user_id
          and progress.is_completed = true
      )
  ) then
    raise exception 'Complete every course item before reviewing.';
  end if;

  insert into public.course_reviews (course_id, user_id, rating, review_text)
  values (p_course_id, v_user_id, p_rating, btrim(p_review_text))
  returning id into v_review_id;

  return v_review_id;
end;
$function$;

revoke all on function public.submit_completed_course_review(uuid, numeric, text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_completed_course_review(uuid, numeric, text)
  to authenticated;

comment on table public.course_reviews is
  'One half-star-rated review per learner after verified full course completion.';

commit;
