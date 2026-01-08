-- ============================================
-- Create RLS Policies for ALL Tables
-- ============================================
-- This script creates policies for all 6 tables:
-- profiles, products, coupons, telecom_usage, campaigns, campaign_logs
-- ============================================

-- Step 1: Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (clean slate)
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

-- Step 3: Create SELECT policies for all tables (READ access)
-- Profiles
CREATE POLICY "Allow authenticated users to read profiles" ON profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Products
CREATE POLICY "Allow authenticated users to read products" ON products
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Coupons
CREATE POLICY "Allow authenticated users to read coupons" ON coupons
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Telecom Usage
CREATE POLICY "Allow authenticated users to read telecom_usage" ON telecom_usage
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Campaigns
CREATE POLICY "Allow authenticated users to read campaigns" ON campaigns
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Campaign Logs
CREATE POLICY "Allow authenticated users to read campaign_logs" ON campaign_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Step 4: Create INSERT policies for all tables (CREATE access)
CREATE POLICY "Allow authenticated users to insert profiles" ON profiles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert products" ON products
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert coupons" ON coupons
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert telecom_usage" ON telecom_usage
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert campaigns" ON campaigns
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert campaign_logs" ON campaign_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Step 5: Create UPDATE policies for all tables (UPDATE access)
CREATE POLICY "Allow authenticated users to update profiles" ON profiles
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update products" ON products
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update coupons" ON coupons
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update telecom_usage" ON telecom_usage
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update campaigns" ON campaigns
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update campaign_logs" ON campaign_logs
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Step 6: Create DELETE policies for all tables (DELETE access)
CREATE POLICY "Allow authenticated users to delete profiles" ON profiles
    FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete products" ON products
    FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete coupons" ON coupons
    FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete telecom_usage" ON telecom_usage
    FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete campaigns" ON campaigns
    FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete campaign_logs" ON campaign_logs
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Step 7: Verify all policies were created
SELECT 
    tablename,
    policyname,
    cmd,
    COUNT(*) OVER (PARTITION BY tablename) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename, cmd;

-- Expected result: Each table should have 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- Total: 6 tables × 4 policies = 24 policies


