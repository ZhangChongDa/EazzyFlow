-- ============================================
-- Fix RLS Permissions for Development
-- ============================================
-- This script checks and fixes RLS permissions
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Step 1: Check current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename;

-- Step 2: Disable RLS on all tables (for development)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename;

-- Expected result: All tables should show rls_enabled = false

-- ============================================
-- Alternative: If you want to keep RLS enabled,
-- ensure policies allow public access
-- ============================================

-- Drop existing policies (if needed)
-- DROP POLICY IF EXISTS "Allow public read on profiles" ON profiles;
-- DROP POLICY IF EXISTS "Allow public insert on profiles" ON profiles;
-- DROP POLICY IF EXISTS "Allow public update on profiles" ON profiles;
-- (Repeat for all tables...)

-- Recreate policies (already in schema.sql, but can re-run if needed)
-- See schema.sql for the full policy definitions


