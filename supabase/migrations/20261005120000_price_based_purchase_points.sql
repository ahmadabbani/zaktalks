begin;

-- Change only reward values in the installed atomic functions. Preserve their
-- locks, duplicate protection, entitlement/payment updates, email claims and ACLs.
do $migration$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.finalize_course_purchase(text,uuid,uuid,text,integer,integer,boolean,integer,uuid)'::regprocedure);
  if position('points_earned = 1000' in definition)=0
    or position('points = points + 1000' in definition)=0
    or position('VALUES (p_user_id, 1000, ''earn''' in definition)=0
    or position('1000, p_coupon_id, p_first_purchase_discount_applied, now()' in definition)=0 then
    raise exception 'Unexpected Stripe reward function. No changes applied.';
  end if;
  definition := replace(definition, 'points_earned = 1000', 'points_earned = p_amount_paid_cents / 100');
  definition := replace(definition, '1000, p_coupon_id, p_first_purchase_discount_applied, now()', 'p_amount_paid_cents / 100, p_coupon_id, p_first_purchase_discount_applied, now()');
  definition := replace(definition, 'points = points + 1000', 'points = points + (p_amount_paid_cents / 100)');
  definition := replace(definition, 'VALUES (p_user_id, 1000, ''earn''', 'VALUES (p_user_id, p_amount_paid_cents / 100, ''earn''');
  execute definition;

  definition := pg_get_functiondef('public.review_whish_order(uuid,uuid,text,integer,text,text)'::regprocedure);
  if position('points_earned=1000' in definition)=0
    or position('points=points-o.points_to_spend+1000' in definition)=0
    or position('values(u.id,1000,''earn''' in definition)=0
    or position('1000,o.coupon_id,o.first_purchase_discount_applied,now()' in definition)=0 then
    raise exception 'Unexpected Whish reward function. No changes applied.';
  end if;
  definition := replace(definition, 'points_earned=1000', 'points_earned=excluded.points_earned');
  definition := replace(definition, '1000,o.coupon_id,o.first_purchase_discount_applied,now()', 'p_amount_cents / 100,o.coupon_id,o.first_purchase_discount_applied,now()');
  definition := replace(definition, 'points=points-o.points_to_spend+1000', 'points=points-o.points_to_spend+(p_amount_cents / 100)');
  definition := replace(definition, 'values(u.id,1000,''earn''', 'values(u.id,p_amount_cents / 100,''earn''');
  execute definition;

end $migration$;

-- New code uses this small validator around the unchanged reservation function.
-- Older deployed code remains operational until the application is redeployed.
create function public.create_checkout_order_with_points_policy(
  p_email text, p_first_name text, p_last_name text, p_course_id uuid,
  p_user_id uuid, p_coupon_id uuid, p_original_price_cents integer,
  p_expected_amount_cents integer, p_points_to_spend integer default 0,
  p_first_purchase_discount_applied boolean default false,
  p_expires_at timestamptz default (now() + interval '24 hours')
)
returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  if p_points_to_spend is null or p_points_to_spend < 0 or p_points_to_spend % 5000 <> 0 then
    raise exception 'Choose points in steps of 5,000';
  end if;
  return public.create_checkout_order(p_email,p_first_name,p_last_name,p_course_id,
    p_user_id,p_coupon_id,p_original_price_cents,p_expected_amount_cents,
    p_points_to_spend,p_first_purchase_discount_applied,p_expires_at);
end $$;
revoke all on function public.create_checkout_order_with_points_policy(text,text,text,uuid,uuid,uuid,integer,integer,integer,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.create_checkout_order_with_points_policy(text,text,text,uuid,uuid,uuid,integer,integer,integer,boolean,timestamptz) to service_role;

-- Existing Whish quotes may have reserved 1,000-point steps. Keep those valid
-- for approval/reopening; enforce 5,000-point steps only on new requests.
create function public.validate_new_whish_points()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.discounts->>'pointsRedemptionStep' = '5000'
    and (new.points_to_spend is null or new.points_to_spend < 0 or new.points_to_spend % 5000 <> 0) then
    raise exception 'Choose points in steps of 5,000';
  end if;
  return new;
end $$;
revoke all on function public.validate_new_whish_points() from public,anon,authenticated;
grant execute on function public.validate_new_whish_points() to service_role;
create trigger validate_new_whish_points before insert on public.whish_orders
for each row execute function public.validate_new_whish_points();

-- No historical balances/earnings are recalculated. Refunds already reverse the
-- exact points_earned recorded on each enrollment, including old 1,000 rewards.
notify pgrst, 'reload schema';
commit;
