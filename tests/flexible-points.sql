begin;
create temporary table flexible_points_results(check_name text, result text);
do $test$
declare
  uid uuid := gen_random_uuid();
  wid uuid := gen_random_uuid();
  cid uuid;
  wcid uuid;
  oid uuid;
  wo uuid;
  aid uuid;
  eid uuid;
  selected integer;
  paid integer;
  invalid integer;
  rejected boolean;
  fulfilled record;
begin
  select id into aid from public.users where role='admin' limit 1;
  assert aid is not null, 'Admin needed';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',aid,'role','service_role')::text,true);
  perform set_config('request.jwt.claim.sub',aid::text,true);
  insert into auth.users(id,email,raw_user_meta_data) values
    (uid,uid||'@example.invalid','{"first_name":"Flexible","last_name":"Stripe"}'),
    (wid,wid||'@example.invalid','{"first_name":"Flexible","last_name":"Whish"}');
  foreach selected in array array[5000,6000,7000] loop
    cid := gen_random_uuid(); wcid := gen_random_uuid(); wo := gen_random_uuid();
    update public.users set points=7000 where id in (uid,wid);
    insert into public.courses(id,slug,title,price_cents,is_published) values
      (cid,'flexible-test-'||cid,'Flexible Stripe points',120000,true),
      (wcid,'flexible-test-'||wcid,'Flexible Whish points',120000,true);
    -- 10% per 5,000 points; verified prices: 108000, 105600, 103200.
    paid := 120000 - (120000::bigint * selected / 50000)::integer;
    oid := public.create_checkout_order_with_points_policy(uid||'@example.invalid',null,null,cid,uid,null,120000,paid,selected,false);
    update public.checkout_sessions set stripe_session_id='cs_flexible_'||oid where id=oid;
    select * into fulfilled from public.finalize_course_purchase('cs_flexible_'||oid,uid,cid,'pi_flexible_'||oid,paid,120000,false,selected,null);
    eid := fulfilled.enrollment_id;
    assert (select points=7000-selected+paid/100 from public.users where id=uid), 'Stripe balance mismatch';
    assert (select payment_status='completed' and points_earned=paid/100 and amount_paid_cents=paid from public.user_enrollments where id=eid), 'Stripe reward/access mismatch';
    assert (select amount=-selected from public.point_transactions where user_id=uid and reference_id=cid and type='spend'), 'Stripe ledger mismatch';
    perform public.finalize_course_purchase('cs_flexible_'||oid,uid,cid,'pi_flexible_'||oid,paid,120000,false,selected,null);
    assert (select points=7000-selected+paid/100 from public.users where id=uid), 'Stripe retry changed balance';
    perform public.sync_payment_access_state('pi_flexible_'||oid,'refunded',true);
    assert (select points=7000 from public.users where id=uid), 'Stripe refund mismatch';

    insert into public.whish_orders(id,request_key,user_id,course_id,email,first_name,last_name,phone,course_title,recipient_number,original_price_cents,quoted_amount_cents,points_to_spend,discounts)
      values(wo,gen_random_uuid(),wid,wcid,wid||'@example.invalid','Flexible','Whish','+96171123456','Flexible Whish points','+96170000000',120000,paid,selected,'{"pointsMinimum":5000,"pointsRedemptionStep":1000}');
    assert (select points=7000 from public.users where id=wid), 'Pending Whish consumed points';
    eid := public.review_whish_order(wo,aid,'confirm',paid,'FLEXIBLE-'||wo);
    assert (select points=7000-selected+paid/100 from public.users where id=wid), 'Whish balance mismatch';
    assert (select payment_status='completed' and points_earned=paid/100 and amount_paid_cents=paid from public.user_enrollments where id=eid), 'Whish reward/access mismatch';
    assert public.review_whish_order(wo,aid,'confirm',paid,'FLEXIBLE-'||wo)=eid, 'Whish retry mismatch';
    assert (select points=7000-selected+paid/100 from public.users where id=wid), 'Whish retry changed balance';
    insert into flexible_points_results values(selected||' points: Stripe + Whish spend, rewards, access, retries; Stripe refund','PASS');
  end loop;

  cid := gen_random_uuid();
  insert into public.courses(id,slug,title,price_cents,is_published) values(cid,'flexible-invalid-'||cid,'Invalid points test',120000,true);
  update public.users set points=7000 where id=uid;
  foreach invalid in array array[-1000,1000,4000,5001,6500,10000] loop
    rejected := false;
    begin
      perform public.create_checkout_order_with_points_policy(uid||'@example.invalid',null,null,cid,uid,null,120000,120000,invalid,false);
    exception when raise_exception then rejected := true; end;
    assert rejected, 'Invalid/over-balance Stripe selection accepted';
  end loop;
  foreach invalid in array array[1000,4000,5001,6500] loop
    rejected := false;
    begin
      insert into public.whish_orders(request_key,user_id,course_id,email,first_name,last_name,phone,course_title,recipient_number,original_price_cents,quoted_amount_cents,points_to_spend,discounts)
        values(gen_random_uuid(),uid,cid,uid||'@example.invalid','Flexible','Invalid','+96171123456','Invalid points test','+96170000000',120000,120000,invalid,'{"pointsMinimum":5000,"pointsRedemptionStep":1000}');
    exception when raise_exception then rejected := true; end;
    assert rejected, 'Invalid new Whish selection accepted';
  end loop;
  assert (select points=7000 from public.users where id=uid), 'Rejected quote changed balance';
  insert into flexible_points_results values('Minimum, increments, balance guard and rollback','PASS');
  assert not has_function_privilege('authenticated','public.create_checkout_order_with_points_policy(text,text,text,uuid,uuid,uuid,integer,integer,integer,boolean,timestamptz)','EXECUTE'), 'Quote permissions changed';
  assert not has_function_privilege('anon','public.validate_new_whish_points()','EXECUTE'), 'Whish permissions changed';
  insert into flexible_points_results values('Service-role-only permissions preserved','PASS');
end $test$;
select * from flexible_points_results;
rollback;
