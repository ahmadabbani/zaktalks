# Simple production deployment checklist

## 1. Keep local development separate

- Keep `.env.local` for local development and test keys.
- Do not replace local Stripe test keys with live keys.
- Do not commit `.env.local`; it is already ignored by Git.
- Add production keys only in **Vercel > Project > Settings > Environment Variables**.

## 2. Add these variables to Vercel Production

- [ ] `NEXT_PUBLIC_APP_URL=https://your-final-domain.com`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY` using the Stripe live secret key
- [ ] `STRIPE_WEBHOOK_SECRET` using the live webhook signing secret
- [ ] `RESEND_API_KEY`
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- [ ] `TURNSTILE_SECRET_KEY`
- [ ] `SUPABASE_AUTH_CAPTCHA_ENABLED=true`
- [ ] `SECURITY_RATE_LIMIT_SECRET`
- [ ] `YOUTUBE_API_KEY`
- [ ] `CRON_SECRET` using a newly generated random server-side secret
- [ ] `COURSE_INACTIVITY_EMAILS_ENABLED=true`
- [ ] `INACTIVITY_REMINDER_HOURS=168` for seven days

Optional: add `ZAKTALKS_ADMIN_EMAIL` only if alerts should go somewhere other than the existing default, `hello@zaktalks.com`.

Generate `SECURITY_RATE_LIMIT_SECRET` locally:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate a separate `CRON_SECRET` locally:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do not add these to Vercel Production:

- `STRIPE_WEBHOOK_SECRET_LOCAL`: local Stripe CLI only.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: currently unused.
- `FIRST_PURCHASE_DISCOUNT_PERCENT`: currently unused.
- `NEXT_PUBLIC_APP_NAME`: currently unused.

## 3. Vercel

- [ ] Import the GitHub repository into Vercel.
- [ ] Select the production branch, normally `main`.
- [ ] Use Node.js 24.x.
- [ ] Add all Production environment variables listed above.
- [ ] Add the final domain in **Vercel > Settings > Domains**.
- [ ] Choose whether `yourdomain.com` or `www.yourdomain.com` is the main domain and redirect the other one.
- [ ] Deploy again after changing environment variables.

## 4. Cloudflare Turnstile

- [ ] Create or sign in to a Cloudflare account.
- [ ] Open **Cloudflare Dashboard > Turnstile > Add widget**.
- [ ] Name it `ZakTalks Production`.
- [ ] Choose **Managed** mode.
- [ ] Add the final production domain. Do not add `localhost`.
- [ ] Copy the site key to Vercel as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- [ ] Copy the secret key to Vercel as `TURNSTILE_SECRET_KEY`.
- [ ] Use the same Turnstile secret in **Supabase > Authentication > Bot and Abuse Protection**.
- [ ] Enable CAPTCHA protection there and select **Cloudflare Turnstile**.
- [ ] Add `SUPABASE_AUTH_CAPTCHA_ENABLED=true` to Vercel Production and redeploy immediately.
- [ ] Test login, registration, forgot password, and guest checkout.

Keep `SUPABASE_AUTH_CAPTCHA_ENABLED` unset locally while Supabase CAPTCHA is disabled. Once it is enabled on the shared hosted Supabase project, local password login also needs a real token from that production widget; test Turnstile tokens cannot be validated by a production secret. Prefer testing the final protected login on the deployed domain. Do not add `localhost` to the production widget unless local login against the production Supabase project is genuinely required.

## 5. Supabase

- [ ] Confirm Vercel uses the correct production Supabase URL, anon key, and service-role key.
- [ ] In **Supabase > Authentication > URL Configuration**, set Site URL to the final production domain.
- [ ] Add `https://your-final-domain.com/auth/callback` to the allowed redirect URLs.
- [ ] Confirm **Authentication > Bot and Abuse Protection > CAPTCHA protection** is enabled with Cloudflare Turnstile.
- [ ] Confirm Vercel has `SUPABASE_AUTH_CAPTCHA_ENABLED=true`; this setting and the Supabase toggle must be changed together.
- [ ] Check migrations before deployment:

  ```powershell
  npx supabase migration list --linked
  npx supabase db push --linked --dry-run
  ```

