begin;

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
  on conflict on constraint course_reviews_one_per_learner do update
  set rating = excluded.rating,
      review_text = excluded.review_text,
      created_at = now(),
      updated_at = now(),
      deleted_at = null,
      is_published = false,
      published_at = null,
      moderated_by = null,
      is_test = false
  where course_reviews.deleted_at is not null
  returning id into v_review_id;

  if v_review_id is null then
    raise exception 'You have already reviewed this course.' using errcode = '23505';
  end if;

  return v_review_id;
end;
$function$;

comment on column public.course_reviews.deleted_at is
  'Admin-removed reviews are hidden until the learner submits a replacement.';

commit;
