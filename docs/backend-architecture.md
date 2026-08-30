# ZakTalks backend architecture baseline

Audit date: 2026-08-15  
Supabase project: `zaktalks` (`skhypygfbvzfkjkfjlej`)  
Database: PostgreSQL 17.6.1, `ap-northeast-1`

## Purpose and audit boundary

This is the durable starting point for future backend work. It records the live Supabase structure and reconciles it with the Next.js application. The initial audit did not export private user, payment, or assessment row contents. Subsequent changes are recorded in the migration section below.

For future tasks, inspect the relevant part of this document first, then re-query only the tables, functions, policies, and application paths involved in the requested change. Re-run the Supabase advisors after every database migration.

## System overview

- Next.js 16 App Router application using React 19.
- Supabase SSR clients:
  - browser client: publishable/legacy anon key
  - cookie-aware server client: anon key plus the current user session
  - server-only administrative client: service-role key, used by trusted routes/actions
- Supabase Auth: email provider; `auth.users` is mirrored one-to-one into `public.users` by database triggers.
- Stripe Checkout: checkout route creates a Stripe session and a pending database record; the signed Stripe webhook creates/links the user, grants enrollment, applies discount bookkeeping, and completes the checkout record.
- Resend: transactional email for guest-purchase password setup and public contact/event forms.
- Course delivery: published course metadata, ordered modules, lessons, enrollments, progress, certificates, and assessments.
- No Supabase Edge Functions and no public/materialized database views were present at audit time.

```text
Browser
  -> Next.js server/components/actions
       -> Supabase session client -> RLS-protected public tables
       -> trusted server routes -> service-role client -> administrative writes
       -> Stripe Checkout
            -> signed Stripe webhook -> user + enrollment + discount/points writes
       -> Supabase Storage -> course media, certificates, assessment documents
```

## Authentication and authorization

- `src/lib/supabase/client.js`: browser client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `src/lib/supabase/server.js`: cookie-aware server client for the signed-in user.
- `src/lib/supabase/admin.js`: service-role client with session persistence and token refresh disabled, protected by an explicit `server-only` import.
- `src/lib/supabase/middleware.js`: refreshes the session, protects `/dashboard`, and redirects authenticated users away from `/login` and `/register`.
- `src/app/admin/layout.js` calls `requireStaff()`, allowing authenticated `admin` and `creator` accounts into the staff shell. Individual pages, APIs, and server actions call centralized `requirePermission()` checks.
- Administrators implicitly receive every registered permission. Creator permissions are stored in `public.creator_permissions` and managed only by administrators from Roles & Access. Creator access to Roles & Access is never configurable.
- Privileged backend operations use the server-only service client only after the session user passes the application permission check. Database-side admin policies continue to call `public.is_admin()`; its service-role branch supports these already-authorized backend operations without granting creators general RLS-admin status.
- Auth profile lifecycle:
  - `auth.users` INSERT -> `public.handle_new_user()` -> insert `public.users` profile.
  - `auth.users` UPDATE -> `public.handle_auth_user_update()` -> synchronize email and verification status.

## Application tables

All 19 application tables have RLS enabled. Row counts below are approximate audit-time metadata, not exported data.

### Identity and access

#### `users`

One-to-one application profile for `auth.users`.

- Key columns: `id uuid` PK/FK -> `auth.users.id`; unique `email`; `first_name`; `last_name`; `role` (`user|creator|admin`); nonnegative `points`; email/password/discount flags; durable welcome-email pending/claim/result fields; `avatar_url`; timestamps.
- RLS: users read their own profile; users may update their own row only while the resulting role remains `user`; admins have an all-operations policy.
- Approximate rows: 2.

#### `creator_permissions`

Global feature permissions for the creator role. Each registered permission key has an enabled switch, updater, and timestamps. Administrators are implicitly authorized and are not represented by rows in this table.

- RLS: authenticated administrators manage rows; trusted permission checks read through the server-only service client.

#### `staff_access_audit_log`

Append-only operational history for privileged account creation and creator permission changes.

- RLS/grants: administrators may read; only the service role writes.

