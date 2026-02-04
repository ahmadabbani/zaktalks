-- ============================================
-- CLEANUP: Standardize coupons table columns
-- Run this AFTER Phase 3 is tested
-- ============================================

-- 1. Drop the old check constraint
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupon_has_discount;

-- 2. Make discount_type and discount_value required (NOT NULL)
-- First update any NULLs
UPDATE coupons 
SET discount_type = CASE 
    WHEN discount_percent IS NOT NULL THEN 'percentage'
    WHEN discount_amount_cents IS NOT NULL THEN 'fixed'
    ELSE 'percentage'
END
WHERE discount_type IS NULL;

UPDATE coupons 
SET discount_value = COALESCE(discount_percent, discount_amount_cents, 0)
WHERE discount_value IS NULL;

-- 3. Add NOT NULL constraints to new columns
ALTER TABLE coupons ALTER COLUMN discount_type SET NOT NULL;
ALTER TABLE coupons ALTER COLUMN discount_value SET NOT NULL;

-- 4. Drop the old duplicate columns
ALTER TABLE coupons DROP COLUMN IF EXISTS discount_percent;
ALTER TABLE coupons DROP COLUMN IF EXISTS discount_amount_cents;
ALTER TABLE coupons DROP COLUMN IF EXISTS max_uses;
ALTER TABLE coupons DROP COLUMN IF EXISTS uses_count;
ALTER TABLE coupons DROP COLUMN IF EXISTS valid_from;
ALTER TABLE coupons DROP COLUMN IF EXISTS valid_until;
ALTER TABLE coupons DROP COLUMN IF EXISTS course_id; -- Using coupon_courses table now

-- 5. Add new check constraint for discount_type
ALTER TABLE coupons ADD CONSTRAINT coupons_discount_type_check 
CHECK (discount_type IN ('percentage', 'fixed'));

-- 6. Add check constraint for percentage max value
ALTER TABLE coupons ADD CONSTRAINT coupons_percentage_max_check 
CHECK (discount_type != 'percentage' OR discount_value <= 100);

-- ============================================
-- VERIFICATION: Check final column structure
-- ============================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'coupons'
ORDER BY ordinal_position;
