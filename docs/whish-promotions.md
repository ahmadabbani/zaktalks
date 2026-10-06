# Whish-only course promotions

Admin Course Promotions now has two creation buttons:

- New promotion: the existing offer, for Stripe and Whish.
- New Whish promotion: an additional offer, only for Whish checkout.

Both have names, percentages, start/end dates, selected/all courses, enable/disable, edit and delete. When several Whish-only offers match, the strongest percentage is used. Scheduled, expired and disabled offers do not apply.

Calculation order: general course promotion, then Whish-only promotion on the remaining price, then the existing first-purchase, points and coupon discounts. Percentages are sequential, not added together. Stripe never queries the Whish-only resolver. Public course prices/badges remain based on the general promotion only.

The server recalculates Whish pricing before saving a request. Both offers are saved inside the existing `whish_orders.discounts` JSON snapshot. Manual approval keeps that quote, including when an offer expires, changes or is deleted later. Existing atomic enrollment, coupon, points and email-delivery functions are not modified by this feature.

Saved details appear in checkout, instruction/confirmation emails, Whish admin approval, admin payments and learner purchase history/receipt. The local `/email-previews` example includes both offers. Existing orders without the new snapshot remain supported.

Database: migration `20261006120000_whish_only_promotions.sql` adds separate promotion/assignment tables and service-only functions. RLS is enabled and browser roles have no table/function access. Admin server actions retain the `coupons.manage` permission.

Deploy the code after applying the migration. No new environment variables, cron or Stripe settings are required.

Checks: `node tests/points-discount-stacking.test.mjs`, `node tests/points-rules.test.mjs`, rollback-only `tests/whish-promotions.sql` and existing Whish/points database regression tests, plus `npm run build`.