- [ ] If the dry run shows the correct pending migrations, apply them:

  ```powershell
  npx supabase db push --linked
  ```

- [ ] Never run `supabase db reset --linked` on production.
- [ ] Open Supabase Security Advisor and fix any new serious warnings.
- [ ] Confirm database backups are enabled or create a backup before launch.

The linked database migrations were synchronized when this checklist was created.

## 6. Stripe

- [ ] Switch Stripe Dashboard to live mode.
- [ ] Finish business, bank, branding, support, and statement-descriptor settings.
- [ ] Add the live secret key to Vercel as `STRIPE_SECRET_KEY`.
- [ ] Create this live webhook endpoint:

  ```text
  https://your-final-domain.com/api/webhooks/stripe
  ```

- [ ] Subscribe it to:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`
  - `charge.refunded`
  - `charge.dispute.created`
  - `charge.dispute.closed`
- [ ] Copy its live `whsec_...` value to Vercel as `STRIPE_WEBHOOK_SECRET`.
- [ ] Do not use the secret printed by `stripe listen` in production.
- [ ] In **Stripe > Settings > Business > Customer emails**, enable successful-payment and refund receipts.
- [ ] Redeploy and verify the webhook returns `200`.
- [ ] Before launch, complete the remaining test where payment succeeds but course access initially fails, then confirm Stripe retries and grants access without charging again.

## 7. Resend

The Resend email code is already implemented.

- [ ] Confirm `zaktalks.com` still shows as **Verified** in Resend.
- [ ] Confirm its SPF and DKIM DNS records are verified.
- [ ] Create or use a production Resend API key.
- [ ] Add it to Vercel as `RESEND_API_KEY`.
- [ ] Confirm emails can be sent from `noreply@zaktalks.com`.
- [ ] Confirm `hello@zaktalks.com` receives contact, event, and payment-alert emails.
- [ ] Test registration, welcome, reset-password, guest password setup, contact, and event emails after deployment.
- [ ] Confirm course reminders can send as `Zak from Okayness <noreply@zaktalks.com>` from the verified `zaktalks.com` domain.
- [ ] Confirm the inactivity reminder appears correctly at `/email-previews` during local development.

## 8. Course inactivity reminders

- [ ] Set `INACTIVITY_REMINDER_HOURS=168` after the initial 12-hour test.
- [ ] Deploy `vercel.json`; Vercel will register `/api/cron/course-inactivity-reminders` as a daily job.
- [ ] In **Vercel > Project > Settings > Cron Jobs**, confirm the job is listed and enabled.
- [ ] Confirm a learner can turn course check-ins on or off under **Dashboard > Profile & Security**.
- [ ] Confirm one incomplete paid learner course receives one reminder after the threshold.
- [ ] Confirm continuous inactivity does not send a second reminder.
- [ ] Confirm returning to a course starts a new inactivity period.
- [ ] After changing the Vercel variable, deploy a new production build so it takes effect.

Vercel Hobby runs cron jobs at most once daily and may invoke them at any point within the configured hour. A seven-day threshold therefore means "eligible after seven days and sent at the next daily run," not delivery at exactly seven days.

## 9. Final deployment check

- [ ] Change the current lint script from `next lint` to `eslint .`, then run lint.
- [ ] Run:

  ```powershell
  npm ci
  npm run lint
  npm run build
  ```

- [ ] Push the final code to GitHub.
- [ ] Deploy the production branch through Vercel.
- [ ] Test registered checkout.
- [ ] Test guest checkout and password setup.
- [ ] Test signup, email verification, login, and password reset.
- [ ] Test admin and creator permissions.
- [ ] Check Vercel logs, Stripe webhook logs, Resend email logs, and Supabase logs for errors.
