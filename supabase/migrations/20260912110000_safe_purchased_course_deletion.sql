begin;

-- A removed course must remain identifiable in financial history even after
-- learner-facing course RLS stops exposing the course row.
alter table public.checkout_sessions
  add column if not exists course_title_snapshot text,
  add column if not exists course_access_removed_at timestamptz;

create or replace function public.delete_content_with_activity(
  p_actor_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_expected_course_id uuid default null,
  p_expected_is_course_introduction boolean default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_audit_id bigint;
  v_deleted_count integer;
  v_course_title text;
  v_removed_at timestamptz;
begin
  case p_entity_type
    when 'course' then
      if p_expected_course_id is not null and p_expected_course_id <> p_entity_id then
        raise exception 'Course identity does not match.';
      end if;

      -- Serialize deletion with other writes to this course. Keep the course
      -- row and paid enrollments for refunds, loyalty reversals and receipts.
      select title into v_course_title
      from public.courses
      where id = p_entity_id and deleted_at is null
      for update;
      if not found then
        raise exception 'Course not found.';
      end if;

      -- A customer could still pay for an open Stripe session. Do not remove
      -- access/content while a live payment might be awaiting fulfillment.
      if exists (
        select 1 from public.checkout_sessions as checkout
        where checkout.course_id = p_entity_id
          and checkout.status = 'pending'::public.checkout_status
          and checkout.stripe_session_id is not null
          and (
            checkout.expires_at > now()
            or checkout.payment_state in ('processing', 'paid', 'no_payment_required')
          )
      ) then
        raise exception 'This course has a checkout in progress. Wait for it to finish or expire before deleting the course.';
      end if;

      v_audit_id := public.record_content_activity(
        p_actor_user_id, 'deleted', 'course', p_entity_id, '[]'::jsonb
      );

      v_removed_at := now();
      update public.courses
      set deleted_at = v_removed_at,
          is_published = false,
          updated_at = v_removed_at
      where id = p_entity_id and deleted_at is null;
      get diagnostics v_deleted_count = row_count;

      -- Preserve orders and enrollments as financial history, but make the
      -- removal visible in purchase history rather than implying a refund.
      update public.checkout_sessions
      set course_title_snapshot = coalesce(course_title_snapshot, v_course_title),
          course_access_removed_at = case
            when status = 'completed'::public.checkout_status
              and fulfillment_state = 'fulfilled'
              then coalesce(course_access_removed_at, v_removed_at)
            else course_access_removed_at
          end,
          updated_at = v_removed_at
      where course_id = p_entity_id;

      -- These are learner-facing/learning-only records. The payment ledger,
      -- coupon usage, points ledger, discounts and enrollments are retained.
      delete from public.course_inactivity_notifications where course_id = p_entity_id;
      delete from public.course_enrollment_activity where course_id = p_entity_id;
      delete from public.course_images where course_id = p_entity_id;
      delete from public.course_faqs where course_id = p_entity_id;
      delete from public.lessons where course_id = p_entity_id;
      delete from public.course_modules where course_id = p_entity_id;
      delete from public.course_promotion_courses where course_id = p_entity_id;
      delete from public.coupon_courses where course_id = p_entity_id;

    when 'module' then
      if not exists (
        select 1
        from public.course_modules
        where id = p_entity_id
          and (p_expected_course_id is null or course_id = p_expected_course_id)
      ) then
        raise exception 'Module not found.';
      end if;

      if exists (select 1 from public.lessons where module_id = p_entity_id) then
        raise exception 'Move or delete this module''s lessons before deleting the module.';
      end if;

      v_audit_id := public.record_content_activity(
        p_actor_user_id, 'deleted', 'module', p_entity_id, '[]'::jsonb
      );

      delete from public.course_modules
      where id = p_entity_id
        and (p_expected_course_id is null or course_id = p_expected_course_id);
      get diagnostics v_deleted_count = row_count;

    when 'lesson' then
      if not exists (
        select 1
        from public.lessons
        where id = p_entity_id
          and (p_expected_course_id is null or course_id = p_expected_course_id)
          and (
            p_expected_is_course_introduction is null
            or is_course_introduction = p_expected_is_course_introduction
          )
      ) then
        raise exception 'Lesson not found.';
      end if;

      v_audit_id := public.record_content_activity(
        p_actor_user_id, 'deleted', 'lesson', p_entity_id, '[]'::jsonb
      );

      delete from public.lessons
      where id = p_entity_id
        and (p_expected_course_id is null or course_id = p_expected_course_id)
        and (
          p_expected_is_course_introduction is null
          or is_course_introduction = p_expected_is_course_introduction
        );
      get diagnostics v_deleted_count = row_count;

    else
      raise exception 'Unsupported content entity type.';
  end case;

  if coalesce(v_deleted_count, 0) <> 1 then
    raise exception 'The content record could not be deleted safely.';
  end if;

  return v_audit_id;
end;
$function$;

revoke all on function public.delete_content_with_activity(uuid, text, uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.delete_content_with_activity(uuid, text, uuid, uuid, boolean)
  to service_role;

comment on column public.checkout_sessions.course_title_snapshot is
  'Historical course title retained when course content is removed.';
comment on column public.checkout_sessions.course_access_removed_at is
  'Administrative course removal, distinct from a refund or payment reversal.';

commit;
