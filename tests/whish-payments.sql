-- Integration checks against the installed schema. Everything is rolled back.
-- Run: npx supabase db query --linked --file tests/whish-payments.sql --output json
begin;
create temporary table whish_test_results (check_name text, result text);
do $test$
declare
  uid uuid := gen_random_uuid();
  cid uuid := gen_random_uuid();
  cid2 uuid := gen_random_uuid();
  coupon uuid := gen_random_uuid();
  oid uuid := gen_random_uuid();
  oid2 uuid := gen_random_uuid();
  stripe_oid uuid := gen_random_uuid();
  aid uuid;
  eid uuid;
  details jsonb;
  original_report jsonb;
  report jsonb;
  n bigint;
  fail boolean;
begin
  select id into aid from public.users where role='admin' limit 1;
  assert aid is not null, 'An administrator is required for this test';
  perform set_config('request.jwt.claims', jsonb_build_object('sub',aid,'role','service_role')::text,true);
  perform set_config('request.jwt.claim.sub',aid::text,true);
  original_report := public.admin_payments_dashboard(p_range=>'all');
  report := public.admin_payments_dashboard_with_whish(p_range=>'all');
  -- Course options with identical titles have no secondary order in the
  -- existing report; compare their set rather than that incidental ordering.
  assert original_report - 'courses' = report - 'courses', 'Baseline reports differ before test requests';
  assert (select jsonb_agg(item order by item->>'course_id') from jsonb_array_elements(original_report->'courses') item)
    = (select jsonb_agg(item order by item->>'course_id') from jsonb_array_elements(report->'courses') item), 'Course filter options differ';
  select count(*) into n from public.checkout_sessions;

  insert into auth.users(id,email,raw_user_meta_data) values(uid,uid||'@example.invalid','{"first_name":"Whish","last_name":"Rollback Test"}');
  update public.users set points=3000 where id=uid;
  insert into public.courses(id,slug,title,price_cents,is_published) values
    (cid,'whish-test-'||cid,'Whish rollback test',10000,true),
    (cid2,'whish-test-'||cid2,'Whish rollback conflict test',10000,true);
  insert into public.coupons(id,code,discount_type,discount_value,max_uses_total,max_uses_per_user)
    values(coupon,'WHISH-TEST-'||coupon,'percentage',10,10,1);
  insert into public.whish_orders(id,request_key,user_id,course_id,email,first_name,last_name,phone,course_title,
    recipient_number,original_price_cents,quoted_amount_cents,points_to_spend,first_purchase_discount_applied,coupon_id,discounts)
  values(oid,gen_random_uuid(),uid,cid,uid||'@example.invalid','Whish','Rollback Test','+96171123456','Whish rollback test',
    '+961 XX XXX XXX',10000,7000,1000,true,coupon,'{"coupon":{"valid":true},"promotion":{"applied":false}}');
  assert not exists(select 1 from public.user_enrollments where user_id=uid), 'Pending grants access';
  assert (select points=3000 from public.users where id=uid), 'Pending consumes points';
  report := public.admin_payments_dashboard_with_whish(p_range=>'all');
  assert report#>>'{summary,settled_sales_cents}'=original_report#>>'{summary,settled_sales_cents}', 'Pending counted as sales';
  insert into whish_test_results values('Pending request: no access, points, or sales','PASS');

  fail:=false;
  begin perform public.review_whish_order(oid,uid,'confirm',7000,'ROLLBACK-ONE');
  exception when insufficient_privilege then fail:=true; end;
  assert fail, 'Non-admin approved payment';
  fail:=false;
  begin perform public.review_whish_order(oid,aid,'confirm',6500,'ROLLBACK-ONE');
  exception when raise_exception then fail:=true; end;
  assert fail, 'Amount mismatch accepted without note';
  insert into whish_test_results values('Unauthorized approval and unexplained price mismatch blocked','PASS');

  eid := public.review_whish_order(oid,aid,'confirm',7000,'ROLLBACK-ONE');
  assert exists(select 1 from public.user_enrollments where id=eid and payment_status='completed' and amount_paid_cents=7000 and stripe_payment_intent_id is null), 'Enrollment mismatch';
  assert (select points=3000 and first_purchase_discount_used from public.users where id=uid), 'Benefits mismatch';
  assert (select count(*)=2 from public.point_transactions where user_id=uid), 'Missing points ledger';
  assert (select usage_count=1 from public.coupons where id=coupon), 'Coupon counter mismatch';
  assert exists(select 1 from public.coupon_usages where user_id=uid and coupon_id=coupon), 'Coupon use missing';
  assert public.review_whish_order(oid,aid,'confirm',7000,'ROLLBACK-ONE')=eid, 'Retry result mismatch';
  assert (select count(*)=2 from public.point_transactions where user_id=uid), 'Retry duplicated points';
  assert (select count(*)=n from public.checkout_sessions), 'Whish wrote a Stripe checkout';
  report := public.admin_payments_dashboard_with_whish(p_range=>'all');
  assert (report#>>'{summary,settled_sales_cents}')::bigint=(original_report#>>'{summary,settled_sales_cents}')::bigint+7000, 'Sales total wrong';
  details := public.admin_payment_detail_with_whish(oid);
  assert (details#>>'{order,expected_amount_cents}')::int=7000, 'Detail amount wrong';
  assert details#>>'{order,stripe_payment_intent_id}' is null, 'Fake Stripe identifier';
  insert into whish_test_results values('Approval, normal enrollment, points/coupon, reports, idempotence, Stripe isolation','PASS');

  assert (select count(*)=1 from public.claim_whish_email(oid,'approved')), 'Email not claimable';
  assert (select count(*)=0 from public.claim_whish_email(oid,'approved')), 'Duplicate email claim';
  update public.whish_order_emails set state='failed',claimed_at=null where order_id=oid and kind='approved';
  assert (select count(*)=1 from public.claim_whish_email(oid,'approved')), 'Failed email not retryable';
  assert exists(select 1 from public.user_enrollments where id=eid and payment_status='completed'), 'Email failure removed access';
  update public.whish_orders set is_guest=true where id=oid;
  assert (select count(*)=1 from public.claim_whish_email(oid,'password')), 'Confirmed guest cannot recover setup email';
  assert (select count(*)=0 from public.claim_whish_email(oid,'instructions')), 'Confirmed order resends pending instructions';
  insert into whish_test_results values('Email retry/claim does not duplicate or reverse enrollment','PASS');

  insert into public.whish_orders(id,request_key,user_id,course_id,email,first_name,last_name,phone,course_title,
    recipient_number,original_price_cents,quoted_amount_cents,points_to_spend)
  values(oid2,gen_random_uuid(),uid,cid2,uid||'@example.invalid','Whish','Rollback Test','+96171123456','Whish conflict test',
    '+961 XX XXX XXX',10000,7000,4000);
  fail:=false;
  begin perform public.review_whish_order(oid2,aid,'confirm',7000,'ROLLBACK-TWO');
  exception when raise_exception then fail:=position('points balance' in sqlerrm)>0; end;
  assert fail, 'Insufficient points accepted';
  assert (select status='pending' from public.whish_orders where id=oid2), 'Failure partially approved request';
  assert not exists(select 1 from public.user_enrollments where user_id=uid and course_id=cid2), 'Failure granted access';
  update public.whish_orders set points_to_spend=0 where id=oid2;
  insert into public.checkout_sessions(id,course_id,email) values(stripe_oid,cid2,uid||'@example.invalid');
  fail:=false;
  begin perform public.review_whish_order(oid2,aid,'confirm',7000,'ROLLBACK-TWO');
  exception when raise_exception then fail:=position('Stripe checkout' in sqlerrm)>0; end;
  assert fail, 'Pending guest Stripe checkout was ignored';
  delete from public.checkout_sessions where id=stripe_oid;
  update public.courses set deleted_at=now() where id=cid2;
  fail:=false;
  begin perform public.review_whish_order(oid2,aid,'confirm',7000,'ROLLBACK-TWO');
  exception when raise_exception then fail:=position('course has been removed' in sqlerrm)>0; end;
  assert fail, 'Deleted course was approved';
  update public.courses set deleted_at=null where id=cid2;
  update public.whish_orders set first_purchase_discount_applied=true where id=oid2;
  fail:=false;
  begin perform public.review_whish_order(oid2,aid,'confirm',7000,'ROLLBACK-TWO');
  exception when raise_exception then fail:=position('first-purchase offer' in sqlerrm)>0; end;
  assert fail, 'First-purchase offer used twice';
  update public.whish_orders set first_purchase_discount_applied=false where id=oid2;
  insert into whish_test_results values('Pending guest Stripe checkout, removed course, reused first-purchase offer blocked','PASS');
  fail:=false;
  begin perform public.review_whish_order(oid2,aid,'confirm',7000,'ROLLBACK-ONE');
  exception when unique_violation then fail:=true; end;
  assert fail, 'Reused transfer accepted';
  assert (select points=3000 from public.users where id=uid), 'Failed transfer changed benefits';
  insert into whish_test_results values('Insufficient points and duplicate transfer roll back completely','PASS');

  insert into public.user_enrollments(user_id,course_id,payment_status,amount_paid_cents,original_price_cents,stripe_payment_intent_id)
    values(uid,cid2,'refunded',10000,10000,'pi_whish_rollback_test');
  fail:=false;
  begin perform public.review_whish_order(oid2,aid,'confirm',7000,'ROLLBACK-TWO');
  exception when raise_exception then fail:=position('Stripe payment history' in sqlerrm)>0; end;
  assert fail, 'Reused a Stripe-linked enrollment';
  perform public.review_whish_order(oid2,aid,'cancel',null,null,'Rollback cancellation test');
  assert (select status='cancelled' from public.whish_orders where id=oid2), 'Cancellation missing';
  assert not exists(select 1 from public.user_enrollments where user_id=uid and course_id=cid2 and payment_status='completed'), 'Cancellation granted access';
  insert into whish_test_results values('Stripe-history guard and cancellation','PASS');

  assert not has_table_privilege('anon','public.whish_orders','SELECT'), 'Anonymous can read Whish';
  assert not has_table_privilege('authenticated','public.whish_orders','UPDATE'), 'Authenticated can approve Whish';
  assert not has_function_privilege('authenticated','public.review_whish_order(uuid,uuid,text,integer,text,text)','EXECUTE'), 'Authenticated can call approval';
  assert not has_table_privilege('authenticated','public.payment_orders','SELECT'), 'Combined view is directly accessible';
  insert into whish_test_results values('Table/view/function privileges','PASS');
end $test$;
select * from whish_test_results;
rollback;
