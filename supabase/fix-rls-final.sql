-- ============================================
-- Final RLS Fix - Ensure Policies Work
-- ============================================
-- This script recreates all policies with proper syntax
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Step 1: Ensure RLS is enabled
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

-- Step 3: Create policies using BOTH checks (more reliable)
-- Using auth.uid() IS NOT NULL AND auth.role() = 'authenticated'

-- Profiles
CREATE POLICY "authenticated_users_select_profiles" ON profiles
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_insert_profiles" ON profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_update_profiles" ON profiles
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_profiles" ON profiles
    FOR DELETE 
    TO authenticated
    USING (true);

-- Products
CREATE POLICY "authenticated_users_select_products" ON products
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_insert_products" ON products
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_update_products" ON products
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_products" ON products
    FOR DELETE 
    TO authenticated
    USING (true);

-- Coupons
CREATE POLICY "authenticated_users_select_coupons" ON coupons
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_insert_coupons" ON coupons
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_update_coupons" ON coupons
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_coupons" ON coupons
    FOR DELETE 
    TO authenticated
    USING (true);

-- Telecom Usage
CREATE POLICY "authenticated_users_select_telecom_usage" ON telecom_usage
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_insert_telecom_usage" ON telecom_usage
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_update_telecom_usage" ON telecom_usage
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_telecom_usage" ON telecom_usage
    FOR DELETE 
    TO authenticated
    USING (true);

-- Campaigns
CREATE POLICY "authenticated_users_select_campaigns" ON campaigns
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_insert_campaigns" ON campaigns
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_update_campaigns" ON campaigns
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_campaigns" ON campaigns
    FOR DELETE 
    TO authenticated
    USING (true);

-- Campaign Logs
CREATE POLICY "authenticated_users_select_campaign_logs" ON campaign_logs
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_insert_campaign_logs" ON campaign_logs
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_update_campaign_logs" ON campaign_logs
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_campaign_logs" ON campaign_logs
    FOR DELETE 
    TO authenticated
    USING (true);

-- Step 4: Verify policies
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename, cmd;

-- Expected: Each table should have 4 policies, all with roles = '{authenticated}'


