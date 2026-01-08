-- ============================================
-- Verify RLS Policies - Complete Check
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
-- This query will show all policies with complete information
-- ============================================

-- Complete policy information
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename, cmd;

-- Summary by table
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd::text) as commands,
    STRING_AGG(DISTINCT roles::text, ', ') as roles_list
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
GROUP BY tablename
ORDER BY tablename;

-- Check RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename;


