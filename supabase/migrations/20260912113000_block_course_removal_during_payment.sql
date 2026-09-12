begin;

-- A paid Checkout Session may have completed while fulfillment is still
-- retrying. Removing its lessons at that moment would strand the payment.
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
      and checkout.payment_state in ('paid', 'no_payment_required')
      and checkout.fulfillment_state in ('pending', 'processing', 'failed', 'requires_attention')
  ) then
    raise exception 'This course has a payment awaiting course access. Reconcile that payment before deleting the course.';
  end if;

  return new;
end;
$function$;

revoke all on function public.block_course_removal_during_payment()
  from public, anon, authenticated;

drop trigger if exists block_course_removal_during_payment on public.courses;
create trigger block_course_removal_during_payment
before update of deleted_at on public.courses
for each row
execute function public.block_course_removal_during_payment();

commit;
