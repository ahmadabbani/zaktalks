-- ============================================
-- PHASE 1: DISCOUNT SYSTEM DATABASE MIGRATIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. CREATE admin_settings TABLE
-- Stores admin-configurable discount values
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial values
INSERT INTO admin_settings (key, value, description) VALUES
  ('first_purchase_discount_percent', '10', 'Percentage discount for first-time buyers'),
  ('points_discount_percent', '10', 'Discount percentage when 1000 points are used')
ON CONFLICT (key) DO NOTHING;

-- 2. CREATE point_transactions TABLE
-- Logs all points activity for auditing
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  type VARCHAR(30) NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user 
ON point_transactions(user_id, created_at DESC);

-- 3. CREATE coupon_courses TABLE (Many-to-Many)
-- Links coupons to specific courses
CREATE TABLE IF NOT EXISTS coupon_courses (
  coupon_id UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (coupon_id, course_id)
);

-- 4. CREATE coupon_usages TABLE
-- Tracks coupon usage per user per course
CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id, course_id)
);

-- 5. MODIFY coupons TABLE
-- Add required columns if they don't exist
DO $$
BEGIN
  -- Check if code column exists, if not add all columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coupons' 
    AND column_name = 'code'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN code VARCHAR(50) UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coupons' 
    AND column_name = 'discount_type'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN discount_type VARCHAR(20);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coupons' 
    AND column_name = 'discount_value'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN discount_value INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coupons' 
    AND column_name = 'max_uses_total'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN max_uses_total INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coupons' 
    AND column_name = 'max_uses_per_user'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN max_uses_per_user INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coupons' 
    AND column_name = 'usage_count'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN usage_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coupons' 
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coupons' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coupons' 
    AND column_name = 'applies_to_all_courses'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN applies_to_all_courses BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coupons' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 6. Add foreign key constraints after coupons table is updated
DO $$
BEGIN
  -- Add FK from coupon_courses to coupons
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'coupon_courses_coupon_id_fkey'
  ) THEN
    ALTER TABLE coupon_courses 
    ADD CONSTRAINT coupon_courses_coupon_id_fkey 
    FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;
  END IF;

  -- Add FK from coupon_usages to coupons
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'coupon_usages_coupon_id_fkey'
  ) THEN
    ALTER TABLE coupon_usages 
    ADD CONSTRAINT coupon_usages_coupon_id_fkey 
    FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. Enable RLS on new tables
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for admin_settings (public read, admin write)
CREATE POLICY "Allow public read on admin_settings" 
ON admin_settings FOR SELECT 
USING (true);

CREATE POLICY "Allow admin update on admin_settings" 
ON admin_settings FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 9. RLS Policies for point_transactions (user can read own, service role writes)
CREATE POLICY "Users can read own point_transactions" 
ON point_transactions FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Service role can insert point_transactions" 
ON point_transactions FOR INSERT 
WITH CHECK (true);

-- 10. RLS Policies for coupon_courses (public read)
CREATE POLICY "Allow public read on coupon_courses" 
ON coupon_courses FOR SELECT 
USING (true);

-- 11. RLS Policies for coupon_usages (user can read own)
CREATE POLICY "Users can read own coupon_usages" 
ON coupon_usages FOR SELECT 
USING (user_id = auth.uid());

-- ============================================
-- VERIFICATION: Check tables were created
-- ============================================
SELECT 'admin_settings' as table_name, COUNT(*) as row_count FROM admin_settings
UNION ALL
SELECT 'point_transactions', COUNT(*) FROM point_transactions
UNION ALL
SELECT 'coupon_courses', COUNT(*) FROM coupon_courses
UNION ALL
SELECT 'coupon_usages', COUNT(*) FROM coupon_usages;
