BEGIN;

-- The first promotion release stored a fixed USD amount. Convert the
-- definition to a percentage without changing the exact cents snapshot kept
-- on checkout records. Any pre-existing definition is disabled for review so
-- a fixed amount can never be reinterpreted as a live percentage silently.
ALTER TABLE public.course_promotions
  DROP CONSTRAINT IF EXISTS course_promotions_discount_check;

ALTER TABLE public.course_promotions
  RENAME COLUMN discount_amount_cents TO discount_percent;

ALTER TABLE public.course_promotions
  ALTER COLUMN discount_percent TYPE numeric(5,2)
  USING round(discount_percent::numeric / 100, 2);

UPDATE public.course_promotions
SET is_active = false,
    updated_at = now();

ALTER TABLE public.course_promotions
  ADD CONSTRAINT course_promotions_discount_check
  CHECK (discount_percent > 0 AND discount_percent <= 100);

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS promotion_discount_percent numeric(5,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checkout_sessions_promotion_percent_check'
      AND conrelid = 'public.checkout_sessions'::regclass
  ) THEN
    ALTER TABLE public.checkout_sessions
      ADD CONSTRAINT checkout_sessions_promotion_percent_check
      CHECK (
        promotion_discount_percent IS NULL
        OR (promotion_discount_percent > 0 AND promotion_discount_percent <= 100)
      );
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.attach_checkout_promotion(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.save_course_promotion(uuid, text, integer, timestamptz, timestamptz, boolean, boolean, uuid[]);
DROP FUNCTION IF EXISTS public.get_active_course_promotion(uuid);

CREATE FUNCTION public.get_active_course_promotion(p_course_id uuid)
RETURNS TABLE (
  promotion_id uuid,
  promotion_name text,
  discount_percent numeric,
  discount_amount_cents integer,
  starts_at timestamptz,
  ends_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    promotion.id,
    promotion.name,
    promotion.discount_percent,
    LEAST(
      floor(course.price_cents * promotion.discount_percent / 100)::integer,
      course.price_cents
    ),
    promotion.starts_at,
    promotion.ends_at
  FROM public.courses AS course
  JOIN public.course_promotions AS promotion
    ON promotion.is_active = true
   AND promotion.starts_at <= now()
   AND promotion.ends_at > now()
   AND (
     promotion.applies_to_all_courses = true
     OR EXISTS (
       SELECT 1
       FROM public.course_promotion_courses AS assignment
       WHERE assignment.promotion_id = promotion.id
         AND assignment.course_id = course.id
     )
   )
  WHERE course.id = p_course_id
    AND course.deleted_at IS NULL
    AND course.price_cents > 0
  ORDER BY
    LEAST(
      floor(course.price_cents * promotion.discount_percent / 100)::integer,
      course.price_cents
    ) DESC,
    promotion.discount_percent DESC,
    promotion.starts_at DESC,
    promotion.created_at DESC,
    promotion.id
  LIMIT 1;
$$;

CREATE FUNCTION public.attach_checkout_promotion(
  p_checkout_id uuid,
  p_promotion_id uuid,
  p_discount_percent numeric,
  p_discount_cents integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  checkout_row public.checkout_sessions%ROWTYPE;
  active_promotion record;
BEGIN
  SELECT *
  INTO checkout_row
  FROM public.checkout_sessions
  WHERE id = p_checkout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout was not found';
  END IF;

  IF checkout_row.status <> 'pending' OR checkout_row.stripe_session_id IS NOT NULL THEN
    RAISE EXCEPTION 'Promotion can only be attached before Stripe Checkout is created';
  END IF;

  SELECT *
  INTO active_promotion
  FROM public.get_active_course_promotion(checkout_row.course_id);

  IF active_promotion.promotion_id IS NULL
     OR active_promotion.promotion_id <> p_promotion_id
     OR active_promotion.discount_percent <> p_discount_percent
     OR active_promotion.discount_amount_cents <> p_discount_cents THEN
    RAISE EXCEPTION 'The selected course promotion is no longer available';
  END IF;

  UPDATE public.checkout_sessions
  SET
    promotion_id = active_promotion.promotion_id,
    promotion_name = active_promotion.promotion_name,
    promotion_discount_percent = active_promotion.discount_percent,
    promotion_discount_cents = active_promotion.discount_amount_cents,
    updated_at = now()
  WHERE id = p_checkout_id;

  RETURN true;
END;
$$;

CREATE FUNCTION public.save_course_promotion(
  p_promotion_id uuid,
  p_name text,
  p_discount_percent numeric,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_is_active boolean,
  p_applies_to_all_courses boolean,
  p_course_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  saved_id uuid;
  requested_course_id uuid;
BEGIN
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Promotion name must be between 1 and 120 characters';
  END IF;

  IF p_discount_percent IS NULL OR p_discount_percent <= 0 OR p_discount_percent > 100 THEN
    RAISE EXCEPTION 'Promotion percentage must be greater than zero and no more than 100';
  END IF;

  IF scale(p_discount_percent) > 2 THEN
    RAISE EXCEPTION 'Promotion percentage can have no more than two decimal places';
  END IF;

  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'Promotion end date must be after its start date';
  END IF;

  IF NOT coalesce(p_applies_to_all_courses, false)
     AND cardinality(coalesce(p_course_ids, ARRAY[]::uuid[])) = 0 THEN
    RAISE EXCEPTION 'Choose at least one course';
  END IF;

  FOREACH requested_course_id IN ARRAY coalesce(p_course_ids, ARRAY[]::uuid[])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.courses
      WHERE id = requested_course_id
        AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'A selected course is unavailable';
    END IF;
  END LOOP;

  IF p_promotion_id IS NULL THEN
    INSERT INTO public.course_promotions (
      name,
      discount_percent,
      starts_at,
      ends_at,
      is_active,
      applies_to_all_courses
    )
    VALUES (
      btrim(p_name),
      p_discount_percent,
      p_starts_at,
      p_ends_at,
      coalesce(p_is_active, false),
      coalesce(p_applies_to_all_courses, false)
    )
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.course_promotions
    SET
      name = btrim(p_name),
      discount_percent = p_discount_percent,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      is_active = coalesce(p_is_active, false),
      applies_to_all_courses = coalesce(p_applies_to_all_courses, false),
      updated_at = now()
    WHERE id = p_promotion_id
    RETURNING id INTO saved_id;

    IF saved_id IS NULL THEN
      RAISE EXCEPTION 'Promotion was not found';
    END IF;
  END IF;

  DELETE FROM public.course_promotion_courses
  WHERE promotion_id = saved_id;

  IF NOT coalesce(p_applies_to_all_courses, false) THEN
    INSERT INTO public.course_promotion_courses (promotion_id, course_id)
    SELECT saved_id, selected_course_id
    FROM unnest(coalesce(p_course_ids, ARRAY[]::uuid[])) AS selected_course_id
    GROUP BY selected_course_id;
  END IF;

  RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_course_promotion(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_checkout_promotion(uuid, uuid, numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_course_promotion(uuid, text, numeric, timestamptz, timestamptz, boolean, boolean, uuid[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_active_course_promotion(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_checkout_promotion(uuid, uuid, numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_course_promotion(uuid, text, numeric, timestamptz, timestamptz, boolean, boolean, uuid[]) TO service_role;

COMMENT ON TABLE public.course_promotions IS
  'Scheduled percentage-based course promotions managed by authorized staff.';

COMMENT ON COLUMN public.course_promotions.discount_percent IS
  'Percentage removed from the course base price before other checkout discounts.';

COMMENT ON COLUMN public.checkout_sessions.promotion_discount_percent IS
  'Promotion percentage snapshot captured before Stripe Checkout is created.';

COMMENT ON COLUMN public.checkout_sessions.promotion_discount_cents IS
  'Exact course-promotion savings in cents captured before Stripe Checkout is created.';

COMMIT;
