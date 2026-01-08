-- ============================================
-- Test RLS Policies with Current User
-- ============================================
-- This script helps diagnose why policies aren't working
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Step 1: Check current authenticated user
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    auth.email() as current_email;

-- Step 2: Check all policies
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename, cmd;

-- Step 3: Test if policies work (this will only work if you're authenticated)
-- Uncomment and run these one by one to test:

-- SELECT COUNT(*) FROM profiles;
-- SELECT COUNT(*) FROM products;
-- SELECT COUNT(*) FROM coupons;

-- Step 4: Check RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename;


