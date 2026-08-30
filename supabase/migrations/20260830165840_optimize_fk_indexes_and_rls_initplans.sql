-- Add covering indexes for every public foreign key currently missing one.
-- These do not change data or application behavior; they support joins and
-- parent-row updates/deletes as the related tables grow.
CREATE INDEX IF NOT EXISTS assessment_attempts_module_id_idx
  ON public.assessment_attempts (module_id);

CREATE INDEX IF NOT EXISTS coupon_courses_course_id_idx
  ON public.coupon_courses (course_id);

CREATE INDEX IF NOT EXISTS coupon_usages_course_id_idx
  ON public.coupon_usages (course_id);

CREATE INDEX IF NOT EXISTS coupon_usages_user_id_idx
  ON public.coupon_usages (user_id);

CREATE INDEX IF NOT EXISTS creator_permissions_updated_by_idx
  ON public.creator_permissions (updated_by);

CREATE INDEX IF NOT EXISTS external_assessment_links_created_by_idx
  ON public.external_assessment_links (created_by);

CREATE INDEX IF NOT EXISTS external_assessment_links_revoked_by_idx
  ON public.external_assessment_links (revoked_by);

CREATE INDEX IF NOT EXISTS lessons_module_course_idx
  ON public.lessons (module_id, course_id);

CREATE INDEX IF NOT EXISTS specific_assessment_submissions_enrollment_id_idx
  ON public.specific_assessment_submissions (enrollment_id);

CREATE INDEX IF NOT EXISTS staff_access_audit_log_actor_user_id_idx
  ON public.staff_access_audit_log (actor_user_id);

CREATE INDEX IF NOT EXISTS user_discounts_course_id_idx
  ON public.user_discounts (course_id);

CREATE INDEX IF NOT EXISTS user_discounts_enrollment_id_idx
  ON public.user_discounts (enrollment_id);

CREATE INDEX IF NOT EXISTS user_discounts_granted_by_idx
  ON public.user_discounts (granted_by);

CREATE INDEX IF NOT EXISTS user_enrollments_coupon_id_idx
  ON public.user_enrollments (coupon_id);

-- Cache request-scoped auth helper results once per statement. Policy names,
-- commands, roles, ownership conditions, and admin conditions remain unchanged.
ALTER POLICY users_read_own
  ON public.users
  USING ((SELECT auth.uid()) = id);

ALTER POLICY users_update_own
  ON public.users
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND role = 'user'::text
  );

ALTER POLICY enrollments_read_own
  ON public.user_enrollments
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY discounts_read_own
  ON public.user_discounts
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can read own point_transactions"
  ON public.point_transactions
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can read own coupon_usages"
  ON public.coupon_usages
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Allow admin update on admin_settings"
  ON public.admin_settings
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'::text
    )
  );

ALTER POLICY "Admins manage external assessment links"
  ON public.external_assessment_links
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'::text
    )
  );

ALTER POLICY "Admins manage specific assessment lessons"
  ON public.specific_assessment_lessons
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'::text
    )
  );

ALTER POLICY "Enrolled users read specific assessment lessons"
  ON public.specific_assessment_lessons
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons AS lesson
      JOIN public.user_enrollments AS enrollment
        ON enrollment.course_id = lesson.course_id
      WHERE lesson.id = specific_assessment_lessons.lesson_id
        AND enrollment.user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Admins manage specific assessment submissions"
  ON public.specific_assessment_submissions
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'::text
    )
  );

ALTER POLICY "Users insert own enrolled specific assessment submissions"
  ON public.specific_assessment_submissions
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.lessons AS lesson
      JOIN public.user_enrollments AS enrollment
        ON enrollment.course_id = lesson.course_id
      WHERE lesson.id = specific_assessment_submissions.lesson_id
        AND enrollment.user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Users read own specific assessment submissions"
  ON public.specific_assessment_submissions
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users update own enrolled specific assessment submissions"
  ON public.specific_assessment_submissions
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.lessons AS lesson
      JOIN public.user_enrollments AS enrollment
        ON enrollment.course_id = lesson.course_id
      WHERE lesson.id = specific_assessment_submissions.lesson_id
        AND enrollment.user_id = (SELECT auth.uid())
    )
  );
