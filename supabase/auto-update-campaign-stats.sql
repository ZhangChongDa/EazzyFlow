-- ============================================
-- Auto-Update Campaign Stats Trigger
-- ============================================
-- This trigger automatically updates campaign stats when campaign_logs are inserted
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Function to auto-update campaign stats
CREATE OR REPLACE FUNCTION update_campaign_stats_on_log_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_sent_count INTEGER;
    v_clicked_count INTEGER;
    v_converted_count INTEGER;
    v_reach INTEGER;
    v_conversion_rate DOUBLE PRECISION;
BEGIN
    -- Count all logs for this campaign
    SELECT 
        COUNT(*) FILTER (WHERE action_type = 'send'),
        COUNT(*) FILTER (WHERE action_type = 'click'),
        COUNT(*) FILTER (WHERE action_type = 'purchase')
    INTO v_sent_count, v_clicked_count, v_converted_count
    FROM campaign_logs
    WHERE campaign_id = NEW.campaign_id;

    -- Set reach = sent count
    v_reach := v_sent_count;
    
    -- Calculate conversion rate
    IF v_sent_count > 0 THEN
        v_conversion_rate := v_converted_count::DOUBLE PRECISION / v_sent_count::DOUBLE PRECISION;
    ELSE
        v_conversion_rate := 0;
    END IF;

    -- Update campaign table
    UPDATE campaigns
    SET 
        reach = v_reach,
        conversion_rate = v_conversion_rate,
        stats = jsonb_build_object(
            'sent', v_sent_count,
            'clicked', v_clicked_count,
            'converted', v_converted_count
        ),
        updated_at = NOW()
    WHERE id = NEW.campaign_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_campaign_stats ON campaign_logs;

-- Create trigger
CREATE TRIGGER trigger_update_campaign_stats
AFTER INSERT ON campaign_logs
FOR EACH ROW
EXECUTE FUNCTION update_campaign_stats_on_log_insert();

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the trigger is created:
-- SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_campaign_stats';
-- ============================================

