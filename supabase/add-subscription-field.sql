-- ============================================
-- Add Subscription Field to Profiles Table
-- ============================================
-- This script adds the subscription field to the profiles table
-- to track user payment type: Prepaid (预付费) or Postpaid (后付费)
-- ============================================

-- Step 1: Create subscription type enum
CREATE TYPE IF NOT EXISTS subscription_type AS ENUM ('Prepaid', 'Postpaid');

-- Step 2: Add subscription column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription subscription_type DEFAULT 'Prepaid';

-- Step 3: Add comment to document the field
COMMENT ON COLUMN profiles.subscription IS 'User payment type: Prepaid (预付费客户) or Postpaid (后付费客户)';

-- Step 4: Verify the column was added
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'subscription';

-- Expected result:
-- column_name: subscription
-- data_type: USER-DEFINED
-- udt_name: subscription_type
-- column_default: 'Prepaid'::subscription_type
-- is_nullable: YES


