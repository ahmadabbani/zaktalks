begin;

-- A closed manual Whish request can be returned to pending review. This does
-- not grant access, consume a discount, change points, or send an email.
create function public.reopen_whish_order(p_order_id uuid, p_actor_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  order_row public.whish_orders%rowtype;
begin
  if not exists(select 1 from public.users where id=p_actor_id and role='admin') then
    raise exception 'Administrator access is required.' using errcode='42501';
  end if;

  select * into order_row from public.whish_orders where id=p_order_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;
  if order_row.status <> 'cancelled' then
    raise exception 'Only closed Whish requests can be reopened.';
  end if;

  update public.whish_orders
  set status='pending', updated_at=now()
  where id=order_row.id;
end $$;

revoke all on function public.reopen_whish_order(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reopen_whish_order(uuid,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
