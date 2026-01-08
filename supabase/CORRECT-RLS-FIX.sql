-- ============================================
-- CORRECT RLS Fix - Verified Syntax
-- ============================================
-- This script uses CORRECT PostgreSQL RLS syntax
-- Based on official PostgreSQL documentation
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Step 1: Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
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
    END LOOP;
END $$;

-- Step 3: Create policies using CORRECT syntax
-- Using separate policies for each operation (most reliable)

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE POLICY "products_select_policy" ON products
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "products_insert_policy" ON products
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "products_update_policy" ON products
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "products_delete_policy" ON products
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- COUPONS TABLE
-- ============================================
CREATE POLICY "coupons_select_policy" ON coupons
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "coupons_insert_policy" ON coupons
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "coupons_update_policy" ON coupons
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "coupons_delete_policy" ON coupons
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- TELECOM_USAGE TABLE
-- ============================================
CREATE POLICY "telecom_usage_select_policy" ON telecom_usage
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "telecom_usage_insert_policy" ON telecom_usage
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "telecom_usage_update_policy" ON telecom_usage
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "telecom_usage_delete_policy" ON telecom_usage
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- CAMPAIGNS TABLE
-- ============================================
CREATE POLICY "campaigns_select_policy" ON campaigns
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "campaigns_insert_policy" ON campaigns
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "campaigns_update_policy" ON campaigns
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "campaigns_delete_policy" ON campaigns
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- CAMPAIGN_LOGS TABLE
-- ============================================
CREATE POLICY "campaign_logs_select_policy" ON campaign_logs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "campaign_logs_insert_policy" ON campaign_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "campaign_logs_update_policy" ON campaign_logs
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "campaign_logs_delete_policy" ON campaign_logs
    FOR DELETE
    TO authenticated
    USING (true);

-- Step 4: Verify policies were created correctly
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(cmd::text, ', ' ORDER BY cmd::text) as commands
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each table should have 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- Total: 6 tables × 4 policies = 24 policies

-- Step 5: Verify RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename;

-- Expected: All should show rls_enabled = true