#### `user_tokens`

Application token store for `email_verification`, `password_reset`, or `set_password`.

- Key columns: unique `token`, `user_id` -> `users`, `type`, expiry/use timestamps.
- RLS: admin read only. No current application reference was found; Supabase Auth links are used instead.
- Approximate rows: 0.

### Course catalog and delivery

#### `courses`

Course catalog and long-form course-page content.

- Key columns: unique `slug`; title/description/subheadline; optional public `introduction_video_url`; tutor/media fields; `price_cents`; content arrays (`what_youll_learn`, `skills_youll_gain`, `target_audience`, `who_this_is_not_for`); plain-text `details_to_know`; detail copy; publish/soft-delete flags; certificate template URL. The introduction video belongs to the course itself and is not a module lesson. The obsolete `the_problem` and `the_shift` fields were removed.
- Constraints: nonnegative price.
- RLS: anyone can read published, non-deleted courses; admins manage all.
- Approximate rows: 4.

#### `course_images`

Ordered course gallery metadata.

- Key columns: `course_id` -> `courses`, URL, alt text, display order.
- RLS: public read only when the parent course is published and not deleted; admins manage all.
- Approximate rows: 1.

#### `course_faqs`

Ordered FAQ content per course.

- Key columns: `course_id` -> `courses`, question, answer, display order.
- RLS: public read only when the parent course is published and not deleted; admins manage all.
- Approximate rows: 1.

#### `course_modules`

Ordered curriculum containers belonging to a course.

- Key columns: `course_id` -> `courses`; title/optional description; positive `display_order`; timestamps.
- Constraints: `(id, course_id)` is unique so the lesson relationship can guarantee that a module and lesson belong to the same course.
- RLS: modules for published, non-deleted courses are publicly readable; authenticated admins manage all.
- Existing data migration: each of the two existing courses has one `Module 01`, preserving its original 17-lesson order.
- Approximate rows: 3.

#### `lessons`

Ordered video or assessment units.

- Key columns: `course_id` -> `courses`; required `module_id`; module-local `display_order`; title/description/thumbnail; `type`; YouTube URL/duration; assessment key/passing score.
- Constraints: the composite `(module_id, course_id)` FK prevents cross-course assignment and restricts deletion of non-empty modules; videos require `youtube_url`; assessments require `assessment_key`; score is 0–100.
- RLS: published-course lessons are publicly readable; admins manage all. Enrollment enforcement is performed by player layouts/actions, not by the lesson SELECT policy itself.
- Approximate rows: 36.

#### `lesson_resources`

One optional supplemental resource per lesson, available for either video or assessment lessons.

- Key columns: unique `lesson_id` -> `lessons`; `resource_type` (`text`, `pdf`, or `link`); exactly one matching payload (`text_content`, `storage_path`, or `external_url`); original PDF name and byte size; timestamps.
- Constraints: resource-type checks prevent mixed or incomplete payloads; lesson deletion cascades to its resource metadata.
- RLS/grants: anonymous users have no access. Signed-in learners may read a resource only when they have a completed enrollment and that exact lesson is complete; admins may read all. Admin/creator mutations use permission-checked server actions and the server-only service role.
- Approximate rows: 0.

#### `user_enrollments`

Unique user/course entitlement and payment result.

- Key columns: `user_id` -> `users`; `course_id` -> `courses`; unique `(user_id, course_id)`; unique Stripe payment intent; payment/price/discount/points fields; optional coupon; completion/certificate fields.
- RLS: users read their own enrollments; admins manage all.
- Approximate rows: 2.

#### `lesson_progress`

Unique per-user lesson progress, resumable video position, and assessment score.

- Key columns: `user_id` -> `users`; `lesson_id` -> `lessons`; `enrollment_id` -> `user_enrollments`; unique `(user_id, lesson_id)`; verified watch time; resume and furthest positions; completion/heartbeat timestamps; score/attempt fields.
- Progress behavior: YouTube playback checkpoints are server-validated against authenticated enrollment, sequential lesson access, elapsed time, and the trusted video duration. Video completion occurs at 97%; assessments retain their existing completion engines.
- RLS/grants: authenticated users and admins can read permitted progress rows. Browser roles cannot insert or update progress directly; authenticated server actions perform validated writes through the server-only service client.
- Approximate rows: 23.

