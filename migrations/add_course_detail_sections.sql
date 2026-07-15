-- Run this in the Supabase SQL Editor before creating or updating a course.
-- Existing text values are preserved as a single item in their new lists.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS subheadline TEXT,
  ADD COLUMN IF NOT EXISTS the_problem TEXT,
  ADD COLUMN IF NOT EXISTS the_shift TEXT,
  ADD COLUMN IF NOT EXISTS who_this_is_not_for TEXT;

DO $$
DECLARE
  field_name TEXT;
  field_type TEXT;
BEGIN
  FOREACH field_name IN ARRAY ARRAY['target_audience', 'why_attend', 'who_this_is_not_for']
  LOOP
    SELECT columns.data_type
    INTO field_type
    FROM information_schema.columns
    WHERE columns.table_schema = 'public'
      AND columns.table_name = 'courses'
      AND columns.column_name = field_name;

    IF field_type IS DISTINCT FROM 'ARRAY' THEN
      EXECUTE format(
        $sql$
          ALTER TABLE public.courses
          ALTER COLUMN %1$I TYPE TEXT[]
          USING CASE
            WHEN %1$I IS NULL OR btrim(%1$I) = '' THEN ARRAY[]::TEXT[]
            ELSE ARRAY[%1$I]
          END
        $sql$,
        field_name
      );
    END IF;
  END LOOP;
END $$;
