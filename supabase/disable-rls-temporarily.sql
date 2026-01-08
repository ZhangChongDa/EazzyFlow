-- ============================================
-- TEMPORARY: Disable RLS for Seeding
-- ============================================
-- ⚠️  WARNING: This script disables RLS on all tables
-- Use this ONLY for development/testing purposes
-- Re-enable RLS after seeding is complete
-- ============================================

-- Disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs DISABLE ROW LEVEL SECURITY;

-- ============================================
-- To re-enable RLS after seeding, run:
-- ============================================
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE telecom_usage ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;


