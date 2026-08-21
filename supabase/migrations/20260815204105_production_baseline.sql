+-- Production schema baseline captured from the linked Supabase project on 2026-08-15.
-- This migration is marked as already applied on the existing production project.
-- It is intended to recreate application-owned public schema objects on fresh environments.
-- Supabase-managed auth/storage schemas are provided by the platform; only custom policies,
-- bucket configuration, and the two application Auth triggers are included here.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Application enum types
CREATE TYPE public.checkout_status AS ENUM ('pending', 'completed', 'expired', 'failed');
CREATE TYPE public.lesson_type AS ENUM ('video', 'assessment');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.token_type AS ENUM ('email_verification', 'password_reset', 'set_password');

-- Application tables
CREATE TABLE public.admin_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  key character varying(100) NOT NULL,
  value text NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now());

CREATE TABLE public.checkout_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  stripe_session_id text,
  email text,
  first_name text,
  last_name text,
  course_id uuid NOT NULL,
  status checkout_status DEFAULT 'pending'::checkout_status NOT NULL,
  user_id uuid,
  enrollment_id uuid,
  coupon_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
  completed_at timestamp with time zone);

CREATE TABLE public.coupon_courses (
  coupon_id uuid NOT NULL,
  course_id uuid NOT NULL);

CREATE TABLE public.coupon_usages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  coupon_id uuid NOT NULL,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  used_at timestamp with time zone DEFAULT now());

CREATE TABLE public.coupons (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  discount_type character varying(20) NOT NULL,
  discount_value integer NOT NULL,
  max_uses_total integer,
  max_uses_per_user integer DEFAULT 1,
  usage_count integer DEFAULT 0,
  expires_at timestamp with time zone,
  applies_to_all_courses boolean DEFAULT false);

CREATE TABLE public.course_faqs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  course_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.course_images (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  course_id uuid NOT NULL,
  image_url text NOT NULL,
  alt_text text,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.courses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  tutor_name text,
  logo_url text,
  price_cents integer NOT NULL,
  course_offers text[] DEFAULT '{}'::text[],
  course_benefits text[] DEFAULT '{}'::text[],
  target_audience text[],
  why_attend text[],
  meet_the_tutor text,
  certificate_template_url text,
  is_published boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  money_back_guarantee boolean DEFAULT false,
  subheadline text,
  the_problem text,
  the_shift text,
  who_this_is_not_for text[]);

CREATE TABLE public.external_assessment_links (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  assessment_key text NOT NULL,
  token text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
  revoked_at timestamp with time zone,
  revoked_by uuid);

CREATE TABLE public.lesson_progress (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  enrollment_id uuid NOT NULL,
  is_completed boolean DEFAULT false NOT NULL,
  watch_time_seconds integer DEFAULT 0,
  last_position_seconds integer DEFAULT 0,
  max_position_reached_seconds integer DEFAULT 0,
  score integer,
  attempts integer DEFAULT 0 NOT NULL,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone);

CREATE TABLE public.lessons (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  course_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  display_order integer DEFAULT 0 NOT NULL,
  type lesson_type NOT NULL,
  youtube_url text,
  duration_seconds integer,
  assessment_key text,
  passing_score integer DEFAULT 70,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone);

CREATE TABLE public.point_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type character varying(30) NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.specific_assessment_lessons (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  lesson_id uuid NOT NULL,
  assessment_key text NOT NULL,
  default_file_path text NOT NULL,
  default_file_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.specific_assessment_submissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  lesson_id uuid NOT NULL,
  user_id uuid NOT NULL,
  enrollment_id uuid,
  assessment_key text NOT NULL,
  answers jsonb DEFAULT '{}'::jsonb NOT NULL,
  generated_file_path text,
  generated_file_name text,
  submitted_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.user_discounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  course_id uuid,
  discount_percent integer,
  discount_amount_cents integer,
  reason text,
  granted_by uuid,
  used_at timestamp with time zone,
  enrollment_id uuid,
  valid_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.user_enrollments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  stripe_payment_intent_id text,
  payment_status payment_status DEFAULT 'pending'::payment_status NOT NULL,
  amount_paid_cents integer NOT NULL,
  original_price_cents integer NOT NULL,
  discount_applied_cents integer DEFAULT 0 NOT NULL,
  points_earned integer DEFAULT 0 NOT NULL,
  coupon_id uuid,
  first_purchase_discount_applied boolean DEFAULT false NOT NULL,
  completed_at timestamp with time zone,
  certificate_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone);

