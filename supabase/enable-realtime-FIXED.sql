-- ============================================
-- Enable Supabase Realtime for campaign_logs (FIXED VERSION)
-- ============================================
-- This script enables Realtime subscriptions for the campaign_logs table
-- Run this in Supabase Dashboard → SQL Editor
-- 
-- ⚠️ IMPORTANT: For Supabase hosted projects, do NOT create supabase_realtime extension.
-- The publication is managed by Supabase platform.
-- ============================================

-- Step 1: Ensure supabase_realtime publication exists
-- (Create it only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
        RAISE NOTICE '✅ Created supabase_realtime publication';
    ELSE
        RAISE NOTICE 'ℹ️ supabase_realtime publication already exists';
    END IF;
END $$;

-- Step 2: Add campaign_logs table to the publication
-- (Add it only if it's not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'campaign_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE campaign_logs;
        RAISE NOTICE '✅ Added campaign_logs to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'ℹ️ campaign_logs is already in supabase_realtime publication';
    END IF;
END $$;

-- Step 3: Verify the configuration
SELECT 
    'Verification' as step,
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ============================================
-- Expected Result:
-- ============================================
-- You should see campaign_logs in the result table
-- If you see it, the configuration is successful!
-- ============================================

