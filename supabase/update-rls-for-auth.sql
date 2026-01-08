-- ============================================
-- Update RLS Policies for Authenticated Users
-- ============================================
-- This script updates RLS policies to allow authenticated users
-- This is better than disabling RLS completely
-- ============================================

-- Step 1: Enable RLS (if not already enabled)
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
    END LOOP;
END $$;

-- Step 3: Create policies for authenticated users
-- Profiles
CREATE POLICY "Allow authenticated users full access to profiles" ON profiles
    FOR ALL USING (auth.role() = 'authenticated');

-- Products
CREATE POLICY "Allow authenticated users full access to products" ON products
    FOR ALL USING (auth.role() = 'authenticated');

-- Coupons
CREATE POLICY "Allow authenticated users full access to coupons" ON coupons
    FOR ALL USING (auth.role() = 'authenticated');

-- Telecom Usage
CREATE POLICY "Allow authenticated users full access to telecom_usage" ON telecom_usage
    FOR ALL USING (auth.role() = 'authenticated');

-- Campaigns
CREATE POLICY "Allow authenticated users full access to campaigns" ON campaigns
    FOR ALL USING (auth.role() = 'authenticated');

-- Campaign Logs
CREATE POLICY "Allow authenticated users full access to campaign_logs" ON campaign_logs
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 4: Also allow public read for demo purposes (optional - comment out if not needed)
-- Uncomment these if you want to allow unauthenticated read access

-- CREATE POLICY "Allow public read on profiles" ON profiles
--     FOR SELECT USING (true);
-- CREATE POLICY "Allow public read on products" ON products
--     FOR SELECT USING (true);
-- CREATE POLICY "Allow public read on coupons" ON coupons
--     FOR SELECT USING (true);
-- CREATE POLICY "Allow public read on campaigns" ON campaigns
--     FOR SELECT USING (true);

-- Step 5: Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename, policyname;