CREATE TABLE public.user_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  token text NOT NULL,
  type token_type NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL,
  first_name text,
  last_name text,
  role text DEFAULT 'user'::text NOT NULL,
  points integer DEFAULT 0 NOT NULL,
  email_verified boolean DEFAULT false NOT NULL,
  password_set boolean DEFAULT false NOT NULL,
  first_purchase_discount_used boolean DEFAULT false NOT NULL,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone);

-- Primary keys, unique constraints, and checks
ALTER TABLE ONLY public.admin_settings ADD CONSTRAINT admin_settings_key_key UNIQUE (key);
ALTER TABLE ONLY public.admin_settings ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.checkout_sessions ADD CONSTRAINT checkout_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.checkout_sessions ADD CONSTRAINT checkout_sessions_stripe_session_id_key UNIQUE (stripe_session_id);
ALTER TABLE ONLY public.coupon_courses ADD CONSTRAINT coupon_courses_pkey PRIMARY KEY (coupon_id, course_id);
ALTER TABLE ONLY public.coupon_usages ADD CONSTRAINT coupon_usages_coupon_id_user_id_course_id_key UNIQUE (coupon_id, user_id, course_id);
ALTER TABLE ONLY public.coupon_usages ADD CONSTRAINT coupon_usages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.coupons ADD CONSTRAINT coupons_code_key UNIQUE (code);
ALTER TABLE ONLY public.coupons ADD CONSTRAINT coupons_discount_type_check CHECK (discount_type::text = ANY (ARRAY['percentage'::character varying, 'fixed'::character varying]::text[]));
ALTER TABLE ONLY public.coupons ADD CONSTRAINT coupons_percentage_max_check CHECK (discount_type::text <> 'percentage'::text OR discount_value <= 100);
ALTER TABLE ONLY public.coupons ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.course_faqs ADD CONSTRAINT course_faqs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.course_images ADD CONSTRAINT course_images_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.courses ADD CONSTRAINT courses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.courses ADD CONSTRAINT courses_price_cents_check CHECK (price_cents >= 0);
ALTER TABLE ONLY public.courses ADD CONSTRAINT courses_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.external_assessment_links ADD CONSTRAINT external_assessment_links_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.external_assessment_links ADD CONSTRAINT external_assessment_links_token_key UNIQUE (token);
ALTER TABLE ONLY public.lesson_progress ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lesson_progress ADD CONSTRAINT lesson_progress_score_check CHECK (score >= 0 AND score <= 100);
ALTER TABLE ONLY public.lesson_progress ADD CONSTRAINT lesson_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id);
ALTER TABLE ONLY public.lessons ADD CONSTRAINT assessment_requires_key CHECK (type <> 'assessment'::lesson_type OR assessment_key IS NOT NULL);
ALTER TABLE ONLY public.lessons ADD CONSTRAINT lessons_passing_score_check CHECK (passing_score >= 0 AND passing_score <= 100);
ALTER TABLE ONLY public.lessons ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lessons ADD CONSTRAINT video_requires_youtube CHECK (type <> 'video'::lesson_type OR youtube_url IS NOT NULL);
ALTER TABLE ONLY public.point_transactions ADD CONSTRAINT point_transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.specific_assessment_lessons ADD CONSTRAINT specific_assessment_lessons_lesson_id_key UNIQUE (lesson_id);
ALTER TABLE ONLY public.specific_assessment_lessons ADD CONSTRAINT specific_assessment_lessons_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.specific_assessment_submissions ADD CONSTRAINT specific_assessment_submissions_lesson_id_user_id_key UNIQUE (lesson_id, user_id);
ALTER TABLE ONLY public.specific_assessment_submissions ADD CONSTRAINT specific_assessment_submissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_discounts ADD CONSTRAINT discount_has_value CHECK (discount_percent IS NOT NULL OR discount_amount_cents IS NOT NULL);
ALTER TABLE ONLY public.user_discounts ADD CONSTRAINT user_discounts_discount_amount_cents_check CHECK (discount_amount_cents > 0);
ALTER TABLE ONLY public.user_discounts ADD CONSTRAINT user_discounts_discount_percent_check CHECK (discount_percent > 0 AND discount_percent <= 100);
ALTER TABLE ONLY public.user_discounts ADD CONSTRAINT user_discounts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_enrollments ADD CONSTRAINT user_enrollments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_enrollments ADD CONSTRAINT user_enrollments_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);
ALTER TABLE ONLY public.user_enrollments ADD CONSTRAINT user_enrollments_user_id_course_id_key UNIQUE (user_id, course_id);
ALTER TABLE ONLY public.user_tokens ADD CONSTRAINT user_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_tokens ADD CONSTRAINT user_tokens_token_key UNIQUE (token);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_points_check CHECK (points >= 0);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['user'::text, 'admin'::text]));

