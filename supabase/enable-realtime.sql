-- ============================================
-- Enable Supabase Realtime for campaign_logs
-- ============================================
-- This script enables Realtime subscriptions for the campaign_logs table
-- Run this in Supabase Dashboard → SQL Editor
-- 
-- IMPORTANT: For Supabase hosted projects, do NOT create supabase_realtime extension.
-- The publication is managed by Supabase platform.
-- ============================================

-- 1. Check if supabase_realtime publication exists
DO $$
BEGIN
    -- If publication doesn't exist, create it
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
        RAISE NOTICE 'Created supabase_realtime publication';
    ELSE
        RAISE NOTICE 'supabase_realtime publication already exists';
    END IF;
END $$;

-- 2. Add campaign_logs table to the publication (if not already added)
DO $$
BEGIN
    -- Check if campaign_logs is already in the publication
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'campaign_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE campaign_logs;
        RAISE NOTICE 'Added campaign_logs to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'campaign_logs is already in supabase_realtime publication';
    END IF;
END $$;

-- 3. Verify the publication
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ============================================
-- Notes:
-- ============================================
-- 1. Realtime requires RLS policies that allow SELECT
-- 2. The anon role needs SELECT permission on campaign_logs
-- 3. After running this script, restart your Supabase project or wait a few minutes
-- 4. Check subscription status in browser console for 'SUBSCRIBED' status
-- ============================================

