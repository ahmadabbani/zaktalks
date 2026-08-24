begin;

alter table public.courses
  add column introduction_video_url text;

alter table public.courses
  add constraint courses_introduction_video_url_check
  check (
    introduction_video_url is null
    or introduction_video_url ~* '^https://([a-z0-9-]+\.)*(youtube\.com|youtu\.be|youtube-nocookie\.com)(/|$)'
  );

comment on column public.courses.introduction_video_url is
  'Optional public YouTube introduction video URL for the course; it is not a curriculum lesson.';

commit;
