-- ============================================
-- RLS Policy: User-Specific Data Access
-- ============================================
-- This script creates RLS policies that restrict users
-- to only see their own data (using auth.uid())
-- 
-- ⚠️ WARNING: This is different from the current setup
-- Current setup allows all authenticated users to see all data
-- This script restricts users to only their own data
-- ============================================

-- Step 1: Enable RLS (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies
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

-- ============================================
-- PROFILES: Users can only see their own profile
-- ============================================
-- Note: profiles.id should match auth.users.id
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE
    TO authenticated
    USING (id = auth.uid());

-- ============================================
-- TELECOM_USAGE: Users can only see their own usage
-- ============================================
CREATE POLICY "telecom_usage_select_own" ON telecom_usage
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "telecom_usage_insert_own" ON telecom_usage
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "telecom_usage_update_own" ON telecom_usage
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "telecom_usage_delete_own" ON telecom_usage
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- CAMPAIGNS: Users can only see their own campaigns
-- ============================================
-- Note: campaigns table might need a user_id or created_by field
-- If not, you might want to keep this as shared data
CREATE POLICY "campaigns_select_own" ON campaigns
    FOR SELECT
    TO authenticated
    USING (true);  -- Keep shared for now, can add user_id filter later

CREATE POLICY "campaigns_insert_own" ON campaigns
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "campaigns_update_own" ON campaigns
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "campaigns_delete_own" ON campaigns
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- CAMPAIGN_LOGS: Users can only see logs for their campaigns
-- ============================================
CREATE POLICY "campaign_logs_select_own" ON campaign_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "campaign_logs_insert_own" ON campaign_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaign_logs_update_own" ON campaign_logs
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaign_logs_delete_own" ON campaign_logs
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- PRODUCTS & COUPONS: Shared data (all authenticated users)
-- ============================================
-- These are typically shared catalogs, not user-specific
CREATE POLICY "products_select_all" ON products
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "products_insert_all" ON products
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "products_update_all" ON products
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "products_delete_all" ON products
    FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "coupons_select_all" ON coupons
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "coupons_insert_all" ON coupons
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "coupons_update_all" ON coupons
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "coupons_delete_all" ON coupons
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- Verification
-- ============================================
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

-- Expected:
-- profiles: 4 policies with "id = auth.uid()"
-- telecom_usage: 4 policies with "user_id = auth.uid()"
-- campaign_logs: 4 policies with "user_id = auth.uid()"
-- products: 4 policies with "true" (shared)
-- coupons: 4 policies with "true" (shared)
-- campaigns: 4 policies with "true" (shared for now)


