begin;
-- A verified transfer must not prevent recovery of a failed guest setup email.
create or replace function public.claim_whish_email(p_order_id uuid, p_kind text)
returns setof public.whish_order_emails language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.whish_orders where id=p_order_id and
    ((p_kind='approved' and status='confirmed')
      or (p_kind='instructions' and status='pending')
      or (p_kind='password' and is_guest and status in ('pending','confirmed')))) then return; end if;
  insert into public.whish_order_emails(order_id,kind) values(p_order_id,p_kind) on conflict do nothing;
  return query update public.whish_order_emails set state='sending', claimed_at=now(), attempts=attempts+1
    where order_id=p_order_id and kind=p_kind and state not in ('sent','not_required')
      and (claimed_at is null or claimed_at < now()-interval '15 minutes') returning *;
end $$;
revoke all on function public.claim_whish_email(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_whish_email(uuid,text) to service_role;
notify pgrst, 'reload schema';
commit;
