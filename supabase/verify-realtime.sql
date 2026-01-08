-- ============================================
-- Verify Supabase Realtime Configuration
-- ============================================
-- Run this script to check if Realtime is properly configured
-- ============================================

-- 1. Check if Realtime extension is enabled
SELECT 
    'Realtime Extension' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_realtime') 
        THEN '✅ Enabled' 
        ELSE '❌ Not Enabled' 
    END as status
UNION ALL

-- 2. Check if campaign_logs is in publication
SELECT 
    'campaign_logs in Publication' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'campaign_logs'
        )
        THEN '✅ In Publication' 
        ELSE '❌ Not in Publication' 
    END as status
UNION ALL

-- 3. Check RLS status
SELECT 
    'RLS Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'campaign_logs' 
            AND rowsecurity = true
        )
        THEN '⚠️ RLS Enabled (check policies)' 
        ELSE '✅ RLS Disabled' 
    END as status
UNION ALL

-- 4. Check SELECT permissions for anon role
SELECT 
    'anon SELECT Permission' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE tablename = 'campaign_logs' 
            AND cmd = 'SELECT' 
            AND roles && ARRAY['anon'::name, 'public'::name]
        )
        THEN '✅ Has SELECT Policy' 
        ELSE '⚠️ No SELECT Policy (may block Realtime)' 
    END as status;

-- 5. List all tables in Realtime publication
SELECT 
    'Tables in Realtime Publication' as info_type,
    tablename as table_name
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 6. List RLS policies for campaign_logs
SELECT 
    'RLS Policies for campaign_logs' as info_type,
    policyname as policy_name,
    cmd as command,
    roles::text as roles,
    qual::text as using_expression
FROM pg_policies
WHERE tablename = 'campaign_logs'
ORDER BY policyname;

