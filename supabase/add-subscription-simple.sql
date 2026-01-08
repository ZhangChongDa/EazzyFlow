-- ============================================
-- Simple SQL: Add Subscription Field with Mock Data
-- ============================================
-- Quick script to add subscription field and populate with realistic values
-- ============================================

-- 1. Create enum type
CREATE TYPE IF NOT EXISTS subscription_type AS ENUM ('Prepaid', 'Postpaid');

-- 2. Add column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription subscription_type DEFAULT 'Prepaid';

-- 3. Populate with realistic mock data
-- High ARPU users (> 50) → 80% Postpaid, 20% Prepaid
-- Medium ARPU users (20-50) → 50% Postpaid, 50% Prepaid  
-- Low ARPU users (< 20) → 30% Postpaid, 70% Prepaid

UPDATE profiles
SET subscription = CASE
    WHEN arpu_30d > 50 THEN 
        CASE WHEN (id::text ~ '[02468]$') THEN 'Postpaid'::subscription_type 
             ELSE 'Prepaid'::subscription_type 
        END
    WHEN arpu_30d BETWEEN 20 AND 50 THEN 
        CASE WHEN (md5(id) ~ '[13579]$') THEN 'Postpaid'::subscription_type 
             ELSE 'Prepaid'::subscription_type 
        END
    ELSE 
        CASE WHEN (md5(id) ~ '[02468]$') THEN 'Postpaid'::subscription_type 
             ELSE 'Prepaid'::subscription_type 
        END
END;

-- 4. Verify
SELECT 
    subscription,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM profiles
GROUP BY subscription;


