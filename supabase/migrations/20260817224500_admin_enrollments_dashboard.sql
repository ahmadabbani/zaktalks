-- Focused, paginated enrollment access reporting for the admin user workspace.
-- Payment operations and learning analytics remain in their dedicated views.

CREATE INDEX IF NOT EXISTS user_enrollments_created_at_id_idx
  ON public.user_enrollments (created_at DESC, id);

CREATE INDEX IF NOT EXISTS user_enrollments_course_status_created_idx
  ON public.user_enrollments (course_id, payment_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_enrollments_dashboard(
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_course_id uuid DEFAULT NULL,
  p_source text DEFAULT 'all',
  p_range text DEFAULT '90',
  p_sort text DEFAULT 'newest',
  p_page_size integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 25), 50));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_range_start timestamp with time zone;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING errcode = '42501';
  END IF;

  IF coalesce(p_status, 'all') NOT IN ('all', 'completed', 'pending', 'failed', 'refunded')
    OR coalesce(p_source, 'all') NOT IN ('all', 'guest', 'account', 'direct')
    OR coalesce(p_range, '90') NOT IN ('30', '90', '365', 'all')
    OR coalesce(p_sort, 'newest') NOT IN ('newest', 'oldest', 'name', 'course', 'status') THEN
    RAISE EXCEPTION 'Invalid enrollment filter' USING errcode = '22023';
  END IF;

  v_range_start := CASE coalesce(p_range, '90')
    WHEN '30' THEN now() - interval '30 days'
    WHEN '90' THEN now() - interval '90 days'
    WHEN '365' THEN now() - interval '365 days'
    ELSE NULL
  END;

  WITH enrollment_base AS (
    SELECT
      enrollment.id,
      enrollment.user_id,
      enrollment.course_id,
      enrollment.payment_status::text AS access_status,
      enrollment.created_at,
      enrollment.updated_at,
      profile.email,
      profile.first_name,
      profile.last_name,
      profile.email_verified,
      profile.password_set,
      profile.avatar_url,
      course.title AS course_title,
      course.slug AS course_slug,
      course.is_published AS course_published,
      CASE
        WHEN checkout.password_setup_email_sent_at IS NOT NULL THEN 'guest'
        WHEN checkout.id IS NOT NULL THEN 'account'
        ELSE 'direct'
      END AS access_source,
      coalesce(
        nullif(lower(trim(concat_ws(' ', profile.first_name, profile.last_name))), ''),
        lower(profile.email)
      ) AS sort_name
    FROM public.user_enrollments AS enrollment
    JOIN public.users AS profile ON profile.id = enrollment.user_id
    JOIN public.courses AS course ON course.id = enrollment.course_id
    LEFT JOIN LATERAL (
      SELECT session.id, session.password_setup_email_sent_at
      FROM public.checkout_sessions AS session
      WHERE session.enrollment_id = enrollment.id
      ORDER BY session.created_at DESC
      LIMIT 1
    ) AS checkout ON true
  ),
  filtered AS (
    SELECT base.*
    FROM enrollment_base AS base
    WHERE (v_range_start IS NULL OR base.created_at >= v_range_start)
      AND (
        nullif(trim(coalesce(p_search, '')), '') IS NULL
        OR base.email ILIKE '%' || trim(p_search) || '%'
        OR concat_ws(' ', base.first_name, base.last_name) ILIKE '%' || trim(p_search) || '%'
        OR base.course_title ILIKE '%' || trim(p_search) || '%'
      )
      AND (coalesce(p_status, 'all') = 'all' OR base.access_status = p_status)
      AND (p_course_id IS NULL OR base.course_id = p_course_id)
      AND (coalesce(p_source, 'all') = 'all' OR base.access_source = p_source)
  ),
  ordered AS (
    SELECT filtered.*
    FROM filtered
    ORDER BY
      CASE WHEN p_sort = 'newest' THEN created_at END DESC,
      CASE WHEN p_sort = 'oldest' THEN created_at END ASC,
      CASE WHEN p_sort = 'name' THEN sort_name END ASC,
      CASE WHEN p_sort = 'course' THEN lower(course_title) END ASC,
      CASE WHEN p_sort = 'status' THEN access_status END ASC,
      CASE WHEN p_sort IN ('newest', 'status') THEN id END DESC,
      CASE WHEN p_sort IN ('oldest', 'name', 'course') THEN id END ASC
    OFFSET v_offset
    LIMIT v_page_size
  ),
  trend AS (
    SELECT
      date_trunc(
        CASE
          WHEN p_range = '30' THEN 'day'
          WHEN p_range = '90' THEN 'week'
          WHEN p_range = 'all' THEN 'year'
          ELSE 'month'
        END,
        created_at
      ) AS bucket,
      count(*)::integer AS total,
      count(*) FILTER (WHERE access_status = 'completed')::integer AS active
    FROM filtered
    GROUP BY 1
    ORDER BY 1
  ),
  course_mix AS (
    SELECT
      course_id,
      course_title,
      count(*)::integer AS total,
      count(*) FILTER (WHERE access_status = 'completed')::integer AS active,
      count(DISTINCT user_id) FILTER (WHERE access_status = 'completed')::integer AS learners
    FROM filtered
    GROUP BY course_id, course_title
    ORDER BY active DESC, course_title ASC
  ),
  summary AS (
    SELECT
      count(*)::integer AS total,
      count(*) FILTER (WHERE access_status = 'completed')::integer AS active,
      count(DISTINCT user_id) FILTER (WHERE access_status = 'completed')::integer AS learners,
      count(*) FILTER (WHERE access_status = 'pending')::integer AS pending,
      count(*) FILTER (WHERE access_status = 'failed')::integer AS failed,
      count(*) FILTER (WHERE access_status = 'refunded')::integer AS revoked
    FROM filtered
  )
  SELECT jsonb_build_object(
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(row_data)) FROM ordered AS row_data), '[]'::jsonb),
    'total_count', (SELECT total FROM summary),
    'summary', jsonb_build_object(
      'total', (SELECT total FROM summary),
      'active', (SELECT active FROM summary),
      'learners', (SELECT learners FROM summary),
      'pending', (SELECT pending FROM summary),
      'failed', (SELECT failed FROM summary),
      'revoked', (SELECT revoked FROM summary)
    ),
    'trend', coalesce((
      SELECT jsonb_agg(jsonb_build_object('bucket', bucket, 'total', total, 'active', active) ORDER BY bucket)
      FROM trend
    ), '[]'::jsonb),
    'course_mix', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'course_id', course_id,
        'course_title', course_title,
        'total', total,
        'active', active,
        'learners', learners
      ) ORDER BY active DESC, course_title)
      FROM course_mix
    ), '[]'::jsonb),
    'courses', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', course.id, 'title', course.title) ORDER BY course.title)
      FROM public.courses AS course
      WHERE course.deleted_at IS NULL
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_enrollments_dashboard(text, text, uuid, text, text, text, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_enrollments_dashboard(text, text, uuid, text, text, text, integer, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_enrollments_dashboard(text, text, uuid, text, text, text, integer, integer) IS
  'Admin-only enrollment access reporting with filters, summaries, course distribution, trend data, and pagination.';
