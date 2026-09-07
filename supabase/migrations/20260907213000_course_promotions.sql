BEGIN;

CREATE TABLE public.course_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  discount_amount_cents integer NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  applies_to_all_courses boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_promotions_name_check CHECK (
    char_length(btrim(name)) BETWEEN 1 AND 120
  ),
  CONSTRAINT course_promotions_discount_check CHECK (discount_amount_cents > 0),
  CONSTRAINT course_promotions_window_check CHECK (ends_at > starts_at)
);

CREATE TABLE public.course_promotion_courses (
  promotion_id uuid NOT NULL REFERENCES public.course_promotions(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (promotion_id, course_id)
);

CREATE INDEX course_promotions_active_window_idx
  ON public.course_promotions (is_active, starts_at, ends_at);

CREATE INDEX course_promotion_courses_course_idx
  ON public.course_promotion_courses (course_id, promotion_id);

ALTER TABLE public.course_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_promotion_courses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.course_promotions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.course_promotion_courses FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.course_promotions TO service_role;
GRANT ALL ON TABLE public.course_promotion_courses TO service_role;

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES public.course_promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promotion_name text,
  ADD COLUMN IF NOT EXISTS promotion_discount_cents integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checkout_sessions_promotion_discount_check'
      AND conrelid = 'public.checkout_sessions'::regclass
  ) THEN
    ALTER TABLE public.checkout_sessions
      ADD CONSTRAINT checkout_sessions_promotion_discount_check
      CHECK (
        promotion_discount_cents >= 0
        AND (
          original_price_cents IS NULL
          OR promotion_discount_cents <= original_price_cents
        )
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS checkout_sessions_promotion_idx
  ON public.checkout_sessions (promotion_id)
  WHERE promotion_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_active_course_promotion(p_course_id uuid)
RETURNS TABLE (
  promotion_id uuid,
  promotion_name text,
  discount_amount_cents integer,
  starts_at timestamptz,
  ends_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    promotion.id,
    promotion.name,
    LEAST(promotion.discount_amount_cents, course.price_cents)::integer,
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
    LEAST(promotion.discount_amount_cents, course.price_cents) DESC,
    promotion.starts_at DESC,
    promotion.created_at DESC,
    promotion.id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.attach_checkout_promotion(
  p_checkout_id uuid,
  p_promotion_id uuid,
  p_discount_cents integer
)
RETURNS boolean
LANGUAGE plpgsql
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
     OR active_promotion.discount_amount_cents <> p_discount_cents THEN
    RAISE EXCEPTION 'The selected course promotion is no longer available';
  END IF;

  UPDATE public.checkout_sessions
  SET
    promotion_id = active_promotion.promotion_id,
    promotion_name = active_promotion.promotion_name,
    promotion_discount_cents = active_promotion.discount_amount_cents,
    updated_at = now()
  WHERE id = p_checkout_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_course_promotion(
  p_promotion_id uuid,
  p_name text,
  p_discount_amount_cents integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_is_active boolean,
  p_applies_to_all_courses boolean,
  p_course_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  saved_id uuid;
  requested_course_id uuid;
BEGIN
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Promotion name must be between 1 and 120 characters';
  END IF;

  IF p_discount_amount_cents IS NULL OR p_discount_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Promotion discount must be greater than zero';
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
      discount_amount_cents,
      starts_at,
      ends_at,
      is_active,
      applies_to_all_courses
    )
    VALUES (
      btrim(p_name),
      p_discount_amount_cents,
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
      discount_amount_cents = p_discount_amount_cents,
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
REVOKE ALL ON FUNCTION public.attach_checkout_promotion(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_course_promotion(uuid, text, integer, timestamptz, timestamptz, boolean, boolean, uuid[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_active_course_promotion(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_checkout_promotion(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_course_promotion(uuid, text, integer, timestamptz, timestamptz, boolean, boolean, uuid[]) TO service_role;

COMMENT ON TABLE public.course_promotions IS
  'Scheduled fixed-amount course promotions managed by authorized staff.';

COMMENT ON COLUMN public.checkout_sessions.promotion_discount_cents IS
  'Immutable course-promotion discount snapshot captured before Stripe Checkout is created.';

COMMENT ON FUNCTION public.get_active_course_promotion(uuid) IS
  'Returns the highest-value active scheduled promotion currently applicable to a course.';

COMMENT ON FUNCTION public.attach_checkout_promotion(uuid, uuid, integer) IS
  'Atomically validates and snapshots the active promotion on a pending checkout before Stripe session creation.';

COMMIT;
