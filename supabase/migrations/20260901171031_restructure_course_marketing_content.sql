begin;

-- Preserve the existing hero copy under its new semantic names. The new
-- description/subheadline columns are backfilled so the currently deployed
-- application remains readable during the rollout.
alter table public.courses rename column description to promise;
alter table public.courses add column description text;
update public.courses set description = promise where description is null;

alter table public.courses rename column subheadline to short_introduction;
alter table public.courses add column subheadline text;
update public.courses set subheadline = short_introduction where subheadline is null;

alter table public.courses
  add column primary_cta_text text,
  add column bold_introduction text,
  add column course_info_modules text,
  add column course_level text,
  add column course_language text,
  add column flexible_schedule text,
  add column course_support text,
  add column details_to_know_items jsonb not null default '[]'::jsonb,
  add column details_cta_text text,
  add column what_youll_explore jsonb not null default '[]'::jsonb,
  add column explore_more jsonb not null default '[]'::jsonb,
  add column target_audience_title text not null default 'Who this is for',
  add column who_this_is_not_for_title text not null default 'Who this is not for',
  add column audience_supporting_text text;

-- Convert existing plain-text details into one structured item while retaining
-- the legacy column until the new application version is fully deployed.
update public.courses
set details_to_know_items = jsonb_build_array(
  jsonb_build_object(
    'title', 'Details',
    'content_type', 'text',
    'text', details_to_know,
    'items', '[]'::jsonb
  )
)
where nullif(btrim(details_to_know), '') is not null;

alter table public.courses
  add constraint courses_details_to_know_items_array_check
    check (jsonb_typeof(details_to_know_items) = 'array'),
  add constraint courses_what_youll_explore_array_check
    check (jsonb_typeof(what_youll_explore) = 'array'),
  add constraint courses_explore_more_array_check
    check (jsonb_typeof(explore_more) = 'array');

comment on column public.courses.promise is 'Short hero promise shown prominently on the public course page.';
comment on column public.courses.short_introduction is 'Short hero introduction shown beneath the course promise.';
comment on column public.courses.bold_introduction is 'Bold lead text for the non-hero course introduction.';
comment on column public.courses.subheadline is 'Supporting text for the non-hero course introduction.';
comment on column public.courses.description is 'Long-form course description outside the hero.';
comment on column public.courses.details_to_know_items is 'Ordered course detail blocks with text or list content.';
comment on column public.courses.what_youll_explore is 'Ordered exploration blocks with text or list content.';
comment on column public.courses.explore_more is 'Ordered internal course or public-page references for related content.';

commit;
