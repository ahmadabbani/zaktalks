-- Keep staff testing access distinct from paid learner enrollments so payment
-- and learner analytics continue to count only genuine purchases.
alter type public.payment_status add value if not exists 'staff';
