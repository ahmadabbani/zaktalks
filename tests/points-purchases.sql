-- Isolated database fixtures, never retained. No Stripe/Resend requests.
begin;
create temporary table points_test_results(check_name text, result text);
do $test$
declare
  uid uuid := gen_random_uuid();
  gid uuid := gen_random_uuid();
  cid uuid := gen_random_uuid();
  cid2 uuid := gen_random_uuid();
  cid3 uuid := gen_random_uuid();
  oid uuid;
  wid uuid := gen_random_uuid();
  aid uuid;
  eid uuid;
  result record;
  rejected boolean;
  invalid integer;
begin
  select id into aid from public.users where role='admin' limit 1;
  assert aid is not null, 'Admin needed';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',aid,'role','service_role')::text,true);
  perform set_config('request.jwt.claim.sub',aid::text,true);
  insert into auth.users(id,email,raw_user_meta_data) values(uid,uid||'@example.invalid','{"first_name":"Points","last_name":"Rollback"}');
  update public.users set points=7000 where id=uid;
  insert into public.courses(id,slug,title,price_cents,is_published) values
    (cid,'points-test-'||cid,'Points test',120000,true),
    (cid2,'points-test-'||cid2,'Guest points test',120000,true),
    (cid3,'points-test-'||cid3,'Legacy quote test',120000,true);

  foreach invalid in array array[1000,4000,5001,-5000] loop
    rejected := false;
    begin
      perform public.create_checkout_order_with_points_policy(uid||'@example.invalid',null,null,cid,uid,null,120000,108075,invalid,false);
    exception when raise_exception then rejected := true; end;
    assert rejected, 'Invalid new Stripe redemption accepted';
  end loop;
  oid := public.create_checkout_order_with_points_policy(uid||'@example.invalid',null,null,cid,uid,null,120000,108075,5000,false);
  update public.checkout_sessions set stripe_session_id='cs_points_'||oid where id=oid;
  select * into result from public.finalize_course_purchase('cs_points_'||oid,uid,cid,'pi_points_'||oid,108075,120000,false,5000,null);
  eid := result.enrollment_id;
  assert not result.already_processed and not result.duplicate_payment, 'First fulfillment flags';
  assert (select points_earned=1080 and amount_paid_cents=108075 and payment_status='completed' from public.user_enrollments where id=eid), 'Stripe reward/access mismatch';
  assert (select points=3080 from public.users where id=uid), 'Stripe spend/earn mismatch';
  assert (select sum(amount)=-3920 and count(*)=2 from public.point_transactions where user_id=uid), 'Stripe ledger mismatch';
  select * into result from public.finalize_course_purchase('cs_points_'||oid,uid,cid,'pi_points_'||oid,108075,120000,false,5000,null);
  assert result.already_processed, 'Replay not recognized';
  assert (select points=3080 from public.users where id=uid), 'Replay duplicated reward';
  insert into points_test_results values('Stripe 5,000 spend, paid-price reward, fractional rounding, access, retry','PASS');

  -- A distinct duplicate payment must not award or consume points again.
  insert into public.checkout_sessions(email,course_id,user_id,stripe_session_id,original_price_cents,expected_amount_cents)
    values(uid||'@example.invalid',cid,uid,'cs_duplicate_'||oid,120000,120000);
  select * into result from public.finalize_course_purchase('cs_duplicate_'||oid,uid,cid,'pi_duplicate_'||oid,120000,120000,false,0,null);
  assert result.duplicate_payment, 'Duplicate charge not detected';
  assert (select points=3080 from public.users where id=uid), 'Duplicate charge changed reward';
  perform public.sync_payment_access_state('pi_points_'||oid,'refunded',true);
  assert (select points=7000 from public.users where id=uid), 'Refund must reverse exact reward and restore spent points';
  assert (select payment_status='refunded' from public.user_enrollments where id=eid), 'Refund did not revoke access';
  insert into points_test_results values('Duplicate protection and exact reward reversal on refund','PASS');

  -- Reserve as a guest, then resolve the account as the existing finalizer does.
  oid := public.create_checkout_order(gid||'@example.invalid','Guest','Points',cid2,null,null,120000,99,0,true);
  update public.checkout_sessions set stripe_session_id='cs_guest_'||oid where id=oid;
  insert into auth.users(id,email,raw_user_meta_data) values(gid,gid||'@example.invalid','{"first_name":"Guest","last_name":"Points"}');
  select * into result from public.finalize_course_purchase('cs_guest_'||oid,gid,cid2,'pi_guest_'||oid,99,120000,true,0,null);
  assert (select points_earned=0 and payment_status='completed' from public.user_enrollments where id=result.enrollment_id), 'Sub-dollar guest reward/access mismatch';
  assert (select first_purchase_discount_used from public.users where id=gid), 'Guest first-purchase behavior changed';
  insert into points_test_results values('Guest finalization and sub-dollar reward without blocking enrollment','PASS');

  -- Existing quotes can contain old 1,000-point reservations. Updates simulate
  -- that historical snapshot, not a new user request (all fixtures roll back).
  oid := public.create_checkout_order(uid||'@example.invalid',null,null,cid3,uid,null,120000,120000,0,false);
  update public.checkout_sessions set stripe_session_id='cs_legacy_'||oid,points_to_spend=1000 where id=oid;
  select * into result from public.finalize_course_purchase('cs_legacy_'||oid,uid,cid3,'pi_legacy_'||oid,120000,120000,false,1000,null);
  assert (select points=7200 from public.users where id=uid), 'Old Stripe quote rejected or miscomputed';
  insert into points_test_results values('Previously reserved Stripe points remain fulfillable','PASS');

  rejected := false;
  begin
    insert into public.whish_orders(id,request_key,user_id,course_id,email,first_name,last_name,phone,course_title,recipient_number,original_price_cents,quoted_amount_cents,points_to_spend,discounts)
      values(wid,gen_random_uuid(),gid,cid3,gid||'@example.invalid','Guest','Points','+96171123456','Legacy quote test','+96170000000',120000,100000,1000,'{"pointsRedemptionStep":5000}');
  exception when raise_exception then rejected := true; end;
  assert rejected, 'Invalid new Whish redemption accepted';
  update public.users set points=7000 where id=gid;
  insert into public.whish_orders(id,request_key,user_id,course_id,email,first_name,last_name,phone,course_title,recipient_number,original_price_cents,quoted_amount_cents,points_to_spend)
    values(wid,gen_random_uuid(),gid,cid3,gid||'@example.invalid','Guest','Points','+96171123456','Legacy quote test','+96170000000',120000,100000,0);
  update public.whish_orders set points_to_spend=1000 where id=wid;
  eid := public.review_whish_order(wid,aid,'confirm',90075,'POINTS-'||wid,'Actual transfer differs from quote');
  assert (select points_earned=900 and amount_paid_cents=90075 from public.user_enrollments where id=eid), 'Whish must use actual amount, not quote';
  assert (select points=6900 from public.users where id=gid), 'Old Whish quote or actual-price reward mismatch';
  assert public.review_whish_order(wid,aid,'confirm',90075,'POINTS-'||wid)=eid, 'Whish retry failed';
  assert (select points=6900 from public.users where id=gid), 'Whish retry duplicated reward';
  insert into points_test_results values('Whish legacy quote, actual received amount, fractional rounding, retry','PASS');

  assert not has_function_privilege('authenticated','public.finalize_course_purchase(text,uuid,uuid,text,integer,integer,boolean,integer,uuid)','EXECUTE'), 'Stripe privileges weakened';
  assert not has_function_privilege('authenticated','public.review_whish_order(uuid,uuid,text,integer,text,text)','EXECUTE'), 'Whish privileges weakened';
  insert into points_test_results values('Payment function permissions unchanged','PASS');
end $test$;
select * from points_test_results;
rollback;
