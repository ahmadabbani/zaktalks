begin;

-- Independent lifecycle metadata; payment finalizers and their ACLs are untouched.
create table public.user_points_cycles (
  user_id uuid primary key references public.users(id) on delete cascade,
  first_earned_at timestamptz not null,
  cycle_started_at timestamptz,
  resets_at timestamptz,
  last_reset_at timestamptz,
  check ((cycle_started_at is null) = (resets_at is null)),
  check (resets_at is null or resets_at > cycle_started_at)
);
create index user_points_cycles_due on public.user_points_cycles(resets_at) where resets_at is not null;
alter table public.user_points_cycles enable row level security;
revoke all on public.user_points_cycles from public,anon,authenticated;
grant all on public.user_points_cycles to service_role;

create function public.points_reset_deadline(p_earned_at timestamptz)
returns timestamptz language plpgsql immutable strict security invoker set search_path='' as $$
declare anniversary timestamp; deadline timestamp;
begin
  anniversary := (p_earned_at at time zone 'Asia/Beirut') + interval '1 year';
  deadline := date_trunc('day',anniversary) + interval '4 hours';
  if deadline < anniversary then deadline := deadline + interval '1 day'; end if;
  return deadline at time zone 'Asia/Beirut';
end $$;
revoke all on function public.points_reset_deadline(timestamptz) from public,anon,authenticated;
grant execute on function public.points_reset_deadline(timestamptz) to service_role;

-- Existing genuine reward history determines the original start, not deployment.
insert into public.user_points_cycles(user_id,first_earned_at,cycle_started_at,resets_at)
select user_id,min(created_at),min(created_at),public.points_reset_deadline(min(created_at))
from public.point_transactions where type='earn' and amount>0 group by user_id;

-- Read the reward already written by Stripe/Whish. No reward/enrollment changes.
create function public.start_points_cycle_from_reward()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.type='earn' and new.amount>0 then
    insert into public.user_points_cycles(user_id,first_earned_at,cycle_started_at,resets_at)
    values(new.user_id,new.created_at,new.created_at,public.points_reset_deadline(new.created_at))
    on conflict(user_id) do update
      set cycle_started_at=excluded.cycle_started_at,resets_at=excluded.resets_at
      where public.user_points_cycles.cycle_started_at is null;
  end if;
  return new;
end $$;
revoke all on function public.start_points_cycle_from_reward() from public,anon,authenticated;
grant execute on function public.start_points_cycle_from_reward() to service_role;
create trigger start_points_cycle_from_reward after insert on public.point_transactions
for each row when(new.type='earn' and new.amount>0) execute function public.start_points_cycle_from_reward();

create function public.reset_due_points_balances(p_limit integer default 1000)
returns integer language plpgsql security invoker set search_path='' as $$
declare item record; deadline timestamptz; expired_points integer; reset_count integer:=0;
begin
  if p_limit is null or p_limit<1 or p_limit>10000 then raise exception 'Invalid reset batch size'; end if;
  -- Same lock order as purchases: user first, then cycle metadata. Never inspect
  -- or modify payment/checkout rows; pending-payment protection is not enabled.
  for item in
    select u.id from public.users u join public.user_points_cycles c on c.user_id=u.id
    where c.resets_at<=now() order by c.resets_at,u.id limit p_limit
    for update of u skip locked
  loop
    select resets_at into deadline from public.user_points_cycles where user_id=item.id for update;
    if deadline is null or deadline>now() then continue; end if;
    select greatest(points,0) into expired_points from public.users where id=item.id;
    -- Preserve negative refund debt, if any; clear the entire positive balance.
    update public.users set points=least(points,0),updated_at=now() where id=item.id;
    update public.user_points_cycles set cycle_started_at=null,resets_at=null,last_reset_at=now() where user_id=item.id;
    if expired_points>0 then
      insert into public.point_transactions(user_id,amount,type,description)
      values(item.id,-expired_points,'expire','Remaining points expired after the one-year earning period');
    end if;
    reset_count:=reset_count+1;
  end loop;
  return reset_count;
end $$;
revoke all on function public.reset_due_points_balances(integer) from public,anon,authenticated;
grant execute on function public.reset_due_points_balances(integer) to service_role;

-- Hourly UTC checks cover Lebanon's winter/summer 4 AM without changing dates.
-- Only rows whose saved timestamp is due are reset. No external API or email.
create extension if not exists pg_cron;
select cron.schedule('okayness-yearly-points-reset','0 * * * *','select public.reset_due_points_balances(10000);');
notify pgrst,'reload schema';
commit;
