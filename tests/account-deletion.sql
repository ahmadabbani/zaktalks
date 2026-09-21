-- Integration checks against the installed schema. Everything is rolled back.
begin;

do $test$
declare
  uid uuid := gen_random_uuid();
  cid uuid := gen_random_uuid();
  enrollment uuid := gen_random_uuid();
  paid_checkout uuid := gen_random_uuid();
  expired_checkout uuid := gen_random_uuid();
  confirmed_whish uuid := gen_random_uuid();
  pending_whish uuid := gen_random_uuid();
  test_email text := uid || '@example.invalid';
begin
  insert into auth.users(id,email,raw_user_meta_data)
  values(uid,test_email,'{"first_name":"Deletion","last_name":"Rollback Test"}');

  insert into public.courses(id,slug,title,price_cents,is_published)
  values(cid,'account-deletion-test-'||cid,'Account deletion rollback test',10000,true);

  insert into public.user_enrollments(id,user_id,course_id,payment_status,amount_paid_cents,original_price_cents)
  values(enrollment,uid,cid,'completed',10000,10000);

  insert into public.checkout_sessions(id,email,course_id,user_id,enrollment_id,status,payment_state,fulfillment_state,original_price_cents,expected_amount_cents)
  values
    (paid_checkout,test_email,cid,uid,enrollment,'completed','paid','fulfilled',10000,10000),
    (expired_checkout,test_email,cid,uid,null,'expired','expired','not_required',10000,10000);

  insert into public.whish_orders(id,request_key,user_id,course_id,enrollment_id,email,first_name,last_name,phone,is_guest,course_title,recipient_number,status,original_price_cents,quoted_amount_cents,amount_received_cents,transfer_reference,reviewed_at)
  values
    (confirmed_whish,gen_random_uuid(),uid,cid,enrollment,test_email,'Deletion','Test','+96171111111',false,'Account deletion rollback test','+96170000000','confirmed',10000,10000,10000,'DELETE-KEEP',now()),
    (pending_whish,gen_random_uuid(),uid,cid,null,test_email,'Deletion','Test','+96171111111',false,'Account deletion rollback test','+96170000000','pending',10000,10000,null,null,null);

  delete from auth.users where id=uid;

  assert not exists(select 1 from public.users where id=uid), 'Profile was not deleted';
  assert not exists(select 1 from public.user_enrollments where id=enrollment), 'Enrollment was not deleted';
  assert exists(select 1 from public.checkout_sessions where id=paid_checkout and user_id is null and enrollment_id is null), 'Paid Stripe sale was not preserved and detached';
  assert not exists(select 1 from public.checkout_sessions where id=expired_checkout), 'Expired Stripe request was retained';
  assert exists(select 1 from public.whish_orders where id=confirmed_whish and user_id is null and enrollment_id is null), 'Confirmed Whish sale was not preserved and detached';
  assert not exists(select 1 from public.whish_orders where id=pending_whish), 'Pending Whish request was retained';
end;
$test$;

rollback;
