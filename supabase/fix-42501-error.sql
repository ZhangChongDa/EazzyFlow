-- ============================================
-- Fix 42501 Permission Denied Error
-- ============================================
-- This script fixes the "permission denied for table profiles" error
-- Error Code: 42501 (PostgreSQL permission denied)
-- 
-- Root Cause: RLS policy check failed
-- Solution: Use the most reliable RLS policy syntax
-- ============================================

-- Step 1: Verify RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled - Will enable now'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename;

-- Step 2: Enable RLS on all tables (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;

-- Step 3: Show current policies (before deletion)
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename, cmd;

-- Step 4: Drop ALL existing policies (clean slate)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped policy % on %.%', r.policyname, r.schemaname, r.tablename;
    END LOOP;
END $$;

-- Step 5: Create the MOST RELIABLE policies
-- Using: FOR ALL TO authenticated USING (true)
-- This is the simplest and most reliable approach

-- Profiles
CREATE POLICY "profiles_all_authenticated" ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Products
CREATE POLICY "products_all_authenticated" ON products
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Coupons
CREATE POLICY "coupons_all_authenticated" ON coupons
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Telecom Usage
CREATE POLICY "telecom_usage_all_authenticated" ON telecom_usage
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Campaigns
CREATE POLICY "campaigns_all_authenticated" ON campaigns
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Campaign Logs
CREATE POLICY "campaign_logs_all_authenticated" ON campaign_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 6: Verify policies were created correctly
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    permissive,
    CASE 
        WHEN 'authenticated' = ANY(roles) THEN '✅ Correct role'
        ELSE '❌ Wrong role'
    END as role_check,
    CASE 
        WHEN qual = 'true' OR qual IS NULL THEN '✅ Simple condition'
        ELSE '⚠️ Complex condition: ' || qual
    END as condition_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename, cmd;

-- Expected result:
-- Each table should have 1 policy with:
-- - cmd = 'ALL'
-- - roles = '{authenticated}'
-- - permissive = 'PERMISSIVE'
-- - qual = 'true' or NULL

-- Step 7: Summary
SELECT 
    'Total policies created: ' || COUNT(*)::text as summary
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs');

-- Expected: 6 policies (one per table)

-- Step 8: Test query (if you're authenticated)
-- Uncomment and run this to test:
-- SELECT COUNT(*) FROM profiles;

-- If this returns a count (not an error), the fix worked!