### Checkout, discounts, and points

#### `checkout_sessions`

Durable order, discount reservation, payment state, and fulfillment audit record for Stripe Checkout.

- Key columns: unique `stripe_session_id` and Stripe PaymentIntent; course/user/enrollment/coupon links; guest identity; server-calculated original/expected amounts; reserved points and first-purchase discount; separate payment and fulfillment states; retry/error/email/refund/dispute timestamps; and a durable guest password-email claim.
- Concurrency: partial unique indexes permit only one pending checkout per registered user or guest email. `create_checkout_order` validates and reserves points, coupon capacity, and first-purchase eligibility while holding an identity advisory lock.
- Fulfillment: `finalize_course_purchase` atomically creates access, applies coupon/points/reward effects, and completes the order. Replays are idempotent; a distinct duplicate payment is detected and refunded without duplicating access or rewards.
- Guest setup: `claim_checkout_password_setup_email` serializes secure-link generation between the webhook and success-page reconciliation. Resend requests use a claim-specific idempotency key, and confirmed delivery clears both the claim and any older email error.
- Reversals: full refunds and lost disputes revoke access and reverse coupon/reward effects once; partial refunds retain access; dispute wins restore access.
- RLS/grants: users read their own sessions; admins manage all. Payment mutation functions are executable only by the service role.

#### `stripe_webhook_events`

Verified Stripe event idempotency and operational audit log.

