-- ============================================
-- Diagnose RLS Issue - Check Current State
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
-- This will help identify why policies aren't working
-- ============================================

-- Step 1: Check RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename;

-- Step 2: Check existing policies
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    permissive,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename, cmd;

-- Step 3: Count policies per table
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd::text) as commands
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each table should have 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- Step 4: Check if policies use correct role
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN 'authenticated' = ANY(roles) THEN '✅ Correct'
        ELSE '❌ Wrong role'
    END as role_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons')
ORDER BY tablename, cmd;

-- Step 5: Test current user context (if authenticated)
-- This will show null if not authenticated, or user ID if authenticated
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    auth.email() as current_email;