-- Foreign keys (after all tables exist)
ALTER TABLE ONLY public.checkout_sessions ADD CONSTRAINT checkout_sessions_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES coupons(id);
ALTER TABLE ONLY public.checkout_sessions ADD CONSTRAINT checkout_sessions_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.checkout_sessions ADD CONSTRAINT checkout_sessions_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES user_enrollments(id);
ALTER TABLE ONLY public.checkout_sessions ADD CONSTRAINT checkout_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE ONLY public.coupon_courses ADD CONSTRAINT coupon_courses_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.coupon_courses ADD CONSTRAINT coupon_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.coupon_usages ADD CONSTRAINT coupon_usages_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.coupon_usages ADD CONSTRAINT coupon_usages_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.coupon_usages ADD CONSTRAINT coupon_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.course_faqs ADD CONSTRAINT course_faqs_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.course_images ADD CONSTRAINT course_images_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.external_assessment_links ADD CONSTRAINT external_assessment_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.external_assessment_links ADD CONSTRAINT external_assessment_links_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.lesson_progress ADD CONSTRAINT lesson_progress_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES user_enrollments(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_progress ADD CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_progress ADD CONSTRAINT lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lessons ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.point_transactions ADD CONSTRAINT point_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.specific_assessment_lessons ADD CONSTRAINT specific_assessment_lessons_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.specific_assessment_submissions ADD CONSTRAINT specific_assessment_submissions_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES user_enrollments(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.specific_assessment_submissions ADD CONSTRAINT specific_assessment_submissions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.specific_assessment_submissions ADD CONSTRAINT specific_assessment_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_discounts ADD CONSTRAINT user_discounts_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_discounts ADD CONSTRAINT user_discounts_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES user_enrollments(id);
ALTER TABLE ONLY public.user_discounts ADD CONSTRAINT user_discounts_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES users(id);
ALTER TABLE ONLY public.user_discounts ADD CONSTRAINT user_discounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_enrollments ADD CONSTRAINT user_enrollments_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES coupons(id);
ALTER TABLE ONLY public.user_enrollments ADD CONSTRAINT user_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_enrollments ADD CONSTRAINT user_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_tokens ADD CONSTRAINT user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Non-constraint indexes
CREATE INDEX idx_checkout_status ON public.checkout_sessions USING btree (status);
CREATE INDEX idx_checkout_stripe ON public.checkout_sessions USING btree (stripe_session_id);
CREATE INDEX idx_coupons_code ON public.coupons USING btree (code) WHERE (is_active = true);
CREATE INDEX idx_course_faqs_course ON public.course_faqs USING btree (course_id, display_order);
CREATE INDEX idx_course_images_course ON public.course_images USING btree (course_id, display_order);
CREATE INDEX idx_courses_published ON public.courses USING btree (is_published) WHERE (deleted_at IS NULL);
CREATE INDEX idx_courses_slug ON public.courses USING btree (slug);
CREATE INDEX idx_enrollments_course ON public.user_enrollments USING btree (course_id);
CREATE INDEX idx_enrollments_stripe ON public.user_enrollments USING btree (stripe_payment_intent_id);
CREATE INDEX idx_enrollments_user ON public.user_enrollments USING btree (user_id);
CREATE INDEX idx_external_assessment_links_active ON public.external_assessment_links USING btree (expires_at, revoked_at);
CREATE INDEX idx_external_assessment_links_token ON public.external_assessment_links USING btree (token);
CREATE INDEX idx_lessons_assessment_key ON public.lessons USING btree (assessment_key) WHERE (assessment_key IS NOT NULL);
CREATE INDEX idx_lessons_course ON public.lessons USING btree (course_id, display_order);
CREATE INDEX idx_point_transactions_user ON public.point_transactions USING btree (user_id, created_at DESC);
CREATE INDEX idx_progress_enrollment ON public.lesson_progress USING btree (enrollment_id);
CREATE INDEX idx_progress_user ON public.lesson_progress USING btree (user_id);
CREATE INDEX idx_specific_assessment_lessons_assessment_key ON public.specific_assessment_lessons USING btree (assessment_key);
CREATE INDEX idx_specific_assessment_submissions_user_lesson ON public.specific_assessment_submissions USING btree (user_id, lesson_id);
CREATE INDEX idx_tokens_lookup ON public.user_tokens USING btree (token, type) WHERE (used_at IS NULL);
CREATE INDEX idx_tokens_user ON public.user_tokens USING btree (user_id);
CREATE INDEX idx_user_discounts_user ON public.user_discounts USING btree (user_id) WHERE (used_at IS NULL);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_role ON public.users USING btree (role);

-- Application PostgreSQL functions
CREATE OR REPLACE FUNCTION public.adjust_user_points(p_user_id uuid, p_delta integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE users
  SET points = GREATEST(0, points + p_delta),
      updated_at = now()
  WHERE id = p_user_id
  RETURNING points INTO new_balance;

  RETURN COALESCE(new_balance, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update public.users
  set 
    email_verified = (new.email_confirmed_at is not null),
    email = new.email,
    updated_at = now()
  where id = new.id;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE coupons 
  SET usage_count = usage_count + 1 
  WHERE id = p_coupon_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$function$
;

-- Application Auth triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_auth_user_update();

-- RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_assessment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specific_assessment_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specific_assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Infrastructure buckets (no production object data)
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('certificates','certificates','f',10485760,'{application/pdf}'::text[]) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('course-images','course-images','t',5242880,'{image/jpeg,image/png,image/webp,image/gif}'::text[]) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('public-assets','public-assets','t',10485760,NULL) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('specific-assessments','specific-assessments','f',10485760,'{application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'::text[]) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;

-- Application and Storage policies
CREATE POLICY "Allow admin update on admin_settings" ON public.admin_settings AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Allow public read on admin_settings" ON public.admin_settings AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY checkout_admin_all ON public.checkout_sessions AS PERMISSIVE FOR ALL TO public
  USING (is_admin());

CREATE POLICY checkout_read_own ON public.checkout_sessions AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Allow public read on coupon_courses" ON public.coupon_courses AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can read own coupon_usages" ON public.coupon_usages AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = auth.uid()));

CREATE POLICY coupons_admin_all ON public.coupons AS PERMISSIVE FOR ALL TO public
  USING (is_admin());

CREATE POLICY course_faqs_admin_all ON public.course_faqs AS PERMISSIVE FOR ALL TO public
  USING (is_admin());

CREATE POLICY course_faqs_public_read ON public.course_faqs AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM courses
  WHERE ((courses.id = course_faqs.course_id) AND (courses.is_published = true) AND (courses.deleted_at IS NULL)))));

