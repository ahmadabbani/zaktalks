-- ============================================
-- FIX: Atomic points adjustment
-- 
-- Problem: spendPoints() and earnPoints() do read-then-write in JS:
--   1. SELECT points FROM users → 5000
--   2. newPoints = 5000 - 2000 = 3000
--   3. UPDATE users SET points = 3000
-- If two run at the same time, step 1 reads the same value and one overwrites the other.
--
-- Fix: A single UPDATE that does the math in Postgres:
--   UPDATE users SET points = GREATEST(0, points + delta) WHERE id = user_id
-- This is atomic — Postgres handles concurrency.
--
-- Run this in Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION adjust_user_points(p_user_id UUID, p_delta INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE users
  SET points = GREATEST(0, points + p_delta),
      updated_at = now()
  WHERE id = p_user_id
  RETURNING points INTO new_balance;

  RETURN COALESCE(new_balance, 0);
END;
$$;

-- Only allow service_role to call this (backend only)
REVOKE EXECUTE ON FUNCTION adjust_user_points(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION adjust_user_points(UUID, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION adjust_user_points(UUID, INTEGER) TO service_role;
