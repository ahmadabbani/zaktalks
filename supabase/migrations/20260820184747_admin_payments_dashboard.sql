-- Admin payment reporting built from checkout_sessions, the durable order and
-- fulfillment source of truth. The browser can only reach these functions
-- through permission-checked server routes using the service role.

CREATE INDEX IF NOT EXISTS checkout_sessions_admin_created_idx
  ON public.checkout_sessions (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS checkout_sessions_admin_course_created_idx
  ON public.checkout_sessions (course_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS checkout_sessions_admin_payment_created_idx
  ON public.checkout_sessions (payment_state, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS checkout_sessions_enrollment_id_idx
  ON public.checkout_sessions (enrollment_id)
  WHERE enrollment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS checkout_sessions_coupon_id_idx
  ON public.checkout_sessions (coupon_id)
  WHERE coupon_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_payments_dashboard(
  p_course_id uuid DEFAULT NULL,
  p_range text DEFAULT '90',
  p_payment text DEFAULT 'all',
  p_fulfillment text DEFAULT 'all',
  p_discount text DEFAULT 'all',
  p_sort text DEFAULT 'newest',
  p_page_size integer DEFAULT 20,
  p_cursor_created_at timestamp with time zone DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_cursor_amount integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_page_size integer := greatest(5, least(coalesce(p_page_size, 20), 50));
  v_range_start timestamp with time zone;
  v_bucket text;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING errcode = '42501';
  END IF;

  IF coalesce(p_range, '90') NOT IN ('7', '30', '90', '365', 'all')
    OR coalesce(p_payment, 'all') NOT IN ('all', 'paid', 'processing', 'failed', 'expired', 'refunded', 'disputed')
    OR coalesce(p_fulfillment, 'all') NOT IN ('all', 'fulfilled', 'processing', 'attention', 'revoked', 'not_required')
    OR coalesce(p_discount, 'all') NOT IN ('all', 'discounted', 'full_price', 'coupon', 'points', 'first_purchase')
    OR coalesce(p_sort, 'newest') NOT IN ('newest', 'oldest', 'amount_high', 'amount_low', 'discount_high') THEN
    RAISE EXCEPTION 'Invalid payment dashboard filter' USING errcode = '22023';
  END IF;

  v_range_start := CASE coalesce(p_range, '90')
    WHEN '7' THEN now() - interval '7 days'
    WHEN '30' THEN now() - interval '30 days'
    WHEN '90' THEN now() - interval '90 days'
    WHEN '365' THEN now() - interval '365 days'
    ELSE NULL
  END;

  v_bucket := CASE coalesce(p_range, '90')
    WHEN '7' THEN 'day'
    WHEN '30' THEN 'day'
    WHEN '90' THEN 'week'
    ELSE 'month'
  END;

  WITH base AS MATERIALIZED (
    SELECT
      checkout.id AS checkout_id,
      checkout.stripe_session_id,
      checkout.stripe_payment_intent_id,
      checkout.email,
      checkout.first_name AS checkout_first_name,
      checkout.last_name AS checkout_last_name,
      checkout.user_id,
      checkout.enrollment_id,
      checkout.course_id,
      course.title AS course_title,
      course.slug AS course_slug,
      course.is_published AS course_published,
      profile.first_name AS profile_first_name,
      profile.last_name AS profile_last_name,
      profile.email_verified,
      profile.password_set,
      checkout.status::text AS checkout_status,
      checkout.payment_state,
      checkout.fulfillment_state,
      checkout.fulfillment_attempts,
      checkout.original_price_cents,
      checkout.expected_amount_cents,
      greatest(
        coalesce(checkout.original_price_cents, checkout.expected_amount_cents, 0)
          - coalesce(checkout.expected_amount_cents, checkout.original_price_cents, 0),
        0
      )::integer AS discount_cents,
      checkout.points_to_spend,
      checkout.first_purchase_discount_applied,
      checkout.coupon_id,
      coupon.code AS coupon_code,
      coupon.discount_type AS coupon_discount_type,
      coupon.discount_value AS coupon_discount_value,
      checkout.duplicate_payment,
      checkout.benefits_reversed_at,
      checkout.last_fulfillment_attempt_at,
      checkout.last_fulfillment_error,
      checkout.last_stripe_event_id,
      checkout.created_at,
      checkout.completed_at,
      checkout.updated_at,
      checkout.expires_at,
      checkout.expired_at,
      checkout.failed_at,
      checkout.refunded_at,
      checkout.disputed_at,
      checkout.password_setup_email_sent_at,
      checkout.password_setup_email_error,
      checkout.fulfillment_first_failed_at,
      checkout.fulfillment_customer_notice_sent_at,
      checkout.fulfillment_customer_notice_error,
      checkout.fulfillment_admin_notice_sent_at,
      checkout.fulfillment_admin_notice_error,
      checkout.fulfillment_customer_recovery_sent_at,
      checkout.fulfillment_customer_recovery_error,
      checkout.fulfillment_admin_recovery_sent_at,
      checkout.fulfillment_admin_recovery_error,
      enrollment.payment_status::text AS enrollment_payment_status,
      enrollment.amount_paid_cents AS enrollment_amount_paid_cents,
      enrollment.discount_applied_cents AS enrollment_discount_cents,
      enrollment.points_earned,
      CASE
        WHEN checkout.first_name IS NOT NULL
          OR checkout.last_name IS NOT NULL
          OR checkout.password_setup_email_sent_at IS NOT NULL
          OR checkout.password_setup_email_error IS NOT NULL
        THEN 'guest'
        ELSE 'account'
      END AS customer_source,
      coalesce(
        nullif(trim(concat_ws(' ', profile.first_name, profile.last_name)), ''),
        nullif(trim(concat_ws(' ', checkout.first_name, checkout.last_name)), ''),
        split_part(checkout.email, '@', 1),
        'Unknown customer'
      ) AS customer_name,
      array_remove(ARRAY[
        CASE WHEN checkout.first_purchase_discount_applied THEN 'first_purchase' END,
        CASE WHEN checkout.points_to_spend > 0 THEN 'points' END,
        CASE WHEN checkout.coupon_id IS NOT NULL THEN 'coupon' END,
        CASE WHEN greatest(
          coalesce(checkout.original_price_cents, checkout.expected_amount_cents, 0)
            - coalesce(checkout.expected_amount_cents, checkout.original_price_cents, 0),
          0
        ) > 0
          AND NOT checkout.first_purchase_discount_applied
          AND checkout.points_to_spend = 0
          AND checkout.coupon_id IS NULL
        THEN 'recorded_discount' END
      ], NULL)::text[] AS discount_methods,
      CASE
        WHEN checkout.payment_state IN ('paid', 'no_payment_required', 'partially_refunded') THEN 'paid'
        WHEN checkout.payment_state IN ('pending', 'processing') THEN 'processing'
        WHEN checkout.payment_state = 'failed' THEN 'failed'
        WHEN checkout.payment_state = 'expired' THEN 'expired'
        WHEN checkout.payment_state IN ('refunded', 'dispute_lost') THEN 'refunded'
        WHEN checkout.payment_state = 'disputed' THEN 'disputed'
        ELSE checkout.payment_state
      END AS payment_group,
      CASE
        WHEN checkout.fulfillment_state = 'fulfilled' THEN 'fulfilled'
        WHEN checkout.fulfillment_state IN ('pending', 'processing') THEN 'processing'
        WHEN checkout.fulfillment_state IN ('failed', 'requires_attention') THEN 'attention'
        WHEN checkout.fulfillment_state = 'revoked' THEN 'revoked'
        ELSE 'not_required'
      END AS fulfillment_group
    FROM public.checkout_sessions AS checkout
    JOIN public.courses AS course ON course.id = checkout.course_id
    LEFT JOIN public.users AS profile ON profile.id = checkout.user_id
    LEFT JOIN public.user_enrollments AS enrollment ON enrollment.id = checkout.enrollment_id
    LEFT JOIN public.coupons AS coupon ON coupon.id = checkout.coupon_id
    WHERE (v_range_start IS NULL OR checkout.created_at >= v_range_start)
      AND (p_course_id IS NULL OR checkout.course_id = p_course_id)
  ),
  filtered AS MATERIALIZED (
    SELECT *
    FROM base
    WHERE (coalesce(p_payment, 'all') = 'all' OR payment_group = p_payment)
      AND (coalesce(p_fulfillment, 'all') = 'all' OR fulfillment_group = p_fulfillment)
      AND (
        coalesce(p_discount, 'all') = 'all'
        OR (p_discount = 'discounted' AND discount_cents > 0)
        OR (p_discount = 'full_price' AND discount_cents = 0)
        OR (p_discount = 'coupon' AND coupon_id IS NOT NULL)
        OR (p_discount = 'points' AND points_to_spend > 0)
        OR (p_discount = 'first_purchase' AND first_purchase_discount_applied)
      )
  ),
  cursor_filtered AS (
    SELECT
      filtered.*,
      CASE coalesce(p_sort, 'newest')
        WHEN 'amount_high' THEN coalesce(expected_amount_cents, -1)
        WHEN 'amount_low' THEN coalesce(expected_amount_cents, 2147483647)
        WHEN 'discount_high' THEN discount_cents
        ELSE 0
      END AS sort_amount
    FROM filtered
    WHERE p_cursor_id IS NULL OR p_cursor_created_at IS NULL OR (
      (p_sort = 'newest' AND (created_at, checkout_id) < (p_cursor_created_at, p_cursor_id))
      OR (p_sort = 'oldest' AND (
        created_at > p_cursor_created_at
        OR (created_at = p_cursor_created_at AND checkout_id < p_cursor_id)
      ))
      OR (p_sort IN ('amount_high', 'discount_high') AND (
        CASE p_sort WHEN 'amount_high' THEN coalesce(expected_amount_cents, -1) ELSE discount_cents END < coalesce(p_cursor_amount, -1)
        OR (
          CASE p_sort WHEN 'amount_high' THEN coalesce(expected_amount_cents, -1) ELSE discount_cents END = coalesce(p_cursor_amount, -1)
          AND (created_at, checkout_id) < (p_cursor_created_at, p_cursor_id)
        )
      ))
      OR (p_sort = 'amount_low' AND (
        coalesce(expected_amount_cents, 2147483647) > coalesce(p_cursor_amount, 2147483647)
        OR (
          coalesce(expected_amount_cents, 2147483647) = coalesce(p_cursor_amount, 2147483647)
          AND (created_at, checkout_id) < (p_cursor_created_at, p_cursor_id)
        )
      ))
    )
  ),
  numbered AS (
    SELECT
      cursor_filtered.*,
      row_number() OVER (
        ORDER BY
          CASE WHEN p_sort = 'newest' THEN created_at END DESC,
          CASE WHEN p_sort = 'oldest' THEN created_at END ASC,
          CASE WHEN p_sort IN ('amount_high', 'discount_high') THEN sort_amount END DESC,
          CASE WHEN p_sort = 'amount_low' THEN sort_amount END ASC,
          created_at DESC,
          checkout_id DESC
      ) AS row_number
    FROM cursor_filtered
  ),
  page_rows AS MATERIALIZED (
    SELECT * FROM numbered WHERE row_number <= v_page_size + 1
  ),
  visible_rows AS (
    SELECT * FROM page_rows WHERE row_number <= v_page_size
  ),
  summary AS (
    SELECT
      count(*)::integer AS total_orders,
      count(*) FILTER (WHERE payment_group = 'paid')::integer AS paid_orders,
      count(*) FILTER (WHERE fulfillment_group = 'fulfilled')::integer AS fulfilled_orders,
      count(*) FILTER (WHERE fulfillment_group = 'attention')::integer AS attention_orders,
      count(*) FILTER (WHERE payment_group = 'processing' OR fulfillment_group = 'processing')::integer AS processing_orders,
      count(*) FILTER (WHERE payment_group IN ('failed', 'expired'))::integer AS closed_without_payment,
      count(*) FILTER (WHERE payment_group = 'refunded')::integer AS refunded_orders,
      count(*) FILTER (WHERE payment_group = 'disputed')::integer AS disputed_orders,
      count(*) FILTER (WHERE discount_cents > 0)::integer AS discounted_orders,
      count(*) FILTER (WHERE customer_source = 'guest')::integer AS guest_orders,
      count(*) FILTER (WHERE expected_amount_cents = 0 AND payment_group = 'paid')::integer AS no_cost_orders,
      coalesce(sum(expected_amount_cents) FILTER (
        WHERE payment_state IN ('paid', 'no_payment_required') AND fulfillment_state = 'fulfilled'
      ), 0)::bigint AS settled_sales_cents,
      coalesce(sum(discount_cents) FILTER (WHERE payment_group = 'paid'), 0)::bigint AS savings_cents,
      coalesce(round(avg(expected_amount_cents) FILTER (
        WHERE payment_state IN ('paid', 'no_payment_required') AND fulfillment_state = 'fulfilled'
      )), 0)::integer AS average_paid_cents
    FROM filtered
  ),
  status_mix AS (
    SELECT payment_group AS status, count(*)::integer AS records
    FROM filtered
    GROUP BY payment_group
  ),
  source_mix AS (
    SELECT customer_source AS source, count(*)::integer AS records
    FROM filtered
    GROUP BY customer_source
  ),
  discount_mix AS (
    SELECT method, count(*)::integer AS records
    FROM filtered
    CROSS JOIN LATERAL unnest(
      CASE WHEN cardinality(discount_methods) = 0 THEN ARRAY['full_price']::text[] ELSE discount_methods END
    ) AS method
    GROUP BY method
  ),
  trend AS (
    SELECT
      date_trunc(v_bucket, created_at) AS bucket,
      count(*)::integer AS orders,
      count(*) FILTER (WHERE payment_group = 'paid')::integer AS paid_orders,
      count(*) FILTER (WHERE fulfillment_group = 'attention')::integer AS attention_orders,
      coalesce(sum(expected_amount_cents) FILTER (
        WHERE payment_state IN ('paid', 'no_payment_required') AND fulfillment_state = 'fulfilled'
      ), 0)::bigint AS settled_sales_cents
    FROM filtered
    GROUP BY date_trunc(v_bucket, created_at)
  ),
  course_options AS (
    SELECT DISTINCT course.id AS course_id, course.title AS course_title
    FROM public.checkout_sessions AS checkout
    JOIN public.courses AS course ON course.id = checkout.course_id
  ),
  cursor_row AS (
    SELECT * FROM visible_rows WHERE row_number = v_page_size
  )
  SELECT jsonb_build_object(
    'summary', coalesce((SELECT to_jsonb(summary) FROM summary), '{}'::jsonb),
    'rows', coalesce((
      SELECT jsonb_agg(
        to_jsonb(visible_rows) - 'row_number' - 'sort_amount'
        ORDER BY row_number
      )
      FROM visible_rows
    ), '[]'::jsonb),
    'total_count', (SELECT count(*) FROM filtered),
    'has_more', (SELECT count(*) > v_page_size FROM page_rows),
    'next_cursor', CASE WHEN (SELECT count(*) > v_page_size FROM page_rows) THEN coalesce((
      SELECT jsonb_build_object(
        'created_at', created_at,
        'id', checkout_id,
        'amount', sort_amount
      )
      FROM cursor_row
    ), 'null'::jsonb) ELSE 'null'::jsonb END,
    'trend', coalesce((SELECT jsonb_agg(to_jsonb(trend) ORDER BY bucket) FROM trend), '[]'::jsonb),
    'status_mix', coalesce((SELECT jsonb_agg(to_jsonb(status_mix) ORDER BY records DESC, status) FROM status_mix), '[]'::jsonb),
    'source_mix', coalesce((SELECT jsonb_agg(to_jsonb(source_mix) ORDER BY records DESC, source) FROM source_mix), '[]'::jsonb),
    'discount_mix', coalesce((SELECT jsonb_agg(to_jsonb(discount_mix) ORDER BY records DESC, method) FROM discount_mix), '[]'::jsonb),
    'courses', coalesce((SELECT jsonb_agg(to_jsonb(course_options) ORDER BY course_title) FROM course_options), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_payment_detail(p_checkout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING errcode = '42501';
  END IF;

  IF p_checkout_id IS NULL THEN
    RAISE EXCEPTION 'Checkout ID is required' USING errcode = '22023';
  END IF;

  WITH order_record AS MATERIALIZED (
    SELECT
      checkout.id AS checkout_id,
      checkout.stripe_session_id,
      checkout.stripe_payment_intent_id,
      checkout.email,
      checkout.first_name AS checkout_first_name,
      checkout.last_name AS checkout_last_name,
      checkout.user_id,
      checkout.enrollment_id,
      checkout.course_id,
      course.title AS course_title,
      course.slug AS course_slug,
      course.is_published AS course_published,
      profile.first_name AS profile_first_name,
      profile.last_name AS profile_last_name,
      profile.email_verified,
      profile.password_set,
      profile.created_at AS account_created_at,
      checkout.status::text AS checkout_status,
      checkout.payment_state,
      checkout.fulfillment_state,
      checkout.fulfillment_attempts,
      checkout.original_price_cents,
      checkout.expected_amount_cents,
      greatest(
        coalesce(checkout.original_price_cents, checkout.expected_amount_cents, 0)
          - coalesce(checkout.expected_amount_cents, checkout.original_price_cents, 0),
        0
      )::integer AS discount_cents,
      checkout.points_to_spend,
      checkout.first_purchase_discount_applied,
      checkout.coupon_id,
      coupon.code AS coupon_code,
      coupon.discount_type AS coupon_discount_type,
      coupon.discount_value AS coupon_discount_value,
      checkout.duplicate_payment,
      checkout.benefits_reversed_at,
      checkout.last_fulfillment_attempt_at,
      checkout.last_fulfillment_error,
      checkout.last_stripe_event_id,
      checkout.created_at,
      checkout.completed_at,
      checkout.updated_at,
      checkout.expires_at,
      checkout.expired_at,
      checkout.failed_at,
      checkout.refunded_at,
      checkout.disputed_at,
      checkout.password_setup_email_sent_at,
      checkout.password_setup_email_id,
      checkout.password_setup_email_error,
      checkout.fulfillment_first_failed_at,
      checkout.fulfillment_customer_notice_sent_at,
      checkout.fulfillment_customer_notice_error,
      checkout.fulfillment_admin_notice_sent_at,
      checkout.fulfillment_admin_notice_error,
      checkout.fulfillment_customer_recovery_sent_at,
      checkout.fulfillment_customer_recovery_error,
      checkout.fulfillment_admin_recovery_sent_at,
      checkout.fulfillment_admin_recovery_error,
      enrollment.payment_status::text AS enrollment_payment_status,
      enrollment.amount_paid_cents AS enrollment_amount_paid_cents,
      enrollment.original_price_cents AS enrollment_original_price_cents,
      enrollment.discount_applied_cents AS enrollment_discount_cents,
      enrollment.points_earned,
      enrollment.created_at AS access_created_at,
      enrollment.updated_at AS access_updated_at,
      CASE
        WHEN checkout.first_name IS NOT NULL
          OR checkout.last_name IS NOT NULL
          OR checkout.password_setup_email_sent_at IS NOT NULL
          OR checkout.password_setup_email_error IS NOT NULL
        THEN 'guest'
        ELSE 'account'
      END AS customer_source,
      coalesce(
        nullif(trim(concat_ws(' ', profile.first_name, profile.last_name)), ''),
        nullif(trim(concat_ws(' ', checkout.first_name, checkout.last_name)), ''),
        split_part(checkout.email, '@', 1),
        'Unknown customer'
      ) AS customer_name,
      array_remove(ARRAY[
        CASE WHEN checkout.first_purchase_discount_applied THEN 'first_purchase' END,
        CASE WHEN checkout.points_to_spend > 0 THEN 'points' END,
        CASE WHEN checkout.coupon_id IS NOT NULL THEN 'coupon' END,
        CASE WHEN greatest(
          coalesce(checkout.original_price_cents, checkout.expected_amount_cents, 0)
            - coalesce(checkout.expected_amount_cents, checkout.original_price_cents, 0),
          0
        ) > 0
          AND NOT checkout.first_purchase_discount_applied
          AND checkout.points_to_spend = 0
          AND checkout.coupon_id IS NULL
        THEN 'recorded_discount' END
      ], NULL)::text[] AS discount_methods
    FROM public.checkout_sessions AS checkout
    JOIN public.courses AS course ON course.id = checkout.course_id
    LEFT JOIN public.users AS profile ON profile.id = checkout.user_id
    LEFT JOIN public.user_enrollments AS enrollment ON enrollment.id = checkout.enrollment_id
    LEFT JOIN public.coupons AS coupon ON coupon.id = checkout.coupon_id
    WHERE checkout.id = p_checkout_id
  ),
  webhook_rows AS (
    SELECT event.id, event.event_type, event.processing_status, event.attempts,
      event.last_error, event.livemode, event.received_at, event.processed_at,
      event.updated_at
    FROM public.stripe_webhook_events AS event
    CROSS JOIN order_record AS payment
    WHERE event.id = payment.last_stripe_event_id
      OR event.stripe_object_id IN (
        payment.stripe_session_id,
        payment.stripe_payment_intent_id
      )
    ORDER BY event.received_at DESC
  ),
  point_rows AS (
    SELECT transaction.id, transaction.amount, transaction.type,
      transaction.description, transaction.created_at
    FROM public.point_transactions AS transaction
    CROSS JOIN order_record AS payment
    WHERE transaction.user_id = payment.user_id
      AND transaction.reference_id = payment.course_id
      AND transaction.created_at >= payment.created_at - interval '1 day'
      AND transaction.created_at <= coalesce(payment.completed_at, payment.updated_at, payment.created_at) + interval '1 day'
    ORDER BY transaction.created_at
  )
  SELECT jsonb_build_object(
    'order', coalesce((SELECT to_jsonb(order_record) FROM order_record), 'null'::jsonb),
    'webhook_events', coalesce((SELECT jsonb_agg(to_jsonb(webhook_rows) ORDER BY received_at DESC) FROM webhook_rows), '[]'::jsonb),
    'point_transactions', coalesce((SELECT jsonb_agg(to_jsonb(point_rows) ORDER BY created_at) FROM point_rows), '[]'::jsonb)
  ) INTO v_result;

  IF v_result->'order' = 'null'::jsonb THEN
    RAISE EXCEPTION 'Payment order not found' USING errcode = 'P0002';
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_payments_dashboard(
  uuid, text, text, text, text, text, integer, timestamp with time zone, uuid, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_payments_dashboard(
  uuid, text, text, text, text, text, integer, timestamp with time zone, uuid, integer
) TO service_role;

REVOKE ALL ON FUNCTION public.admin_payment_detail(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_payment_detail(uuid)
  TO service_role;

COMMENT ON FUNCTION public.admin_payments_dashboard(
  uuid, text, text, text, text, text, integer, timestamp with time zone, uuid, integer
) IS 'Service-role-only, permission-gated payment order dashboard with keyset pagination, payment and fulfillment health, discounts, sources, and course filters.';

COMMENT ON FUNCTION public.admin_payment_detail(uuid)
  IS 'Service-role-only payment order drill-down with fulfillment, access, discount, notification, point ledger, and related Stripe webhook state.';
