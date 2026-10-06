# Purchase points

- New successful purchases earn `floor(actual amount paid in cents / 100)` points. $1,200 earns 1,200 points; $1,200.75 also earns 1,200. Purchases below $1 earn zero points, without blocking access.
- Stripe uses its verified paid amount. Whish uses the actual received USD amount entered by the administrator, not the pending quote.
- New checkout selections are 0 (no points), then 5,000, 6,000, 7,000, and so on, up to the balance rounded down to the nearest 1,000. A balance of 7,000 allows spending 5,000 and retaining 2,000, spending 6,000 and retaining 1,000, or spending all 7,000, plus the new purchase reward.
- `admin_settings.points_discount_percent` converts selected points into a USD discount, not a percentage of the course price. At 10%, 5,000 points gives $500 off, 6,000 gives $600 off, and 7,000 gives $700 off. The deduction is capped at the remaining course price. All selected points are spent even when this cap applies, matching the existing redemption behavior. Zero disables the discount.
- Promotion, first-purchase, points, then coupon is still the pricing order. Rewards use the final paid amount after all discounts.
- Earning, spending, enrollment and payment finalization remain in the existing locked atomic database functions. Retries and duplicate payments do not duplicate rewards. Stripe refunds reverse the exact recorded reward, including historical fixed rewards.
- Existing balances, completed enrollments and point transactions are not recalculated. Previously issued Stripe and Whish quotes retain their point-spending reservations.

## Deployment

Apply `20261005120000_price_based_purchase_points.sql` before deploying the application code. It changes only earning values in the existing finalizers, adds a service-role-only validation wrapper around the unchanged Stripe reservation function, and validates marked new Whish quotes. Old application versions and old quotes remain compatible during rollout. Until new code is deployed, old screens still offer the old redemption steps; new earning amounts take effect as soon as the migration is applied.

No environment variables or Stripe webhook configuration changes are needed. The saved admin percentage is preserved (not automatically changed to 10%).

`20261005130000_flexible_points_redemption.sql` relaxes only the new-order validators to allow 1,000-point increments above the same 5,000-point minimum. Apply it before deploying the flexible-selector code. Existing validators' permissions, atomic finalization and reward functions are unchanged.

## Yearly reset

`20261006140000_yearly_points_expiry.sql` adds independent, service-only lifecycle metadata. The first positive purchase reward starts a cycle. Its expiry is one calendar year later, rounded forward to the next 04:00 in `Asia/Beirut`. Later rewards do not extend it. At expiry the entire remaining positive points balance is cleared and recorded as an `expire` ledger entry. Negative refund debt is preserved. After reset, the next positive purchase reward starts a fresh year.

Existing cycles are initialized from the earliest positive `earn` ledger entry. Payment finalizer definitions and privileges remain unchanged. An after-insert ledger trigger records cycle metadata inside the same transaction as the reward.

Supabase `pg_cron` runs `okayness-yearly-points-reset` hourly, checking due indexed timestamps. This covers Lebanon's summer/winter 4 AM UTC offsets without relying on Vercel Hobby's daily scheduling window. No environment variables or Vercel cron changes are needed. Database downtime may delay execution until a later successful check.

As explicitly requested, pending Stripe/Whish requests are not exempted or deferred. If points expire before fulfillment, the existing balance validation may block enrollment or manual approval even if an external payment succeeded. Scheduling at 4 AM reduces overlap but does not remove this accepted risk.

Admin Discount Settings has an on-demand button for positive balances, original first-earned dates, current cycle starts and reset times. Data is not fetched until clicked; refresh is also manual.

`tests/points-expiry.sql` verifies date arithmetic, full balance reset, idempotence, cycle restart, privileges, scheduler and deletion cascade with rollback-only fixtures.

## Tests

`node tests/points-rules.test.mjs` checks reward rounding, balance thresholds, redemption increments, multipliers, zero settings and caps.

`node tests/points-discount-stacking.test.mjs` exercises the real shared calculator with controlled database responses to verify discount stacking, the first-purchase switch and guest pricing.

`npx supabase db query --linked --file tests/flexible-points.sql --output json` checks 5,000/6,000/7,000-point purchases in both providers, exact balances/rewards, retries, Stripe refund restoration, minimum/increment checks, and permissions. Its fixtures also roll back.

`npx supabase db query --linked --file tests/points-purchases.sql --output json` checks Stripe registered/guest finalization, exact rewards, deductions, retries, duplicate payment protection, refund reversal, old quote compatibility, Whish actual-amount rewards and function permissions. All fixtures roll back; no payment or email is sent.

`tests/whish-payments.sql` checks approval/access, discounts/coupons, reporting, rejected approvals, failed email retry behavior, Stripe isolation and permissions. `tests/account-deletion.sql` checks sales retention. Both also roll back.
