begin;

-- Validation only. The reward, fulfillment, spending and refund functions stay
-- untouched. Existing pending quotes already store their exact reserved points.
create or replace function public.create_checkout_order_with_points_policy(
  p_email text, p_first_name text, p_last_name text, p_course_id uuid,
  p_user_id uuid, p_coupon_id uuid, p_original_price_cents integer,
  p_expected_amount_cents integer, p_points_to_spend integer default 0,
  p_first_purchase_discount_applied boolean default false,
  p_expires_at timestamptz default (now() + interval '24 hours')
)
returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  if p_points_to_spend is null or p_points_to_spend < 0
    or (p_points_to_spend > 0 and (p_points_to_spend < 5000 or p_points_to_spend % 1000 <> 0)) then
    raise exception 'Use at least 5,000 points, in steps of 1,000';
  end if;
  return public.create_checkout_order(p_email,p_first_name,p_last_name,p_course_id,
    p_user_id,p_coupon_id,p_original_price_cents,p_expected_amount_cents,
    p_points_to_spend,p_first_purchase_discount_applied,p_expires_at);
end $$;

create or replace function public.validate_new_whish_points()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  -- Accept either rollout's metadata. Legacy unmarked quotes remain compatible.
  if (new.discounts->>'pointsMinimum' = '5000'
      or new.discounts->>'pointsRedemptionStep' in ('1000','5000'))
    and (new.points_to_spend is null or new.points_to_spend < 0
      or (new.points_to_spend > 0 and (new.points_to_spend < 5000 or new.points_to_spend % 1000 <> 0))) then
    raise exception 'Use at least 5,000 points, in steps of 1,000';
  end if;
  return new;
end $$;

-- CREATE OR REPLACE retains the existing service-role-only privileges.
notify pgrst, 'reload schema';
commit;
