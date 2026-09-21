# Manual Whish payments

## Enable after review

The `20260921...whish...sql` migrations have been applied to the linked Supabase project. No Stripe endpoint, webhook subscription, signing secret, finalizer, or existing authentication action was changed.

Set these **Config** environment variables in Vercel → Project → Settings → Environment Variables → Production, then deploy the code:

```ini
WHISH_PAYMENTS_ENABLED=true
WHISH_RECIPIENT_NUMBER=<the real Whish recipient number>
```

Use the same variables in `.env.local` and restart `npm run dev` to test locally. The placeholder `+961 XX XXX XXX` appears in email previews/admin configuration only. The server refuses requests until a real number is configured, and the Whish choice stays unavailable. Check that the number belongs to the intended recipient before enabling.

Existing Resend sender, Supabase credentials, app URL, and Turnstile settings are reused. No new provider API key, webhook, or cron is needed. Account setup uses the existing `/auth/callback?next=/auth/update-password` route; ensure the intended application domain/local URL is already allowed in Supabase Auth redirect URLs.

## Customer flow

- Signed-in buyers choose Stripe or Whish in the existing course checkout modal, with one shared discount calculation. Whish adds a sender phone field.
- Guests choose on the existing guest checkout page; Whish opens a phone confirmation modal after the name/email/pricing step. Guests with an existing account must sign in.
- Submission saves a **pending request** and sends payment instructions. Guests also receive a separate, branded account-setup email. It does not say access is ready.
- The website opens its own confirmation page, not an external payment page. Pending requests do not grant access or count as sales.
- Instructions quote the selected discounts and final USD total, provide the recipient and sender numbers, and include an **Okayness Request ID**. Points/coupons/first-purchase usage are recorded only when approved. Nothing is reserved while pending.

## Official links

- App download: https://www.whish.money/download
- Whish-to-Whish guidance: https://www.whish.money/whish-app

The official guidance describes entering the recipient number inside the app. No public, documented recipient/amount transfer deep-link format was verified; the code does **not** invent one. These links do not prefill or verify a transfer. The administrator must verify the real transfer independently in Whish.

## Administrator workflow

Open **Admin Dashboard → Whish Payments** (`/admin/dashboard?view=whish`). Review the course, customer email, sender number, quoted price, chosen benefits, account readiness, and email delivery status.

1. Match the transfer in Whish, not merely a customer claim or screenshot.
2. Open **Review & Grant Access**.
3. Enter the actual USD received and the unique Whish transfer reference.
4. Add a note if it differs from the quote. Check the verification switch.
5. Confirm payment and grant access.

Approval atomically records the payment, creates normal completed enrollment, applies benefits, and awards 1,000 purchase points. Repeated approval does not award twice. Its confirmation email is separate: a failed send cannot undo access, and the admin can retry it. A request can instead be closed without access. This does not refund money; resolve any real transfer separately.

Confirmed transfers appear in the existing Payments report and learner Purchase History, identified as Whish, using the actual amount. Pending totals are labeled quotes. Stripe identifiers/webhook sections are not shown for Whish.

## Important safeguards and limits

- Existing Stripe payment writers, webhooks, reconciliation and authentication actions remain unchanged. Combined reporting is read-only, using separate reporting RPCs and a view.
- Whish tables/view/approval RPC are service-only. Public submission validates server-calculated pricing, phone, session, guest captcha and rate limits. Learner history is explicitly scoped to the authenticated user.
- Approval fails rather than silently overspending if selected points or an offer are no longer available. Resolve the request with the customer; close and recreate it with current pricing if necessary.
- An overlapping Stripe checkout blocks approval. An old enrollment linked to Stripe also blocks replacement through Whish: old Stripe refund/dispute events could otherwise act on the reused enrollment. Resolve that exceptional case before accepting a replacement transfer.
- Confirmed payments are not reversible with the access switch. Automatic Whish refunds, disputes and transfer verification are not part of this manual option.
- A failed account-setup email is visible and retryable. No real Whish request or email has been sent as part of automated verification.

## Verification and release checks

`tests/whish-payments.sql` tests the installed schema inside a transaction ending in `ROLLBACK`; it does not keep test accounts, courses, orders, enrollments or benefits. It covers pending vs sales, permissions, approval, benefit usage, retries, failed email claims, duplicate transfers, insufficient points, first-purchase reuse, course removal, Stripe conflicts, and reporting parity for current Stripe records.

Build and local HTTP checks were run. Before accepting real Whish transfers, perform an end-to-end test using your own email and real configured recipient: guest setup link → password → pending history → verified admin approval → access, points, confirmation and receipt. Also check the signed-in checkout and existing Stripe test checkout. Browser visual/device testing and actual Resend delivery require this final test; they are not implied by a successful build or SQL tests.

Branded email samples are included at `/email-previews` (Whish instructions, account setup, and confirmation).
