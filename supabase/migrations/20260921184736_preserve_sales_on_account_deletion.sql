begin;

-- Completed financial records must outlive a learner account, while the
-- enrollment and profile they originally referenced are removed.
alter table public.checkout_sessions
  drop constraint checkout_sessions_user_id_fkey,
  add constraint checkout_sessions_user_id_fkey
    foreign key (user_id) references public.users(id) on delete set null;

alter table public.checkout_sessions
  drop constraint checkout_sessions_enrollment_id_fkey,
  add constraint checkout_sessions_enrollment_id_fkey
    foreign key (enrollment_id) references public.user_enrollments(id) on delete set null;

alter table public.user_discounts
  drop constraint user_discounts_granted_by_fkey,
  add constraint user_discounts_granted_by_fkey
    foreign key (granted_by) references public.users(id) on delete set null;

-- Abandoned payment requests are removed inside the Auth deletion
-- transaction. Settled/refunded/disputed orders remain as financial records.
create function public.cleanup_orders_before_account_deletion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.checkout_sessions
  where (
      user_id = old.id
      or (email is not null and lower(email) = lower(old.email))
    )
    and status <> 'completed'
    and payment_state not in (
      'paid',
      'no_payment_required',
      'partially_refunded',
      'refunded',
      'disputed',
      'dispute_lost'
    );

  delete from public.whish_orders
  where (
      user_id = old.id
      or lower(email) = lower(old.email)
    )
    and status <> 'confirmed';

  return old;
end;
$$;

revoke all on function public.cleanup_orders_before_account_deletion() from public, anon, authenticated;

create trigger cleanup_orders_before_account_deletion
before delete on public.users
for each row execute function public.cleanup_orders_before_account_deletion();

commit;
