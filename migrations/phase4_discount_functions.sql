-- ============================================
-- PHASE 4: Discount Utility Functions
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create function to increment coupon usage count
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE coupons 
  SET usage_count = usage_count + 1 
  WHERE id = p_coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_coupon_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_coupon_usage(UUID) TO service_role;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'increment_coupon_usage function created' as status;
