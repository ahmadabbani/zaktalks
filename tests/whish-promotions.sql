-- All fixtures and changes are rolled back; no real email is sent.
begin;
create temporary table whish_promotion_checks(check_name text,result text);
do $test$
declare
  cid uuid:=gen_random_uuid(); other_cid uuid:=gen_random_uuid(); uid uuid:=gen_random_uuid(); aid uuid;
  pid uuid; general_id uuid; future_id uuid; oid uuid:=gen_random_uuid(); eid uuid;
  offer record; general_offer record; saved jsonb; baseline bigint;
begin
  select id into aid from public.users where role='admin' limit 1;
  assert aid is not null;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',aid,'role','service_role')::text,true);
  perform set_config('request.jwt.claim.sub',aid::text,true);
  -- Isolate offer matching, within this rollback-only transaction.
  update public.course_promotions set is_active=false;
  update public.whish_promotions set is_active=false;
  insert into public.courses(id,slug,title,price_cents,is_published) values
    (cid,'whish-offer-test-'||cid,'Promotion test',100000,true),
    (other_cid,'whish-offer-test-'||other_cid,'Other course',100000,true);
  general_id:=public.save_course_promotion(null,'General offer',10,now()-interval '1 day',now()+interval '1 day',true,false,array[cid]);
  pid:=public.save_whish_promotion(null,'Transfer Special',20,now()-interval '1 day',now()+interval '1 day',true,false,array[cid]);
  future_id:=public.save_whish_promotion(null,'Future offer',30,now()+interval '1 day',now()+interval '2 days',true,true,array[]::uuid[]);
  select * into general_offer from public.get_active_course_promotion(cid);
  assert general_offer.promotion_id=general_id and general_offer.discount_amount_cents=10000;
  select * into offer from public.get_active_whish_promotion(cid,90000);
  assert offer.promotion_id=pid and offer.discount_amount_cents=18000;
  assert not exists(select 1 from public.get_active_whish_promotion(other_cid,100000)), 'Selected-course scope or future date failed';
  update public.whish_promotions set is_active=false where id=pid;
  assert not exists(select 1 from public.get_active_whish_promotion(cid,90000)), 'Disabled offer applied';
  update public.whish_promotions set is_active=true,ends_at=now()-interval '1 hour',starts_at=now()-interval '2 days' where id=pid;
  assert not exists(select 1 from public.get_active_whish_promotion(cid,90000)), 'Expired offer applied';
  perform public.save_whish_promotion(pid,'Transfer Special',20,now()-interval '1 day',now()+interval '1 day',true,true,array[]::uuid[]);
  assert exists(select 1 from public.get_active_whish_promotion(other_cid,100000)), 'All-course edit failed';
  assert not exists(select 1 from public.whish_promotion_courses where promotion_id=pid), 'Old assignments retained';
  assert (select promotion_id=general_id from public.get_active_course_promotion(cid)), 'Whish altered general offer selection';
  insert into whish_promotion_checks values('General isolation, selected/all courses, future/expired/disabled dates, edit','PASS');
  assert not has_table_privilege('anon','public.whish_promotions','select');
  assert not has_table_privilege('authenticated','public.whish_promotions','insert');
  assert not has_function_privilege('authenticated','public.save_whish_promotion(uuid,text,numeric,timestamptz,timestamptz,boolean,boolean,uuid[])','execute');
  assert not has_function_privilege('anon','public.get_active_whish_promotion(uuid,integer)','execute');
  assert (select relrowsecurity from pg_class p where p.oid='public.whish_promotions'::regclass);
  assert (select relrowsecurity from pg_class p where p.oid='public.whish_promotion_courses'::regclass);
  insert into whish_promotion_checks values('RLS and service-only table/function privileges','PASS');
  insert into auth.users(id,email,raw_user_meta_data) values(uid,uid||'@example.invalid','{"first_name":"Offer","last_name":"Test"}');
  select count(*) into baseline from public.checkout_sessions;
  saved:=jsonb_build_object('promotion',jsonb_build_object('applied',true,'promotionId',general_id,'name','General offer','discountPercent',10,'discountCents',10000),
    'whishPromotion',jsonb_build_object('applied',true,'promotionId',pid,'name','Transfer Special','discountPercent',20,'discountCents',18000));
  insert into public.whish_orders(id,request_key,user_id,course_id,email,first_name,last_name,phone,course_title,recipient_number,original_price_cents,quoted_amount_cents,discounts)
  values(oid,gen_random_uuid(),uid,cid,uid||'@example.invalid','Offer','Test','+96171123456','Promotion test','+961 XX XXX XXX',100000,72000,saved);
  assert not exists(select 1 from public.user_enrollments where user_id=uid), 'Pending request unlocked course';
  delete from public.whish_promotions where id=pid;
  assert (select discounts=saved from public.whish_orders where id=oid), 'Offer deletion erased quote snapshot';
  eid:=public.review_whish_order(oid,aid,'confirm',72000,'ROLLBACK-WHISH-OFFER-'||oid);
  assert exists(select 1 from public.user_enrollments where id=eid and amount_paid_cents=72000 and points_earned=720 and payment_status='completed');
  assert (select discounts=saved from public.whish_orders where id=oid), 'Approval changed saved discounts';
  assert (select expected_amount_cents=72000 from public.payment_orders where id=oid);
  assert (select promotion_records=1 and promotion_only_records=0 from public.admin_whish_only_promotion_payment_stats(p_course_id=>cid,p_range=>'all')), 'Discount statistics mismatch';
  assert (select count(*)=baseline from public.checkout_sessions), 'Whish wrote Stripe data';
  assert public.review_whish_order(oid,aid,'confirm',72000,'ROLLBACK-WHISH-OFFER-'||oid)=eid;
  assert (select count(*)=1 from public.point_transactions where user_id=uid), 'Approval duplicated rewards';
  insert into whish_promotion_checks values('Quote preserved after offer deletion; approval, rewards, history, idempotence, Stripe isolation','PASS');
end $test$;
select * from whish_promotion_checks;
rollback;
