begin;
-- A guest Stripe checkout may still have a NULL user_id when the Whish
-- account has been created. Match its email as well before manual approval.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.review_whish_order(uuid,uuid,text,integer,text,text)'::regprocedure);
  if position('where user_id=u.id and course_id=o.course_id' in definition)=0 then
    raise exception 'Unexpected Whish approval function definition';
  end if;
  definition := replace(definition,
    'from public.checkout_sessions where user_id=u.id and course_id=o.course_id',
    'from public.checkout_sessions where (user_id=u.id or lower(email)=lower(o.email)) and course_id=o.course_id');
  execute definition;
end $$;
notify pgrst, 'reload schema';
commit;
