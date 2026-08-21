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
- [ ] `SECURITY_RATE_LIMIT_SECRET`
- [ ] `YOUTUBE_API_KEY`

Optional: add `ZAKTALKS_ADMIN_EMAIL` only if alerts should go somewhere other than the existing default, `hello@zaktalks.com`.

Generate `SECURITY_RATE_LIMIT_SECRET` locally:

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
- [ ] Redeploy the website.
- [ ] Test login, registration, forgot password, and guest checkout.

Local development already uses Cloudflare test keys automatically, so nothing needs to be added locally.

## 5. Supabase

- [ ] Confirm Vercel uses the correct production Supabase URL, anon key, and service-role key.
- [ ] In **Supabase > Authentication > URL Configuration**, set Site URL to the final production domain.
- [ ] Add `https://your-final-domain.com/auth/callback` to the allowed redirect URLs.
- [ ] Keep Supabase CAPTCHA disabled because the website already validates Cloudflare Turnstile itself.
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

## 8. Final deployment check

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
