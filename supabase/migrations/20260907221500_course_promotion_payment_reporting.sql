BEGIN;

CREATE OR REPLACE FUNCTION public.admin_course_promotion_payment_stats(
  p_course_id uuid DEFAULT NULL,
  p_range text DEFAULT '90',
  p_payment text DEFAULT 'all',
  p_fulfillment text DEFAULT 'all',
  p_discount text DEFAULT 'all'
)
RETURNS TABLE (
  promotion_records integer,
  promotion_only_records integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH payment_rows AS (
    SELECT
      checkout.promotion_discount_cents,
      checkout.first_purchase_discount_applied,
      checkout.points_to_spend,
      checkout.coupon_id,
      greatest(
        coalesce(checkout.original_price_cents, checkout.expected_amount_cents, 0)
          - coalesce(checkout.expected_amount_cents, checkout.original_price_cents, 0),
        0
      )::integer AS discount_cents,
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
    WHERE (p_course_id IS NULL OR checkout.course_id = p_course_id)
      AND (
        coalesce(p_range, '90') = 'all'
        OR checkout.created_at >= now() - (
          CASE coalesce(p_range, '90')
            WHEN '7' THEN interval '7 days'
            WHEN '30' THEN interval '30 days'
            WHEN '365' THEN interval '365 days'
            ELSE interval '90 days'
          END
        )
      )
  ),
  filtered AS (
    SELECT *
    FROM payment_rows
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
  )
  SELECT
    count(*) FILTER (WHERE promotion_discount_cents > 0)::integer,
    count(*) FILTER (
      WHERE promotion_discount_cents > 0
        AND NOT first_purchase_discount_applied
        AND points_to_spend = 0
        AND coupon_id IS NULL
    )::integer
  FROM filtered;
$$;

REVOKE ALL ON FUNCTION public.admin_course_promotion_payment_stats(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_course_promotion_payment_stats(uuid, text, text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.admin_course_promotion_payment_stats(uuid, text, text, text, text) IS
  'Supplies promotion counts for the existing admin payment report without changing its stable core function.';

COMMIT;