- Key columns: Stripe event ID, type/object ID, live/test mode, processing status, attempts, error, receipt/completion timestamps.
- RLS/grants: no browser access; service role only.
- Stripe endpoint events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`, and `charge.dispute.closed`.
- Recovery: the success page invokes the same idempotent finalizer as the webhook. Admins can also POST a Checkout Session ID to `/api/admin/payments/reconcile`; the endpoint re-reads Stripe before making any access change.

#### `coupons`

Coupon definition and aggregate use count.

- Key columns: unique code; active/expiry flags; `percentage|fixed` type and value; total/per-user limits; usage count; all-course flag.
- Constraints: allowed discount types and percentage <= 100.
- RLS: admin operations only. Validation uses trusted server code.
- Approximate rows: 0.

#### `coupon_courses`

Many-to-many coupon/course scope.

- Composite PK: `(coupon_id, course_id)`; both cascading FKs.
- RLS: public SELECT is currently allowed.
- Approximate rows: 0.

#### `coupon_usages`

Per-user, per-course coupon usage ledger.

- Unique `(coupon_id, user_id, course_id)` plus cascading FKs.
- RLS: users read their own usage; trusted server writes.
- Approximate rows: 0.

#### `admin_settings`

Key/value discount configuration.

- Unique `key`, text value/description, update timestamp.
- RLS: public SELECT; admin UPDATE.
- Approximate rows: 0. Code therefore falls back to environment/default values unless settings are later inserted.

#### `point_transactions`

Points audit ledger.

- Key columns: user, signed amount, type, optional reference and description.
- RLS: users read their own rows. Browser roles have no INSERT table grant or INSERT policy; trusted service-role code writes the ledger while bypassing RLS.
- Approximate rows: 3.

#### `user_discounts`

User-specific percentage/fixed discount grants.

- Key columns: user, optional course/enrollment, discount value, reason, granting user, validity/use timestamps.
- RLS: users read their own rows; admins manage all.
- Approximate rows: 0. No current application read/write path was found in the audited code.

### Assessments

#### `specific_assessment_lessons`

Maps one lesson to one fillable assessment template in private Storage.

- Unique `lesson_id` -> `lessons`; assessment key and default file path/name.
- RLS: enrolled users read; admins manage.
- Approximate rows: 0.

#### `specific_assessment_submissions`

One generated submission per user/lesson.

- Unique `(lesson_id, user_id)`; links to user, lesson, and optional enrollment; JSON answers and generated document path/name.
- RLS: enrolled users read/insert/update their own submission; admins manage.
- Approximate rows: 0.

#### `external_assessment_links`

Short-lived revocable public entry tokens created by admins.

- Unique token, assessment key, creator/revoker links, 24-hour default expiry.
- RLS: authenticated admins manage. Public validation is intentionally performed in a server action using the service role, which returns only the assessment key.
- Approximate rows: 4.

## Core relationships

```text
auth.users 1--1 users
users 1--* user_enrollments *--1 courses
courses 1--* course_modules 1--* lessons
lessons 1--0..1 lesson_resources
users 1--* lesson_progress *--1 lessons
user_enrollments 1--* lesson_progress
courses 1--* course_images
courses 1--* course_faqs
coupons *--* courses (coupon_courses)
coupons 1--* coupon_usages *--1 users
checkout_sessions -> course, user, coupon, enrollment
lessons 1--0..1 specific_assessment_lessons
users + lessons -> specific_assessment_submissions
```

Foreign-key actions are intentionally mixed: course/user child content generally cascades; paid enrollment and checkout course links restrict or preserve records; assessment enrollment links may become null.

## PostgreSQL functions and triggers

Five custom functions exist. All five are `SECURITY DEFINER`, owned by `postgres`, use an empty fixed `search_path`, and schema-qualify referenced objects.

### `adjust_user_points(p_user_id uuid, p_delta integer) -> integer`

Atomically updates `users.points` with `GREATEST(0, points + delta)` and returns the new balance. Used by trusted discount code for point earning/spending.

Only `service_role` can execute it. Anonymous and authenticated browser roles are explicitly denied.

### `increment_coupon_usage(p_coupon_id uuid) -> void`

Atomically increments `coupons.usage_count`. Only `service_role` can execute it.

### `is_admin() -> boolean`

Returns whether `auth.uid()` has role `admin` in `public.users`. It has explicit `anon`, `authenticated`, and `service_role` execution because current RLS policies call it for those request roles; the grant is intentional and the function accepts no input or performs writes. Moving it into a private schema is a possible future policy refactor.

### `handle_new_user() -> trigger`

After an Auth user is inserted, creates the `public.users` profile using email and first/last name metadata.

Direct browser execution is revoked; `supabase_auth_admin` and `service_role` retain execution.

### `handle_auth_user_update() -> trigger`

After an Auth user is updated, synchronizes email, verification state, and timestamp into `public.users`.

Direct browser execution is revoked; `supabase_auth_admin` and `service_role` retain execution.

### Trigger wiring

- `auth.users.on_auth_user_created` -> `public.handle_new_user()`.
- `auth.users.on_auth_user_updated` -> `public.handle_auth_user_update()`.
- Storage also has three Supabase-managed object/bucket protection/update triggers.

## RLS and grants summary

- All application tables have RLS enabled.
- Public catalog reads: published courses, their modules, lessons, images, and FAQs.
- Own-row reads/writes: profile, enrollment, checkout, progress, points/coupon ledgers, and submissions as described above.
- Admin policies generally call `is_admin()` or query `public.users`.
- Most older policies target the implicit `public` role instead of explicitly targeting `anon` or `authenticated`. RLS expressions still restrict many operations, but explicit roles would reduce exposure and advisor noise.
- `service_role` has broad table privileges by design and bypasses RLS. It is used only in server-side code in the current repository.
- No views exist, so there is currently no `security_invoker` view concern.

## Storage

| Bucket | Public | Limit | Allowed types | Purpose |
|---|---:|---:|---|---|
| `course-images` | yes | 5 MiB | JPEG, PNG, WebP, GIF | course logos/gallery |
| `public-assets` | yes | 10 MiB | unrestricted | general public assets |
| `certificates` | no | 10 MiB | PDF | certificate templates/generated certificates |
| `specific-assessments` | no | 10 MiB | PDF, DOCX | templates and user-generated assessment files |
| `lesson-resources` | no | 10 MiB | PDF | optional supplemental lesson PDFs |

Storage policies allow public reads for public buckets, admin inserts/deletes for course/public assets, owner/admin reads for certificates, enrolled/template reads for specific assessments, owner-path reads for generated assessments, and completed-lesson/admin reads for lesson-resource PDFs. Lesson-resource writes use permission-checked server actions and the service role.

## Application integration map

- Auth/profile: `src/app/auth/*`, `src/lib/auth-utils.js`, Navbar, dashboard.
- Course discovery/detail: `src/app/courses/page.js`, `src/app/courses/[slug]/page.js`.
- Course player/progress: `src/app/courses/[slug]/player/*`, `src/app/courses/actions.js`.
- Internal scored assessments: `src/components/AssessmentRenderer.js` and `src/assessments/results.js` validate answers, recalculate trusted score summaries, and append `assessment_attempts` through a service-role-only atomic RPC. Raw answers and interpretation copy are not stored in the attempt ledger. Scoreless fillable worksheets continue through their separate private submission/PDF flow.
- Course administration: `src/app/admin/courses/*` -> courses, modules, lessons, optional lesson resources, FAQs, and image/certificate/resource Storage.
- Checkout preview/create: `src/app/api/checkout/preview/route.js`, `src/app/api/checkout/route.js`.
- Payment fulfillment: `src/app/api/webhooks/stripe/route.js` -> Auth admin, checkout sessions, enrollments, discounts, points, Resend.
- Discounts/points/coupons: `src/lib/discount-utils.js`, `src/app/admin/coupons/*`, `src/app/admin/settings/*`.
- Certificates: `src/app/courses/certificate.actions.js` -> private certificate Storage.
- Specific assessments: `src/app/courses/specific-assessment.actions.js` -> lesson/enrollment checks, submission upsert, private Storage, progress completion.
- External assessment links: admin dashboard actions plus `src/app/assessments/external/*`.
- Public contact/event booking routes use Resend and do not persist submissions in Supabase.

## Migration state and drift

The formal migration workflow was established on 2026-08-15:

- `20260815204105_production_baseline.sql` captures 18 application tables, 4 enum types, constraints/relationships, 24 non-constraint indexes, 46 public/Storage policies, 5 functions, 4 bucket definitions, grants, and the two application Auth triggers. It is registered as already applied on production.
- `20260815204221_harden_privileged_functions_and_points_ledger.sql` is the first incremental migration and is applied on production.
- `20260816084642_add_course_modules.sql` adds module-based curricula, backfills both existing courses without replacing lessons, makes module assignment mandatory, adds cross-course integrity constraints/indexes, and defines explicit module RLS/grants. It is applied on production.
- `20260816093843_secure_video_progress.sql` adds heartbeat-backed resumable playback constraints/indexing and restricts progress mutations to trusted server code. It is applied on production.
- `20260817135330_serialize_guest_password_emails.sql` adds a service-role-only guest email lease, prevents concurrent setup-link delivery, and repairs stale email errors on confirmed sends. It is applied on production.
- `20260817163000_harden_fulfillment_notification_claims.sql` adds owner-checked leases for delayed-access and recovery emails, prevents stale notification workers from overwriting newer retries, and closes the failure-email/recovery timing window. It is applied on production.
- `20260817190000_user_welcome_emails.sql` adds a service-role-only, user-level welcome-email lease and delivery audit. New signup accounts become eligible after verification; guest accounts become eligible only after their first successful password setup. It is applied on production.
- `20260817213000_auth_abuse_protection.sql` adds privacy-preserving, service-role-only fixed-window throttles for public authentication and checkout entry points. It is applied on production.
- `20260817224500_admin_enrollments_dashboard.sql` adds indexed, admin-only enrollment access reporting with server-side filters, summaries, course distribution, trends, and pagination. It is applied on production.
- `20260817231500_admin_learning_progress_dashboard.sql` adds indexed, admin-only learner-course progress reporting with true curriculum denominators, activity/completion trends, course and module health, pagination, and a scoped module/lesson drill-down. It is applied on production.
- `20260817235500_admin_course_performance.sql` adds a course-focused admin portfolio with one row per course, indexed engagement reporting, curriculum and module health, recorded activity heat maps, completion trends, and paginated learner drill-downs. It is applied on production.
- `20260818001500_admin_course_module_attention_signals.sql` introduces admin-only, evidence-based module attention reporting with early-sample protection. It is applied on production.
- `20260818004500_refine_module_eligibility_attention.sql` aligns module signals with sequential lesson access. It excludes locked modules, derives when each module became available from enrollment or prior-module completion, and distinguishes overdue unstarted learners from stale in-progress learners without treating low progress alone as unhealthy. It is applied on production.
- `20260818011500_admin_course_filtered_trends.sql` adds admin-only enrollment and activity trend aggregation for course IDs selected by the evidence-based health filter. Course health is now derived from sample size, overdue or stalled journeys, and module signals rather than raw progress percentage. It is applied on production.
- `20260818023000_admin_video_analytics.sql` adds indexed, admin-only video reporting with verified playback coverage, honest duration-quality handling, starts and completions, fresh-heartbeat playback state, course comparisons, paginated lesson reporting, and learner-level video drill-downs. It deliberately does not infer replay counts or second-by-second retention because those events are not stored. It is applied on production.
- `20260818031500_internal_assessment_attempts.sql` adds an append-only, RLS-protected attempt ledger for scored lesson-player assessments. Its service-role-only RPC serializes concurrent retakes, derives course/module/enrollment context from trusted rows, atomically appends each score and updates lesson completion, and makes client retries idempotent. Existing latest scores were preserved as historical attempt 1; older overwritten retakes cannot be reconstructed. It is applied on production.
- `20260818043000_admin_assessment_results.sql` adds admin-only, paginated reporting functions for learner-focused and assessment-focused result views. It combines scored attempt history with scoreless worksheet submission metadata without exposing raw worksheet answers. Private PDFs are resolved separately through a short-lived signed URL only when an authenticated admin requests one. It is applied on production.
- `20260818054500_admin_assessment_activity_timeline.sql` replaces misleading cross-assessment score bands with an admin-only participation timeline. It reports first attempts, retakes, worksheet submissions, and unique learners in adaptive daily, weekly, or monthly buckets. It is applied on production.
- `20260819090000_add_creator_role.sql` extends the user role constraint with `creator` without granting administrative access. It is applied on production.
- `20260819103000_creator_permissions.sql` adds centralized creator permission switches, privileged-access auditing, and guarded service-role RPC support. It is applied on production.
- `20260820184747_admin_payments_dashboard.sql` adds service-role-only payment reporting built from durable checkout orders, with indexed server-side filters, keyset pagination, fulfillment and payment health, exact recorded totals, discount/source summaries, and on-demand webhook and notification drill-downs. It is applied on production.
- `20260820192526_optimize_user_purchase_history.sql` adds an ownership-scoped purchase-history index and optimizes the existing authenticated-user SELECT policy without changing its authorization boundary. It is applied on production.
- `20260824120614_restructure_course_content_and_lesson_resources.sql` renames the course learning/skills/detail fields without losing existing values, converts course details from an array to plain text, removes the obsolete problem/shift fields, and adds constrained private lesson resources plus a private PDF-only Storage bucket. It is applied on production.
- `20260824121831_consolidate_lesson_resource_read_policy.sql` combines learner and administrator resource reads into one authenticated policy to avoid duplicate-policy evaluation while preserving the same access boundary. It is applied on production.
- `20260824125518_gate_lesson_resources_by_completion.sql` requires completed lesson progress before a learner can read resource metadata or a private lesson PDF, links Storage authorization to the exact resource row, and indexes unique PDF paths. It is applied on production.
- `20260824182553_add_course_introduction_video.sql` adds an optional, publicly readable YouTube introduction-video URL to each course with a secure YouTube-domain constraint. It is applied on production.
- The live and local migration histories now match.
- Eight older scripts remain in the repository's root `migrations/` directory as historical references. Do not run them again or treat them as pending migrations.

All future database changes belong in `supabase/migrations/` and should be reviewed, pushed, and verified through the CLI workflow.

## Current advisor findings

### Resolved authorization findings

1. `adjust_user_points` and `increment_coupon_usage` are service-role-only.
2. All five security-definer functions have fixed empty search paths and schema-qualified references.
3. Auth trigger helpers are restricted to Supabase Auth and the service role.
4. Browser INSERT access and the broad INSERT policy were removed from `point_transactions`.
5. The service-role client now has an explicit `server-only` module boundary.

Role-level rollback tests passed for anonymous catalog access, normal-user own-profile RLS, admin RLS, both service-role financial RPCs, and service-role ledger access.

Advisor references: [anonymous security-definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated security-definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [mutable function search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).

### Priority 1: Auth hardening

- Enable leaked-password protection in Supabase Auth. [Password security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- The service-role client boundary is now enforced with `import 'server-only'`.
- Public login, signup, recovery, guest checkout, and checkout-preview entry points are protected by server-side fixed-window throttles. Only HMAC identifiers are stored; raw emails and IP addresses are not persisted in the throttle table.
- Public login, signup, recovery, and guest checkout verify Cloudflare Turnstile on the server. Development uses Cloudflare's official always-pass test keys when local keys are absent; production fails closed until real keys are configured.
- Password login can delegate the same single-use Turnstile token to Supabase Auth by setting `SUPABASE_AUTH_CAPTCHA_ENABLED=true`. This must be enabled together with Supabase Auth CAPTCHA; signup, recovery, guest checkout, payment fulfillment, and password setup retain their existing server/Admin flows and application-side Turnstile verification.
- Password recovery always returns the same user-facing success result for existing and unknown addresses. This prevents account enumeration while preserving server-side error logging.

### Priority 2: query/RLS performance

- Several foreign keys still lack a covering index, notably all four checkout-session FKs and several coupon, assessment, and discount FKs. Add only the indexes justified by real access/delete patterns.
- Several older RLS policies still evaluate `auth.uid()`/Auth helpers per row. Use `(select auth.uid())` or the equivalent cached expression where valid.
- Multiple permissive-policy warnings exist where admin and user/public SELECT policies overlap. Some are structurally expected, but explicit target roles and consolidated policy design would reduce work and ambiguity.
- Ten indexes are reported unused. Do not remove them solely from this small dataset; review after representative production traffic.

Advisor references: [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [RLS init-plan optimization](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [multiple permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Environment contract

The repository expects these names; values are intentionally not recorded:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET_LOCAL`
- Resend: `RESEND_API_KEY`
- App: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`
- Abuse protection: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `SUPABASE_AUTH_CAPTCHA_ENABLED`, and preferably a dedicated `SECURITY_RATE_LIMIT_SECRET` (the server falls back to the existing service-role secret if omitted)
- Other: `FIRST_PURCHASE_DISCOUNT_PERCENT`, `YOUTUBE_API_KEY`

## Working rules for future backend tasks

1. Identify the flow and inspect only its application files, tables, policies, functions, and storage bucket.
2. Treat the committed production baseline plus subsequent migrations as the schema source of truth; re-query production when checking for drift.
3. Make every schema/policy/function change as a named migration; never apply ad hoc dashboard SQL without capturing it.
4. Keep the service role server-only. Use the user-scoped server client whenever RLS should enforce access.
5. Validate authorization independently of UI visibility and middleware routing.
6. Preserve webhook idempotency and move multi-step financial mutations toward database transactions when that flow is next changed.
7. Re-run security and performance advisors after DDL/RLS/function changes.
8. Test the affected user, admin, anonymous, webhook, and failure paths before merging.

## Known unknowns

- The exact pre-baseline history/order cannot be reconstructed because the original SQL was applied manually; the 2026-08-15 baseline is the authoritative starting state.
- The generated baseline was structurally reconciled against production, but a full local `supabase db reset` replay still requires Docker Desktop, which was unavailable during this change.
- Dashboard-only Auth settings other than the advisor/provider evidence were not exported.
- SMTP, URL allowlists, Stripe Dashboard configuration, Resend domain configuration, and deployed hosting secrets are external configuration and were not changed or fully audited here.
- Row-level business correctness was inferred from schema and code without exporting private rows.
