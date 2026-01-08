-- ============================================
-- Check RLS Status on All Tables
-- ============================================
-- Run this to check if RLS is enabled or disabled
-- ============================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename;

-- Expected result:
-- If rls_enabled = true, RLS is ENABLED (might block inserts)
-- If rls_enabled = false, RLS is DISABLED (should allow inserts)


