begin;

-- Do not let a later Stripe refund/dispute update an enrollment reused by Whish.
-- Preserve the Stripe functions themselves; require manual reconciliation instead.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.review_whish_order(uuid,uuid,text,integer,text,text)'::regprocedure);
  if position('-- Respect an in-flight Stripe purchase' in definition) = 0 then
    raise exception 'Unexpected Whish approval function definition';
  end if;
  definition := replace(definition, '-- Respect an in-flight Stripe purchase', $guard$
  if e.id is not null and (e.stripe_payment_intent_id is not null or exists(
    select 1 from public.checkout_sessions where enrollment_id=e.id
  )) then
    raise exception 'This enrollment has Stripe payment history. Reconcile its access before approving a replacement Whish purchase.';
  end if;
  -- Respect an in-flight Stripe purchase$guard$);
  execute definition;
end $$;

notify pgrst, 'reload schema';
commit;
