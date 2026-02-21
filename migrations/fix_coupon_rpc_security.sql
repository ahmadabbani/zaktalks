-- ============================================
-- SECURITY FIX: Revoke increment_coupon_usage from authenticated users
-- 
-- Problem: Any logged-in user can call this RPC from the browser console
-- to inflate coupon usage counts and block others from using coupons.
-- 
-- Fix: Only service_role (backend) should be able to call this function.
-- The function is already called via supabaseAdmin (service role) in
-- discount-utils.js, so removing the authenticated grant has no impact
-- on the existing flow.
--
-- Run this in Supabase SQL Editor
-- ============================================

REVOKE EXECUTE ON FUNCTION increment_coupon_usage(UUID) FROM authenticated;

-- Verify: should only show service_role grant
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'increment_coupon_usage';
