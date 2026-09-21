begin;

-- Whish requests never enter the Stripe checkout/fulfillment pipeline.
create table public.whish_orders (
  id uuid primary key default gen_random_uuid(),
  request_key uuid not null unique,
  user_id uuid references public.users(id) on delete set null,
  course_id uuid not null references public.courses(id) on delete restrict,
  enrollment_id uuid references public.user_enrollments(id) on delete set null,
  email text not null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  is_guest boolean not null default false,
  course_title text not null,
  recipient_number text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  currency text not null default 'usd' check (currency = 'usd'),
  original_price_cents integer not null check (original_price_cents >= 0),
  quoted_amount_cents integer not null check (quoted_amount_cents >= 0 and quoted_amount_cents <= original_price_cents),
  amount_received_cents integer check (amount_received_cents >= 0),
  discounts jsonb not null default '{}'::jsonb,
  points_to_spend integer not null default 0 check (points_to_spend >= 0 and points_to_spend % 1000 = 0),
  first_purchase_discount_applied boolean not null default false,
  coupon_id uuid references public.coupons(id) on delete set null,
  transfer_reference text,
  admin_note text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'confirmed' or (amount_received_cents is not null and transfer_reference is not null and reviewed_at is not null))
);
create unique index whish_pending_email_course on public.whish_orders(lower(email), course_id) where status = 'pending';
create unique index whish_transfer_reference_unique on public.whish_orders(lower(transfer_reference)) where status = 'confirmed';
create index whish_orders_created on public.whish_orders(created_at desc, id desc);
create index whish_orders_user on public.whish_orders(user_id, created_at desc);
create index whish_orders_course on public.whish_orders(course_id);
create index whish_orders_enrollment on public.whish_orders(enrollment_id);
create index whish_orders_coupon on public.whish_orders(coupon_id);
create index whish_orders_reviewer on public.whish_orders(reviewed_by);
alter table public.whish_orders enable row level security;
revoke all on public.whish_orders from public, anon, authenticated;
grant all on public.whish_orders to service_role;

create table public.whish_order_emails (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.whish_orders(id) on delete cascade,
  kind text not null check (kind in ('instructions', 'password', 'approved')),
  state text not null default 'pending' check (state in ('pending','sending','sent','failed','not_required')),
  claimed_at timestamptz,
  sent_at timestamptz,
  provider_email_id text,
  last_error text,
  attempts integer not null default 0,
  unique(order_id, kind)
);
alter table public.whish_order_emails enable row level security;
revoke all on public.whish_order_emails from public, anon, authenticated;
grant all on public.whish_order_emails to service_role;

create function public.claim_whish_email(p_order_id uuid, p_kind text)
returns setof public.whish_order_emails language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.whish_orders where id=p_order_id and
    ((p_kind='approved' and status='confirmed') or (p_kind in ('instructions','password') and status='pending'))) then return; end if;
  insert into public.whish_order_emails(order_id,kind) values(p_order_id,p_kind) on conflict do nothing;
  return query update public.whish_order_emails set state='sending', claimed_at=now(), attempts=attempts+1
    where order_id=p_order_id and kind=p_kind and state not in ('sent','not_required')
      and (claimed_at is null or claimed_at < now()-interval '15 minutes') returning *;
end $$;

