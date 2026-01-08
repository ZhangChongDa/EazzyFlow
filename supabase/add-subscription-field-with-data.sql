-- ============================================
-- Add Subscription Field to Profiles Table
-- with Realistic Mock Data
-- ============================================
-- This script:
-- 1. Creates subscription_type enum
-- 2. Adds subscription column to profiles table
-- 3. Populates existing records with realistic subscription values
-- ============================================

-- Step 1: Create subscription type enum
CREATE TYPE IF NOT EXISTS subscription_type AS ENUM ('Prepaid', 'Postpaid');

-- Step 2: Add subscription column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription subscription_type DEFAULT 'Prepaid';

-- Step 3: Update existing records with realistic subscription values
-- Strategy: Based on ARPU (Average Revenue Per User) - more realistic for telecom
-- - High ARPU users (> 50) → 80% Postpaid, 20% Prepaid (enterprise/corporate users)
-- - Medium ARPU users (20-50) → 50% Postpaid, 50% Prepaid (mixed segment)
-- - Low ARPU users (< 20) → 30% Postpaid, 70% Prepaid (mass market)
UPDATE profiles
SET subscription = CASE
    -- High ARPU users (> 50): Mostly Postpaid (80% Postpaid)
    -- Using MD5 hash of ID for consistent pseudo-random distribution
    WHEN arpu_30d > 50 THEN 
        CASE 
            WHEN (md5(id) ~ '[02468ace]$') THEN 'Postpaid'::subscription_type 
            ELSE 'Prepaid'::subscription_type 
        END
    -- Medium ARPU users (20-50): Mixed (50% each)
    WHEN arpu_30d BETWEEN 20 AND 50 THEN 
        CASE 
            WHEN (md5(id) ~ '[13579bdf]$') THEN 'Postpaid'::subscription_type 
            ELSE 'Prepaid'::subscription_type 
        END
    -- Low ARPU users (< 20): Mostly Prepaid (70% Prepaid)
    ELSE 
        CASE 
            WHEN (md5(id) ~ '[02468ace]$') THEN 'Postpaid'::subscription_type 
            ELSE 'Prepaid'::subscription_type 
        END
END;

-- Step 4: Verify the data distribution
SELECT 
    subscription,
    tier,
    COUNT(*) as count,
    ROUND(AVG(arpu_30d), 2) as avg_arpu,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM profiles
GROUP BY subscription, tier
ORDER BY subscription, tier;

-- Step 5: Show overall distribution
SELECT 
    subscription,
    COUNT(*) as total_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
    ROUND(AVG(arpu_30d), 2) as avg_arpu,
    ROUND(AVG(churn_score), 3) as avg_churn_score
FROM profiles
GROUP BY subscription
ORDER BY subscription;

-- Step 6: Show sample data
SELECT 
    id,
    name,
    msisdn,
    tier,
    subscription,
    arpu_30d,
    status
FROM profiles
ORDER BY subscription, tier, arpu_30d DESC
LIMIT 20;

-- Expected Results:
-- - High ARPU users (> 50) should be mostly Postpaid
-- - Low ARPU users (< 20) should be mostly Prepaid
-- - Distribution should look realistic for a telecom operator

