-- Database fixtures are rolled back. No real purchase, reset, or email.
begin;
create temporary table points_expiry_checks(check_name text,result text);
do $test$
declare uid uuid:=gen_random_uuid(); first_reward timestamptz; reset_count integer;
begin
  assert public.points_reset_deadline('2026-10-10 14:00:00+03')='2027-10-11 04:00:00+03'::timestamptz;
  assert public.points_reset_deadline('2026-12-20 02:00:00+02')='2027-12-20 04:00:00+02'::timestamptz;
  assert public.points_reset_deadline('2026-12-20 14:00:00+02')='2027-12-21 04:00:00+02'::timestamptz;
  assert public.points_reset_deadline('2024-02-29 14:00:00+02')='2025-03-01 04:00:00+02'::timestamptz;
  assert public.points_reset_deadline('2026-06-01 04:00:00+03')='2027-06-01 04:00:00+03'::timestamptz;
  insert into points_expiry_checks values('One calendar year, next 4 AM Lebanon time, summer/winter and leap year','PASS');
  -- Do not expire genuine accounts during the test.
  update public.user_points_cycles set resets_at=now()+interval '2 years' where resets_at<=now();
  insert into auth.users(id,email,raw_user_meta_data) values(uid,uid||'@example.invalid','{"first_name":"Expiry","last_name":"Test"}');
  update public.users set points=6000 where id=uid;
  first_reward:=now()-interval '2 years';
  insert into public.point_transactions(user_id,amount,type,created_at) values(uid,1000,'earn',first_reward);
  assert (select cycle_started_at=first_reward and first_earned_at=first_reward from public.user_points_cycles where user_id=uid);
  insert into public.point_transactions(user_id,amount,type) values(uid,5000,'earn');
  assert (select cycle_started_at=first_reward from public.user_points_cycles where user_id=uid), 'Later earnings extended cycle';
  reset_count:=public.reset_due_points_balances();
  assert reset_count=1;
  assert (select points=0 from public.users where id=uid), 'Entire balance not reset';
  assert (select amount=-6000 from public.point_transactions where user_id=uid and type='expire'), 'Reset audit amount incorrect';
  assert (select cycle_started_at is null and resets_at is null and last_reset_at is not null from public.user_points_cycles where user_id=uid);
  assert public.reset_due_points_balances()=0, 'Repeated reset was not idempotent';
  update public.users set points=1200 where id=uid;
  insert into public.point_transactions(user_id,amount,type) values(uid,1200,'earn');
  assert (select cycle_started_at=now() and first_earned_at=first_reward and resets_at=public.points_reset_deadline(now()) from public.user_points_cycles where user_id=uid), 'Next earned purchase did not start new year';
  insert into public.point_transactions(user_id,amount,type) values(uid,500,'refund_points_restore');
  assert (select cycle_started_at=now() from public.user_points_cycles where user_id=uid), 'Refund altered cycle';
  assert public.reset_due_points_balances()=0, 'Future cycle reset early';
  insert into points_expiry_checks values('All points reset, no extension, idempotent, next reward starts new year, refund does not restart','PASS');
  assert not has_table_privilege('anon','public.user_points_cycles','select');
  assert not has_table_privilege('authenticated','public.user_points_cycles','update');
  assert not has_function_privilege('authenticated','public.reset_due_points_balances(integer)','execute');
  assert (select relrowsecurity from pg_class where oid='public.user_points_cycles'::regclass);
  assert exists(select 1 from cron.job where jobname='okayness-yearly-points-reset' and active and schedule='0 * * * *');
  delete from public.users where id=uid;
  assert not exists(select 1 from public.user_points_cycles where user_id=uid), 'Account deletion did not cascade';
  insert into points_expiry_checks values('RLS, privileges, hourly database job, account-deletion cascade','PASS');
end $test$;
select * from points_expiry_checks;
rollback;
