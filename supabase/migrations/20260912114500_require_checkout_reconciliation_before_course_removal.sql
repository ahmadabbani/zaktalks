begin;

-- An expired timestamp alone does not prove that a Checkout Session was not
-- paid just before expiry while its webhook is delayed. Require the order to
-- reach a recorded terminal/fulfilled state before removing course content.
create or replace function public.block_course_removal_during_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.deleted_at is null and new.deleted_at is not null and exists (
    select 1
    from public.checkout_sessions as checkout
    where checkout.course_id = old.id
      and (
        checkout.status = 'pending'::public.checkout_status
        or (
          checkout.payment_state in ('paid', 'no_payment_required')
          and checkout.fulfillment_state in ('pending', 'processing', 'failed', 'requires_attention')
        )
      )
  ) then
    raise exception 'This course has an unsettled checkout. Finish or reconcile it before deleting the course.';
  end if;

  return new;
end;
$function$;

commit;
