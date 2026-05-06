This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local Stripe Testing

The checkout flow supports localhost redirects automatically because checkout sessions use the request origin for `success_url` and `cancel_url`.

For local webhooks, install the Stripe CLI and run:

```bash
npm run stripe:listen
```

Copy the `whsec_...` value printed by the CLI into `.env.local` as:

```bash
STRIPE_WEBHOOK_SECRET_LOCAL=whsec_your_local_cli_secret
```

Keep `STRIPE_WEBHOOK_SECRET` set to the production webhook secret for deployed hosting. In development, the app uses `STRIPE_WEBHOOK_SECRET_LOCAL` when present and falls back to `STRIPE_WEBHOOK_SECRET`; in production, it only uses `STRIPE_WEBHOOK_SECRET`.

If you test guest checkout locally, add `http://localhost:3000/auth/callback` to the allowed redirect URLs in Supabase so password setup links can return to your local app.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