-- Payment, entitlement, benefit usage, reward and audit commit together.
create function public.review_whish_order(p_order_id uuid, p_actor_id uuid, p_action text,
  p_amount_cents integer default null, p_transfer_reference text default null, p_note text default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  o public.whish_orders%rowtype;
  u public.users%rowtype;
  c public.coupons%rowtype;
  e public.user_enrollments%rowtype;
  eid uuid;
begin
  if not exists(select 1 from public.users where id=p_actor_id and role='admin') then
    raise exception 'Administrator access is required.' using errcode='42501';
  end if;
  if p_action not in ('confirm','cancel') then raise exception 'Invalid action.'; end if;
  select * into o from public.whish_orders where id=p_order_id for update;
  if not found then raise exception 'Request not found.'; end if;
  if o.status='confirmed' and p_action='confirm' then return o.enrollment_id; end if;
  if o.status <> 'pending' then raise exception 'This request has already been reviewed.'; end if;
  if p_action='cancel' then
    update public.whish_orders set status='cancelled', reviewed_by=p_actor_id, reviewed_at=now(),
      admin_note=left(p_note,2000),updated_at=now() where id=o.id;
    return null;
  end if;
  if p_amount_cents is null or p_amount_cents < 0 or p_amount_cents > o.original_price_cents then
    raise exception 'Enter the actual USD amount received, between zero and the course price.';
  end if;
  if nullif(btrim(p_transfer_reference),'') is null or length(p_transfer_reference)>160 then
    raise exception 'A valid Whish transfer reference is required.';
  end if;
  if p_amount_cents <> o.quoted_amount_cents and nullif(btrim(p_note),'') is null then
    raise exception 'Explain why the received amount differs from the quoted price.';
  end if;
  perform 1 from public.courses where id=o.course_id and deleted_at is null for share;
  if not found then raise exception 'This course has been removed. Resolve the payment before granting access.'; end if;
  select * into u from public.users where id=o.user_id for update;
  if not found then raise exception 'The customer account is not ready. Retry the account setup email first.'; end if;
  select * into e from public.user_enrollments where user_id=u.id and course_id=o.course_id for update;
  if found and e.payment_status in ('completed','staff') then
    raise exception 'This customer already has access. Check for a separate Stripe payment before confirming.';
  end if;
  -- Respect an in-flight Stripe purchase rather than racing its finalizer.
  if exists(select 1 from public.checkout_sessions where user_id=u.id and course_id=o.course_id
    and (status='pending' or (payment_state in ('paid','no_payment_required') and fulfillment_state <> 'fulfilled'))) then
    raise exception 'A Stripe checkout for this course is pending. Reconcile it before approving Whish.';
  end if;
  if u.points < o.points_to_spend then raise exception 'The customer no longer has the quoted points balance. Resolve the discount before approval.'; end if;
  if o.first_purchase_discount_applied and u.first_purchase_discount_used then
    raise exception 'The first-purchase offer has already been used. Resolve the discount before approval.';
  end if;
  if (o.discounts->'coupon'->>'valid')::boolean is true and o.coupon_id is null then
    raise exception 'The quoted coupon was removed. Resolve the discount before approval.';
  end if;
  if o.coupon_id is not null then
    select * into c from public.coupons where id=o.coupon_id for update;
    if (c.max_uses_total is not null and c.usage_count >= c.max_uses_total) or
      (c.max_uses_per_user is not null and (select count(*) from public.coupon_usages where coupon_id=c.id and user_id=u.id) >= c.max_uses_per_user) then
      raise exception 'The quoted coupon has since reached its usage limit. Resolve the discount before approval.';
    end if;
  end if;
  insert into public.user_enrollments(user_id,course_id,stripe_payment_intent_id,payment_status,amount_paid_cents,
    original_price_cents,discount_applied_cents,points_earned,coupon_id,first_purchase_discount_applied,updated_at)
  values(u.id,o.course_id,null,'completed',p_amount_cents,o.original_price_cents,o.original_price_cents-p_amount_cents,
    1000,o.coupon_id,o.first_purchase_discount_applied,now())
  on conflict(user_id,course_id) do update set stripe_payment_intent_id=null,payment_status='completed',
    amount_paid_cents=excluded.amount_paid_cents,original_price_cents=excluded.original_price_cents,
    discount_applied_cents=excluded.discount_applied_cents,points_earned=1000,coupon_id=excluded.coupon_id,
    first_purchase_discount_applied=excluded.first_purchase_discount_applied,updated_at=now()
  returning id into eid;
  update public.users set points=points-o.points_to_spend+1000,
    first_purchase_discount_used=first_purchase_discount_used or o.first_purchase_discount_applied,
    updated_at=now() where id=u.id;
  if o.points_to_spend>0 then
    insert into public.point_transactions(user_id,amount,type,reference_id,description)
    values(u.id,-o.points_to_spend,'spend',o.course_id,'Used for Whish purchase '||o.id);
  end if;
  insert into public.point_transactions(user_id,amount,type,reference_id,description)
  values(u.id,1000,'earn',o.course_id,'Earned from Whish purchase '||o.id);
  if o.coupon_id is not null then
    insert into public.coupon_usages(coupon_id,user_id,course_id) values(o.coupon_id,u.id,o.course_id) on conflict do nothing;
    if found then update public.coupons set usage_count=usage_count+1 where id=o.coupon_id; end if;
  end if;
  update public.whish_orders set status='confirmed',enrollment_id=eid,amount_received_cents=p_amount_cents,
    transfer_reference=btrim(p_transfer_reference),admin_note=left(p_note,2000),reviewed_by=p_actor_id,
    reviewed_at=now(),updated_at=now() where id=o.id;
  insert into public.whish_order_emails(order_id,kind) values(o.id,'approved') on conflict do nothing;
  return eid;
end $$;
revoke all on function public.claim_whish_email(uuid,text) from public,anon,authenticated;
revoke all on function public.review_whish_order(uuid,uuid,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.claim_whish_email(uuid,text) to service_role;
grant execute on function public.review_whish_order(uuid,uuid,text,integer,text,text) to service_role;

-- Read-only reporting projection. No Whish row is inserted into checkout_sessions.
create view public.payment_orders with (security_invoker=true) as
select checkout.*, 'stripe'::text as payment_provider from public.checkout_sessions checkout
union all
select projected.*, 'whish'::text as payment_provider
from public.whish_orders w join public.courses course on course.id=w.course_id
cross join lateral jsonb_populate_record(null::public.checkout_sessions, jsonb_build_object(
  'id',w.id,'email',w.email,'first_name',case when w.is_guest then w.first_name end,
  'last_name',case when w.is_guest then w.last_name end,'course_id',w.course_id,'user_id',w.user_id,
  'enrollment_id',w.enrollment_id,'coupon_id',w.coupon_id,'created_at',w.created_at,'updated_at',w.updated_at,
  'status',case w.status when 'confirmed' then 'completed' when 'cancelled' then 'failed' else 'pending' end,
  'payment_state',case w.status when 'confirmed' then 'paid' when 'cancelled' then 'failed' else 'pending' end,
  'fulfillment_state',case when w.status='confirmed' then case when course.deleted_at is null then 'fulfilled' else 'revoked' end
    when w.status='cancelled' then 'not_required' else 'pending' end,
  'original_price_cents',w.original_price_cents,'expected_amount_cents',coalesce(w.amount_received_cents,w.quoted_amount_cents),
  'points_to_spend',w.points_to_spend,'first_purchase_discount_applied',w.first_purchase_discount_applied,
  'completed_at',case when w.status='confirmed' then w.reviewed_at end,'duplicate_payment',false,
  'fulfillment_attempts',case when w.status='confirmed' then 1 else 0 end,
  'promotion_id',w.discounts->'promotion'->>'promotionId','promotion_name',w.discounts->'promotion'->>'name',
  'promotion_discount_percent',w.discounts->'promotion'->>'discountPercent',
  'promotion_discount_cents',coalesce((w.discounts->'promotion'->>'discountCents')::integer,0),
  'course_title_snapshot',w.course_title,'course_access_removed_at',course.deleted_at
)) projected;
revoke all on public.payment_orders from public,anon,authenticated;
grant select on public.payment_orders to service_role;

-- Create combined REPORTING functions from the installed versions. Keep every
-- original Stripe function, including all writers and recovery functions, intact.
do $copy_reporting$
declare f record; definition text; new_name text;
begin
  for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('admin_payments_dashboard','admin_payment_detail','admin_course_promotion_payment_stats')
  loop
    new_name:=f.proname||'_with_whish';
    definition:=pg_get_functiondef(f.oid);
    if position('public.checkout_sessions' in definition)=0 then raise exception 'Unexpected reporting function definition: %',f.proname; end if;
    definition:=replace(definition,'public.'||f.proname||'(','public.'||new_name||'(');
    definition:=replace(definition,'public.checkout_sessions','public.payment_orders');
    execute definition;
    execute format('revoke all on function public.%I(%s) from public,anon,authenticated',new_name,pg_get_function_identity_arguments(f.oid));
    execute format('grant execute on function public.%I(%s) to service_role',new_name,pg_get_function_identity_arguments(f.oid));
  end loop;
end $copy_reporting$;
notify pgrst, 'reload schema';
commit;