CREATE POLICY course_images_admin_all ON public.course_images AS PERMISSIVE FOR ALL TO public
  USING (is_admin());

CREATE POLICY course_images_public_read ON public.course_images AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM courses
  WHERE ((courses.id = course_images.course_id) AND (courses.is_published = true) AND (courses.deleted_at IS NULL)))));

CREATE POLICY courses_admin_all ON public.courses AS PERMISSIVE FOR ALL TO public
  USING (is_admin());

CREATE POLICY courses_public_read ON public.courses AS PERMISSIVE FOR SELECT TO public
  USING (((is_published = true) AND (deleted_at IS NULL)));

CREATE POLICY "Admins manage external assessment links" ON public.external_assessment_links AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY progress_admin_read ON public.lesson_progress AS PERMISSIVE FOR SELECT TO public
  USING (is_admin());

CREATE POLICY progress_insert_own ON public.lesson_progress AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY progress_read_own ON public.lesson_progress AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY progress_update_own ON public.lesson_progress AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id));

CREATE POLICY lessons_admin_all ON public.lessons AS PERMISSIVE FOR ALL TO public
  USING (is_admin());

CREATE POLICY lessons_public_read ON public.lessons AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM courses
  WHERE ((courses.id = lessons.course_id) AND (courses.is_published = true) AND (courses.deleted_at IS NULL)))));

CREATE POLICY "Service role can insert point_transactions" ON public.point_transactions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Users can read own point_transactions" ON public.point_transactions AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "Admins manage specific assessment lessons" ON public.specific_assessment_lessons AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Enrolled users read specific assessment lessons" ON public.specific_assessment_lessons AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (lessons l
     JOIN user_enrollments ue ON ((ue.course_id = l.course_id)))
  WHERE ((l.id = specific_assessment_lessons.lesson_id) AND (ue.user_id = auth.uid())))));

