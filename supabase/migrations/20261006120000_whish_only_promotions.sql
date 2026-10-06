begin;

-- Separate definitions: existing course promotions and all Stripe functions
-- remain untouched. Paid-order snapshots live in whish_orders.discounts.
create table public.whish_promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  applies_to_all_courses boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create table public.whish_promotion_courses (
  promotion_id uuid not null references public.whish_promotions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (promotion_id,course_id)
);
create index whish_promotions_window on public.whish_promotions(is_active,starts_at,ends_at);
create index whish_promotion_courses_course on public.whish_promotion_courses(course_id,promotion_id);
alter table public.whish_promotions enable row level security;
alter table public.whish_promotion_courses enable row level security;
revoke all on public.whish_promotions,public.whish_promotion_courses from public,anon,authenticated;
grant all on public.whish_promotions,public.whish_promotion_courses to service_role;

-- Reuse the installed atomic admin-save validation without changing its original.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.save_course_promotion(uuid,text,numeric,timestamptz,timestamptz,boolean,boolean,uuid[])'::regprocedure);
  if position('public.course_promotions' in definition)=0 or position('public.course_promotion_courses' in definition)=0 then
    raise exception 'Unexpected promotion save function. No changes applied.';
  end if;
  definition := replace(definition,'public.save_course_promotion(','public.save_whish_promotion(');
  definition := replace(definition,'public.course_promotions','public.whish_promotions');
  definition := replace(definition,'public.course_promotion_courses','public.whish_promotion_courses');
  execute definition;
end $$;
revoke all on function public.save_whish_promotion(uuid,text,numeric,timestamptz,timestamptz,boolean,boolean,uuid[]) from public,anon,authenticated;
grant execute on function public.save_whish_promotion(uuid,text,numeric,timestamptz,timestamptz,boolean,boolean,uuid[]) to service_role;

create function public.get_active_whish_promotion(p_course_id uuid,p_remaining_price_cents integer)
returns table(promotion_id uuid,promotion_name text,discount_percent numeric,discount_amount_cents integer,starts_at timestamptz,ends_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select p.id,p.name,p.discount_percent,
    least(floor(p_remaining_price_cents * p.discount_percent / 100)::integer,p_remaining_price_cents),p.starts_at,p.ends_at
  from public.courses c join public.whish_promotions p
    on p.is_active and p.starts_at <= now() and p.ends_at > now()
    and (p.applies_to_all_courses or exists(select 1 from public.whish_promotion_courses a where a.promotion_id=p.id and a.course_id=c.id))
  where c.id=p_course_id and c.deleted_at is null
    and p_remaining_price_cents > 0 and p_remaining_price_cents <= c.price_cents
  order by p.discount_percent desc,p.starts_at desc,p.created_at desc,p.id
  limit 1;
$$;
revoke all on function public.get_active_whish_promotion(uuid,integer) from public,anon,authenticated;
grant execute on function public.get_active_whish_promotion(uuid,integer) to service_role;

-- A separate reporting helper keeps existing payment reports unchanged.
-- Reuse their exact range/status/discount filters, but count Whish-only snapshots.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.admin_course_promotion_payment_stats_with_whish(uuid,text,text,text,text)'::regprocedure);
  if position('FROM public.payment_orders AS checkout' in definition)=0
    or position('checkout.promotion_discount_cents,' in definition)=0
    or position('AND NOT first_purchase_discount_applied' in definition)=0 then
    raise exception 'Unexpected payment statistics function. No changes applied.';
  end if;
  definition := replace(definition,'public.admin_course_promotion_payment_stats_with_whish(','public.admin_whish_only_promotion_payment_stats(');
  definition := replace(definition,'checkout.promotion_discount_cents,',
    'coalesce((whish.discounts #>> ''{whishPromotion,discountCents}'')::integer,0) AS promotion_discount_cents, checkout.promotion_discount_cents AS general_promotion_cents,');
  definition := replace(definition,'FROM public.payment_orders AS checkout',
    'FROM public.payment_orders AS checkout LEFT JOIN public.whish_orders whish ON checkout.payment_provider = ''whish'' AND whish.id = checkout.id');
  definition := replace(definition,'AND NOT first_purchase_discount_applied',
    'AND coalesce(general_promotion_cents,0) = 0 AND NOT first_purchase_discount_applied');
  execute definition;
end $$;
revoke all on function public.admin_whish_only_promotion_payment_stats(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_whish_only_promotion_payment_stats(uuid,text,text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
