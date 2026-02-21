# ZakTalks Developer Guide

> Complete technical documentation for backend architecture, authentication, payments, discounts, and database design.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Supabase Clients](#4-supabase-clients)
5. [Authentication System](#5-authentication-system)
6. [Middleware & Route Protection](#6-middleware--route-protection)
7. [Payment System (Stripe)](#7-payment-system-stripe)
8. [Discount System](#8-discount-system)
9. [Database Schema](#9-database-schema)
10. [RPC Functions (Postgres)](#10-rpc-functions-postgres)
11. [Admin System](#11-admin-system)
12. [Course & Lesson Progress](#12-course--lesson-progress)
13. [Email System (Resend)](#13-email-system-resend)
14. [Environment Variables](#14-environment-variables)
15. [Data Flow Diagrams](#15-data-flow-diagrams)
16. [Important Design Decisions](#16-important-design-decisions)
17. [Scaling Notes](#17-scaling-notes)

---

## 1. Architecture Overview

ZakTalks is a **Next.js (App Router)** course platform with:

- **Supabase** for auth, database (Postgres), and Row-Level Security (RLS)
- **Stripe Checkout** for payments (redirects user to Stripe-hosted page)
- **Resend** for transactional emails (confirmation, password reset, welcome)

```
┌─────────────┐    ┌─────────────────────┐    ┌──────────────┐
│   Browser   │───>│  Next.js App Router │───>│   Supabase   │
│  (Client)   │<───│  (Server Actions,   │<───│  (Postgres + │
│             │    │   API Routes)       │    │   Auth)      │
└─────────────┘    └────────┬────────────┘    └──────────────┘
                            │
                   ┌────────┼────────┐
                   │        │        │
                   v        v        v
              ┌────────┐ ┌──────┐ ┌────────┐
              │ Stripe │ │Resend│ │YouTube │
              │Checkout│ │Email │ │  API   │
              └────────┘ └──────┘ └────────┘
```

**Key principle**: All sensitive logic (pricing, discounts, user creation, enrollment) runs **server-side only**. The frontend never sees or controls pricing. Stripe webhooks are the **source of truth** for payment confirmation.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js (App Router) | Server components, server actions, API routes |
| Database | Supabase (Postgres) | Data storage, RLS, RPC functions |
| Auth | Supabase Auth | User management, JWT sessions, admin API |
| Payments | Stripe Checkout | Hosted payment page, webhook events |
| Email | Resend | Transactional emails (confirmation, reset, welcome) |
| Hosting | Vercel (planned) | Serverless deployment |

---

## 3. Project Structure

### Backend Files (what matters for logic)

```
src/
├── middleware.js               # Route protection + session refresh
├── lib/
│   ├── supabase/
│   │   ├── client.js           # Browser-side Supabase client
│   │   ├── server.js           # Server-side client (uses cookies, respects RLS)
│   │   ├── admin.js            # Service-role client (bypasses RLS)
│   │   ├── middleware.js       # Session refresh logic for middleware
│   │   └── update_trigger.sql  # Postgres trigger: auth.users → public.users sync
│   ├── auth-utils.js           # isAdmin() / requireAdmin() helpers
│   ├── discount-utils.js       # Core discount calculation + point/coupon logic
│   ├── stripe.js               # Stripe client initialization
│   └── resend.js               # Resend client initialization
├── app/
│   ├── auth/
│   │   ├── actions.js          # login, signup, signout, resetPassword, updatePassword
│   │   ├── callback/page.js    # Handles email confirmation + password recovery redirects
│   │   └── update-password/    # Password update form (after recovery link)
│   ├── api/
│   │   ├── checkout/
│   │   │   ├── route.js        # POST: Creates Stripe Checkout session
│   │   │   └── preview/route.js# POST: Returns discount preview (no Stripe session)
│   │   └── webhooks/
│   │       └── stripe/route.js # POST: Stripe webhook handler (enrollment, points, email)
│   ├── payment/
│   │   ├── success/page.js     # Redirect page after successful Stripe payment
│   │   └── cancel/page.js      # Redirect page if user cancels payment
│   ├── checkout/
│   │   └── guest/page.js       # Guest checkout form (name, email, discounts)
│   ├── admin/
│   │   ├── layout.js           # Admin guard (requireAdmin)
│   │   ├── coupons/            # Coupon CRUD (coupons.actions.js)
│   │   ├── settings/           # Admin settings (discount %, points %)
│   │   ├── courses/            # Course management
│   │   ├── users/              # User management
│   │   └── dashboard/          # Admin dashboard
│   ├── courses/
│   │   └── actions.js          # updateLessonProgress server action
│   └── speaking/
│       └── actions.js          # YouTube API integration
└── components/
    ├── CheckoutModal.js        # Logged-in user checkout (discount selector → Stripe redirect)
    ├── DiscountSection.js      # Discount UI (first purchase, points, coupon input)
    └── EnrollButton.js         # Entry point → opens CheckoutModal or redirects to guest checkout

migrations/
├── phase1_discount_tables.sql         # admin_settings, point_transactions, coupon_courses, coupon_usages
├── phase3_cleanup_coupons.sql         # Standardized coupons table
├── phase4_discount_functions.sql      # increment_coupon_usage RPC
├── fix_coupon_rpc_security.sql        # Revoke authenticated access to increment_coupon_usage
└── fix_atomic_points.sql              # adjust_user_points atomic RPC
```

---

## 4. Supabase Clients

There are **3 Supabase clients**, each for a different context:

### Browser Client (`src/lib/supabase/client.js`)
- Used in `'use client'` components
- Created with `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Subject to RLS policies** — can only read/write what the logged-in user is allowed to
- Example usage: Auth state listener in callback page

### Server Client (`src/lib/supabase/server.js`)
- Used in Server Components and Server Actions
- Reads auth cookies from `next/headers`
- **Subject to RLS** — acts as the currently logged-in user
- Example usage: `login()`, `signup()`, `getAdminSettings()`, `updateLessonProgress()`

### Admin Client (`src/lib/supabase/admin.js`)
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- **Bypasses ALL RLS** — has full database access
- Used for backend operations that need to act on any user's data
- Example usage: Webhook handler (creates users, enrolls them), discount calculations, coupon management

> **Rule**: Never expose the service role key to the client. The admin client is only imported in server-side code.

---

## 5. Authentication System

### Flow Overview

```
Registration:
  1. User fills form → signup() server action
  2. Admin API generates confirmation link (NOT Supabase default email)
  3. Resend sends custom HTML email with link
  4. User clicks link → /auth/callback → hash tokens extracted → session set → /dashboard

Login:
  1. User submits credentials → login() server action
  2. supabase.auth.signInWithPassword()
  3. Checks user.role → redirects to /admin/dashboard or /dashboard

Password Reset:
  1. User enters email → resetPassword() server action
  2. Admin API generates recovery link
  3. Resend sends email
  4. User clicks → /auth/callback?next=/auth/update-password → hash tokens → session → update form
  5. User sets new password → updatePassword() server action → supabase.auth.updateUser()
```

### Auth Actions (`src/app/auth/actions.js`)

| Function | Purpose |
|----------|---------|
| `login(formData)` | Sign in with email/password, redirect based on role |
| `signup(formData)` | Create user via Admin API + send confirmation via Resend |
| `signout()` | Sign out and redirect to /login |
| `resetPassword(formData)` | Generate recovery link via Admin API + send via Resend |
| `updatePassword(formData)` | Update password for the currently authenticated session |

### Auth Callback (`src/app/auth/callback/page.js`)

This client-side page handles ALL auth redirects (email confirmation, password reset). It processes:

1. **Hash tokens** (Priority 1): Extracts `access_token` and `refresh_token` from URL hash, calls `setSession()`
2. **PKCE code** (Priority 2): Exchanges `code` query param for a session
3. **Auth state listener** (Priority 3): Catches any remaining auth events
4. **Existing session** (Priority 4): Checks if already authenticated

### Why Resend Instead of Supabase Default Emails?

Supabase's built-in email system uses a shared IP with rate limits and deliverability issues. By using the Admin API's `generateLink()` + Resend, the app gets:
- Custom email templates
- Better deliverability
- Full control over the email send flow

### User Sync: `auth.users` → `public.users`

A Postgres trigger (`src/lib/supabase/update_trigger.sql`) syncs changes from the `auth.users` table to `public.users`:
- Fires after UPDATE on `auth.users`
- Copies `email`, `email_confirmed_at` (as `email_verified`), and `updated_at`

**Important**: There is also an INSERT trigger (set up in Supabase dashboard, not in the codebase) that creates a `public.users` row when a new auth user is created. This is the standard Supabase pattern.

---

## 6. Middleware & Route Protection

### File: `src/middleware.js` → `src/lib/supabase/middleware.js`

Runs on **every request** (except static assets). Two jobs:

1. **Refresh auth token**: Calls `supabase.auth.getUser()` to keep the JWT session alive
2. **Route protection**:
   - `/dashboard/*` → Redirects to `/login` if not authenticated
   - `/login`, `/register` → Redirects to `/dashboard` if already authenticated

### Admin Protection

Admin routes are protected at the **layout level** (`src/app/admin/layout.js`):
- Calls `requireAdmin()` from `auth-utils.js`
- Checks `users.role === 'admin'` in the database
- Redirects to `/dashboard` if not admin

---

## 7. Payment System (Stripe)

### Big Picture

```
 User clicks "Enroll"
         │
         ▼
 ┌─────────────────┐     POST /api/checkout      ┌──────────────────────┐
 │  CheckoutModal   │  ──────────────────────────> │  Checkout API Route  │
 │  (or Guest Form) │                              │  - Validates course  │
 │                  │                              │  - Calculates discounts │
 └─────────────────┘                               │  - Creates Stripe     │
                                                   │    Checkout Session   │
                                                   │  - Saves to DB       │
                                                   └──────────┬───────────┘
                                                              │
                                                   Returns { url: stripe_url }
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │ Stripe Checkout Page │
                                                   │ (hosted by Stripe)   │
                                                   └──────────┬───────────┘
                                                              │
                                             Customer completes payment
                                                              │
                              ┌────────────────────────────────┼────────────────┐
                              │                                │                │
                              ▼                                ▼                ▼
                   ┌──────────────────┐             ┌──────────────┐  ┌─────────────────┐
                   │ Webhook fires    │             │ Success Page │  │ Cancel Page    │
                   │ /api/webhooks/   │             │ (cosmetic)   │  │ (marks session  │
                   │ stripe           │             │              │  │  as 'failed')   │
                   │                  │             └──────────────┘  └─────────────────┘
                   │ SOURCE OF TRUTH  │
                   │ for enrollment   │
                   └──────────────────┘
```

### Step-by-Step Payment Flow

#### 1. Checkout Initiation (`POST /api/checkout` → `src/app/api/checkout/route.js`)

**Inputs**: `courseId`, `couponCode` (optional), `pointsToUse` (optional), auth cookie or guest email/name

**What it does**:
1. Authenticates the user (or identifies guest by email)
2. **Guest email → existing account check**: Queries `public.users` by email. If found, treats as logged-in user (gets their discounts)
3. Fetches course details (title, price) from DB
4. Calls `calculateAllDiscounts()` with the user's inputs
5. Creates a **Stripe Checkout Session** with:
   - `line_items`: The discounted price
   - `metadata`: All discount details (serialized — used by webhook later)
   - `client_reference_id`: User ID (if logged in)
   - `success_url` / `cancel_url`: Redirect URLs with `session_id` and `is_guest` flags
6. Saves a record to `checkout_sessions` table with status `'pending'`
7. Returns `{ url }` — the frontend redirects to this Stripe URL

#### 2. Discount Preview (`POST /api/checkout/preview` → `src/app/api/checkout/preview/route.js`)

Same as above but **does not create a Stripe session**. Returns the discount breakdown for the UI (used by `DiscountSection` component to show price dynamically as user toggles discounts).

#### 3. Stripe Webhook (`POST /api/webhooks/stripe` → `src/app/api/webhooks/stripe/route.js`)

This is the **most critical file** in the payment system. Called by Stripe when payment completes.

**Security**: Verifies the webhook signature using `STRIPE_WEBHOOK_SECRET` to prevent spoofing.

**On `checkout.session.completed` event**:

```
1. Extract session data + discount metadata
2. IDEMPOTENCY CHECK: If checkout_sessions.status is already 'completed', skip (return 200)
3. GUEST USER HANDLING:
   a. Look up email in public.users table
   b. If found → use existing user ID
   c. If not found → Create auth user via Admin API → generate password reset link → send welcome email via Resend
4. DISCOUNT PROCESSING:
   a. Mark first-purchase discount as used (if applied)
   b. Spend points atomically via adjust_user_points RPC (if used)
   c. Record coupon usage + increment coupon usage count (if applied)
   d. Award 1000 points for the purchase via adjust_user_points RPC
5. CREATE ENROLLMENT:
   Upsert into user_enrollments with all discount details
   (onConflict: user_id + course_id → prevents duplicate enrollments)
6. UPDATE CHECKOUT SESSION:
   Mark checkout_sessions.status = 'completed'
```

**Why the webhook is the source of truth** (not the success page):
- The success page is just a redirect — it fires even if the webhook hasn't processed yet
- The success page doesn't create enrollments or users — only the webhook does
- Stripe guarantees webhook delivery with retries, making it reliable

#### 4. Success Page (`src/app/payment/success/page.js`)

Cosmetic only. Displays different messages:
- **Guest**: "Action Required: Set Your Password — check your email"
- **Logged-in**: "Your enrollment has been processed"

#### 5. Cancel Page (`src/app/payment/cancel/page.js`)

Marks the `checkout_sessions` record as `'failed'` (only if status is still `'pending'`).

---

## 8. Discount System

### Architecture

All discount logic lives in `src/lib/discount-utils.js`. Discounts are calculated **server-side only** — the frontend just sends user choices; the server decides the final price.

### Three Discount Types (Applied In This Order)

```
1. FIRST-PURCHASE DISCOUNT (applied first)
   ├── Percentage-based (e.g., 10% off)
   ├── Configured via admin_settings table (key: 'first_purchase_discount_percent')
   ├── Eligible if users.first_purchase_discount_used = false
   └── Marked as used after purchase (webhook)

2. POINTS DISCOUNT (applied second, on remaining price)
   ├── User selects 1000/2000/3000/... points to use
   ├── Each 1000 points = X% off (configured in admin_settings: 'points_discount_percent')
   ├── Points deducted atomically via adjust_user_points RPC (webhook)
   └── 1000 points awarded after every purchase (webhook)

3. COUPON DISCOUNT (applied last, on remaining price after 1+2)
   ├── Two types: 'percentage' or 'fixed' (cents)
   ├── Validated for: active, not expired, usage limits, course eligibility
   ├── Usage tracked in coupon_usages table
   └── Usage count incremented via increment_coupon_usage RPC (webhook)
```

### Key Functions in `discount-utils.js`

| Function | Purpose | Called By |
|----------|---------|----------|
| `calculateAllDiscounts()` | Master function — calculates all 3 discounts | Checkout API, Preview API |
| `calculateFirstPurchaseDiscount()` | Checks eligibility, returns discount cents | calculateAllDiscounts |
| `calculatePointsDiscount()` | Validates points, calculates discount | calculateAllDiscounts |
| `validateCoupon()` | Full coupon validation | calculateAllDiscounts |
| `spendPoints()` | Atomically deducts points + logs transaction | Webhook |
| `earnPoints()` | Atomically adds 1000 points + logs transaction | Webhook |
| `recordCouponUsage()` | Inserts coupon_usages row + increments count | Webhook |
| `markFirstPurchaseUsed()` | Sets `users.first_purchase_discount_used = true` | Webhook |
| `getAdminSetting()` | Reads a value from admin_settings table | Various |

### Discount Stacking Order (Important!)

Discounts stack but each is applied to the **remaining price** after the previous:

```
Example: Course $100, first purchase 10%, 2000 points (20%), coupon 15%

Step 1: First Purchase → 10% of $100.00 = -$10.00 → Remaining: $90.00
Step 2: Points (2000) → 20% of $90.00  = -$18.00 → Remaining: $72.00
Step 3: Coupon (15%)  → 15% of $72.00  = -$10.80 → Remaining: $61.20

Final price: $61.20 (not $55 if all applied to original)
```

This "waterfall" approach ensures discounts don't exceed 100% and is implemented in `calculateAllDiscounts()`.

---

## 9. Database Schema

### Core Tables

#### `users` (public)
Synced from `auth.users` via trigger. Extended with app-specific fields.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Same as auth.users.id |
| email | TEXT | Synced from auth |
| first_name, last_name | TEXT | User profile |
| role | TEXT | `'user'` or `'admin'` |
| points | INTEGER | Reward points balance (default: 0) |
| first_purchase_discount_used | BOOLEAN | Tracks if user used first purchase discount |
| email_verified | BOOLEAN | Synced from auth.email_confirmed_at |
| created_at, updated_at | TIMESTAMP | Timestamps |

#### `courses`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Course ID |
| title | TEXT | Course name |
| slug | TEXT (UNIQUE) | URL-friendly name |
| description | TEXT | Course description |
| price_cents | INTEGER | Price in cents (e.g., 9900 = $99.00) |
| deleted_at | TIMESTAMP | Soft delete |

#### `user_enrollments`
Tracks which users are enrolled in which courses, with full payment/discount details.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Enrollment ID |
| user_id | UUID (FK → users) | Enrolled user |
| course_id | UUID (FK → courses) | Enrolled course |
| stripe_payment_intent_id | TEXT | Stripe payment reference |
| payment_status | TEXT | `'completed'` |
| amount_paid_cents | INTEGER | What user actually paid (after discounts) |
| original_price_cents | INTEGER | Course price before discounts |
| discount_applied_cents | INTEGER | Total discount amount |
| first_purchase_discount_applied | BOOLEAN | Was first-purchase used? |
| points_earned | INTEGER | Points awarded (1000) |
| coupon_id | UUID (FK → coupons) | Coupon used (nullable) |
| **UNIQUE** | | `(user_id, course_id)` — prevents duplicate enrollments |

#### `checkout_sessions`
Tracks each checkout attempt. One-to-one with Stripe Checkout Sessions.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Internal ID |
| stripe_session_id | TEXT | Stripe session ID (cs_...) |
| user_id | UUID | User (null for guests before webhook) |
| course_id | UUID | Course being purchased |
| status | TEXT | `'pending'` → `'completed'` or `'failed'` |
| enrollment_id | UUID | (Currently unused, available for future linking) |
| completed_at | TIMESTAMP | Set by webhook on completion |

**Idempotency**: The webhook checks `checkout_sessions.status` before processing. If already `'completed'`, it skips — this prevents duplicate point/coupon operations on Stripe retries.

### Discount Tables

#### `admin_settings`
Key-value store for configurable settings.

| Key | Example Value | Purpose |
|-----|---------------|---------|
| `first_purchase_discount_percent` | `'10'` | % off for first purchase |
| `points_discount_percent` | `'10'` | % off per 1000 points |

#### `coupons`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Coupon ID |
| code | TEXT (UNIQUE) | Coupon code (uppercase) |
| discount_type | TEXT | `'percentage'` or `'fixed'` |
| discount_value | INTEGER | Percentage (0-100) or cents |
| max_uses_total | INTEGER | Global usage limit (nullable = unlimited) |
| max_uses_per_user | INTEGER | Per-user limit (default: 1) |
| usage_count | INTEGER | Current total usages |
| applies_to_all_courses | BOOLEAN | If false, check `coupon_courses` |
| is_active | BOOLEAN | Admin toggle |
| expires_at | TIMESTAMP | Optional expiration |

#### `coupon_courses`
Links coupons to specific courses (many-to-many).

| Column | Type |
|--------|------|
| coupon_id | UUID (FK → coupons) |
| course_id | UUID (FK → courses) |

#### `coupon_usages`
Tracks individual coupon uses per user.

| Column | Type |
|--------|------|
| coupon_id | UUID |
| user_id | UUID |
| course_id | UUID |
| used_at | TIMESTAMP |

#### `point_transactions`
Audit log of all point changes.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Transaction ID |
| user_id | UUID | User |
| amount | INTEGER | + for earn, - for spend |
| type | TEXT | `'earn'` or `'spend'` |
| reference_id | TEXT | Course ID (what triggered this) |
| description | TEXT | Human-readable reason |
| created_at | TIMESTAMP | When it happened |

### Content Tables

#### `lessons`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Lesson ID |
| course_id | UUID (FK → courses) | Parent course |
| title | TEXT | Lesson name |
| (other content fields) | | |

#### `lesson_progress`
Tracks each user's progress through lessons.

| Column | Type | Purpose |
|--------|------|---------|
| user_id | UUID | User |
| lesson_id | UUID | Lesson |
| enrollment_id | UUID | FK → user_enrollments |
| watch_time_seconds | INTEGER | Time watched |
| is_completed | BOOLEAN | Completion status (never flips back to false) |
| score | NUMERIC | Assessment score (nullable) |
| completed_at | TIMESTAMP | When first completed |
| **UNIQUE** | | `(user_id, lesson_id)` — upsert on conflict |

---

## 10. RPC Functions (Postgres)

These are server-side SQL functions callable via `supabase.rpc()`:

### `increment_coupon_usage(p_coupon_id UUID)`
- Atomically increments `coupons.usage_count` by 1
- **Access**: `service_role` only (revoked from `authenticated` for security)
- Called by: `recordCouponUsage()` in webhook processing

### `adjust_user_points(p_user_id UUID, p_delta INTEGER)`
- Atomically adjusts `users.points` using `points + delta`
- Uses `GREATEST(0, ...)` to prevent negative balances
- Returns the new balance
- **Access**: `service_role` only
- Called by: `spendPoints()` (delta = negative) and `earnPoints()` (delta = positive)

### `is_admin()`
- Returns boolean — checks if the calling user has admin role
- Used in RLS policies

---

## 11. Admin System

### Access Control

```
src/app/admin/layout.js
  └── requireAdmin() from auth-utils.js
        └── Checks users.role === 'admin'
              └── Redirects to /dashboard if not admin
```

ALL admin pages inherit this layout, so every admin route is protected.

### Admin Features

| Route | Actions File | Purpose |
|-------|-------------|---------|
| `/admin/settings` | `settings.actions.js` | Configure discount percentages |
| `/admin/coupons` | `coupons.actions.js` | CRUD for coupon codes |
| `/admin/courses` | (in courses/) | Course management |
| `/admin/users` | (in users/) | User management |
| `/admin/dashboard` | (in dashboard/) | Overview |

### Admin Settings (`settings.actions.js`)

| Function | Purpose |
|----------|---------|
| `getAdminSettings()` | Fetch all settings as key-value object |
| `updateAdminSetting(key, value)` | Update single setting |
| `updateAdminSettings(formData)` | Update first_purchase_discount_percent + points_discount_percent |

### Coupon Management (`coupons.actions.js`)

| Function | Purpose |
|----------|---------|
| `getCoupons()` | List all coupons with linked courses |
| `getAllCourses()` | Fetch courses for coupon-course linking |
| `createCoupon(formData)` | Create coupon + link courses |
| `updateCoupon(couponId, formData)` | Update coupon + re-link courses |
| `deleteCoupon(couponId)` | Delete coupon (cascade deletes course links) |
| `toggleCouponActive(couponId, isActive)` | Enable/disable coupon |

---

## 12. Course & Lesson Progress

### Enrollment Check

User has access to a course if a row exists in `user_enrollments` with `payment_status = 'completed'` for their `user_id` + `course_id`.

### Progress Tracking (`src/app/courses/actions.js`)

`updateLessonProgress()` is a server action called when a user watches a lesson:

1. Looks up the lesson to get `course_id`
2. Looks up enrollment (required by schema FK constraint)
3. Checks existing progress (to preserve `is_completed = true` — never un-completes)
4. Upserts to `lesson_progress` table
5. Revalidates `/dashboard` on first-time completion

---

## 13. Email System (Resend)

**Client**: `src/lib/resend.js` — simple Resend SDK init with `RESEND_API_KEY`

### Email Types Sent

| When | Template | Sent By |
|------|----------|---------|
| Registration | "Welcome to ZakTalks! Confirm your email" + confirmation link | `signup()` in auth/actions.js |
| Password Reset | "Reset your ZakTalks Password" + recovery link | `resetPassword()` in auth/actions.js |
| Guest Purchase | "Welcome to ZakTalks! Set your password" + recovery link | `sendWelcomeEmail()` in webhook handler |

**From address**: Currently `onboarding@resend.dev` (Resend sandbox). Change to real domain for production.

---

## 14. Environment Variables

| Variable | Purpose | Where Used |
|----------|---------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | All Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (respects RLS) | Browser + server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (bypasses RLS) | Admin client only |
| `STRIPE_SECRET_KEY` | Stripe API key | Checkout + webhook |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Webhook handler |
| `RESEND_API_KEY` | Email sending | Auth actions + webhook |
| `NEXT_PUBLIC_APP_URL` | App base URL (for email links) | Auth actions + webhook |
| `YOUTUBE_API_KEY` | YouTube Data API | Speaking page |

---

## 15. Data Flow Diagrams

### Guest Checkout (Complete Flow)

```
Guest fills form (/checkout/guest)
        │
        ▼
POST /api/checkout
  ├── Check if email exists in public.users → if yes, treat as registered
  ├── calculateAllDiscounts() → compute price
  ├── Create Stripe Checkout Session (metadata has all discount info)
  ├── Insert checkout_sessions (status: 'pending', user_id: null)
  └── Return { url: stripe_checkout_url }
        │
        ▼
User pays on Stripe
        │
        ├──── Redirect → /payment/success (cosmetic)
        │
        └──── Webhook → POST /api/webhooks/stripe
                │
                ├── Verify signature
                ├── IDEMPOTENCY: Check checkout_sessions.status ≠ 'completed'
                ├── Look up email in public.users
                │     ├── Found → use existing user_id
                │     └── Not found → createUser() + generate recovery link + send welcome email
                ├── Process discounts (mark first purchase, spend/earn points, record coupon)
                ├── Upsert user_enrollments
                └── Update checkout_sessions → status: 'completed'
```

### Registered User Checkout

```
User clicks "Enroll" → CheckoutModal opens
        │
        ▼
DiscountSection calls POST /api/checkout/preview
  └── Returns discount breakdown (no Stripe session)
        │
User toggles discounts, clicks "Proceed to Payment"
        │
        ▼
POST /api/checkout
  ├── Auth cookie → user_id from session
  ├── calculateAllDiscounts()
  ├── Create Stripe Checkout Session (client_reference_id = user_id)
  ├── Insert checkout_sessions (status: 'pending', user_id set)
  └── Return { url }
        │
        ▼
User pays → Webhook fires → same flow as above (but user already exists)
```

---

## 16. Important Design Decisions

### 1. Dual-Table Design: `checkout_sessions` + `user_enrollments`
- `checkout_sessions` tracks payment attempts (including failed/cancelled)
- `user_enrollments` tracks actual access grants
- Separated so failed payments don't interfere with enrollment logic

### 2. Discount Metadata in Stripe Session
All discount details are serialized into `session.metadata` when creating the Stripe session. The webhook reads them back. This means:
- No need to re-calculate discounts in the webhook
- The webhook knows exactly what was promised to the user
- Stripe stores the metadata for auditing

### 3. Enrollment Upsert Strategy
`user_enrollments` uses `onConflict: 'user_id, course_id'`. If a user somehow gets processed twice, it updates the existing row instead of failing. This is safe and idempotent.

### 4. Points as Integer, Not Float
Points are stored as integers. 1000 points = one discount unit. This avoids floating-point precision issues and makes the math simple.

### 5. Guest → Registered User Bridge
Guests who purchase get an auth account created in the webhook. If a guest's email matches an existing account, the purchase is linked to that account instead of creating a duplicate. This lookup uses the `public.users` table.

### 6. Email via Resend, Not Supabase
Supabase's built-in email service has shared IP, rate limits, and poor deliverability. Using `generateLink()` + Resend gives full control over email content and delivery.

---

## 17. Scaling Notes

### What Works Well at Scale
- **Atomic point operations**: `adjust_user_points` RPC handles concurrent modifications safely
- **Webhook idempotency**: Duplicate events are safely ignored based on checkout_sessions.status
- **User lookup by email**: Uses indexed `public.users` table query, not `listUsers()` pagination
- **Enrollment deduplication**: Upsert on `(user_id, course_id)` prevents duplicates
- **Coupon security**: `increment_coupon_usage` only callable by service_role

### Potential Scaling Considerations
- **Coupon validation**: Currently reads are not locked. Under extremely high concurrency, a coupon could be slightly over-used before the count catches up. For most platforms, this is negligible.
- **Webhook processing time**: All discount operations happen sequentially. If processing becomes slow, consider a background job queue (e.g., Inngest, QStash).
- **Admin settings cache**: `getAdminSetting()` makes a DB query every time. For high-traffic scenarios, consider caching these values.
- **Point transactions table**: Will grow linearly with purchases. Add archiving or partitioning if it gets very large.

---

*Last updated: 2026-02-18*