CREATE POLICY "Admins manage specific assessment submissions" ON public.specific_assessment_submissions AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Users insert own enrolled specific assessment submissions" ON public.specific_assessment_submissions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (lessons l
     JOIN user_enrollments ue ON ((ue.course_id = l.course_id)))
  WHERE ((l.id = specific_assessment_submissions.lesson_id) AND (ue.user_id = auth.uid()))))));

CREATE POLICY "Users read own specific assessment submissions" ON public.specific_assessment_submissions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = auth.uid()));

CREATE POLICY "Users update own enrolled specific assessment submissions" ON public.specific_assessment_submissions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (lessons l
     JOIN user_enrollments ue ON ((ue.course_id = l.course_id)))
  WHERE ((l.id = specific_assessment_submissions.lesson_id) AND (ue.user_id = auth.uid()))))));

CREATE POLICY discounts_admin_all ON public.user_discounts AS PERMISSIVE FOR ALL TO public
  USING (is_admin());

CREATE POLICY discounts_read_own ON public.user_discounts AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY enrollments_admin_all ON public.user_enrollments AS PERMISSIVE FOR ALL TO public
  USING (is_admin());

CREATE POLICY enrollments_read_own ON public.user_enrollments AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY tokens_admin_read ON public.user_tokens AS PERMISSIVE FOR SELECT TO public
  USING (is_admin());

CREATE POLICY users_admin_all ON public.users AS PERMISSIVE FOR ALL TO public
  USING (is_admin());

CREATE POLICY users_read_own ON public.users AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = id));

CREATE POLICY users_update_own ON public.users AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = id))
  WITH CHECK (((auth.uid() = id) AND (role = 'user'::text)));

CREATE POLICY "Admins manage specific assessment files" ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING (((bucket_id = 'specific-assessments'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))))
  WITH CHECK (((bucket_id = 'specific-assessments'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))));

CREATE POLICY "Authenticated users read specific assessment templates" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'specific-assessments'::text) AND (name ~~ 'templates/%'::text)));

CREATE POLICY "Users read own generated specific assessments" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'specific-assessments'::text) AND (name ~~ (('submissions/'::text || (auth.uid())::text) || '/%'::text))));

CREATE POLICY certificates_admin_write ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'certificates'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))));

CREATE POLICY certificates_user_read ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'certificates'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))))));

CREATE POLICY course_images_admin_delete ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'course-images'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))));

CREATE POLICY course_images_admin_write ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'course-images'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))));

CREATE POLICY course_images_public_read ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'course-images'::text));

CREATE POLICY public_assets_admin_write ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'public-assets'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))));

CREATE POLICY public_assets_read ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'public-assets'::text));

-- Existing Data API table grants; RLS remains the row-level enforcement layer.
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_settings TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_settings TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_settings TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.checkout_sessions TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.checkout_sessions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.checkout_sessions TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.coupon_courses TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.coupon_courses TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.coupon_courses TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.coupon_usages TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.coupon_usages TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.coupon_usages TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.coupons TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.coupons TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.coupons TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.course_faqs TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.course_faqs TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.course_faqs TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.course_images TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.course_images TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.course_images TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.courses TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.courses TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.courses TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.external_assessment_links TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.external_assessment_links TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.external_assessment_links TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.lesson_progress TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.lesson_progress TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.lesson_progress TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.lessons TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.lessons TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.lessons TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.point_transactions TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.point_transactions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.point_transactions TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.specific_assessment_lessons TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.specific_assessment_lessons TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.specific_assessment_lessons TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.specific_assessment_submissions TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.specific_assessment_submissions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.specific_assessment_submissions TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_discounts TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_discounts TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_discounts TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_enrollments TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_enrollments TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_enrollments TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_tokens TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_tokens TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_tokens TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.users TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.users TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.users TO service_role;

-- Existing function grants. The next migration narrows unsafe grants.
GRANT EXECUTE ON FUNCTION public.adjust_user_points(p_user_id uuid, p_delta integer) TO anon;
GRANT EXECUTE ON FUNCTION public.adjust_user_points(p_user_id uuid, p_delta integer) TO postgres;
GRANT EXECUTE ON FUNCTION public.adjust_user_points(p_user_id uuid, p_delta integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_auth_user_update() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_auth_user_update() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_auth_user_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_auth_user_update() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_auth_user_update() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(p_coupon_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(p_coupon_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(p_coupon_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(p_coupon_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO postgres;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
