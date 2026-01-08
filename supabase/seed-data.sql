-- ============================================
-- Eazzy Flow - Database Seeding Script (SQL)
-- ============================================
-- This script directly inserts data using SQL
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Clear existing data (optional - comment out if you want to keep existing data)
-- TRUNCATE TABLE campaign_logs CASCADE;
-- TRUNCATE TABLE telecom_usage CASCADE;
-- TRUNCATE TABLE campaigns CASCADE;
-- TRUNCATE TABLE profiles CASCADE;
-- TRUNCATE TABLE coupons CASCADE;
-- TRUNCATE TABLE products CASCADE;

-- ============================================
-- SEED PRODUCTS
-- ============================================

INSERT INTO products (technical_id, marketing_name, type, price, description, category, status, synced_at)
VALUES
    ('P_DATA_1GB_NIGHT', '1GB Night Owl Pack', 'Data', 500, '1GB Data for use between 11PM - 7AM.', 'Night Packs', 'active', '2023-10-25'),
    ('P_VOICE_100MIN', '100 Mins Any-Net', 'Voice', 1000, '100 Minutes to any local network.', 'Voice Bundles', 'active', '2023-10-24'),
    ('P_BUNDLE_SUPER', 'Super Sunday Special', 'Bundle', 1500, '2GB Data + 50 Mins + 100 SMS', 'Weekend Specials', 'active', '2023-10-20'),
    ('P_VAS_GAMING', 'MLBB Game Booster', 'VAS', 300, 'Unlimited gaming data for Mobile Legends (24h).', 'Gaming', 'active', '2023-10-15')
ON CONFLICT (technical_id) DO UPDATE SET
    marketing_name = EXCLUDED.marketing_name,
    type = EXCLUDED.type,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    status = EXCLUDED.status,
    synced_at = EXCLUDED.synced_at;

-- ============================================
-- SEED COUPONS
-- ============================================

INSERT INTO coupons (name, type, value, total_stock, claimed_count, validity_date, status, description)
VALUES
    ('Welcome Back 50% Off', 'Discount', '50%', 10000, 450, '2023-12-31 23:59:59+00', 'active', '50% Discount on next Data Pack purchase.'),
    ('Free KFC Burger', 'Voucher', '1 Unit', 500, 480, '2023-11-15 23:59:59+00', 'active', 'Redeemable at any KFC Yangon branch.'),
    ('Loyalty Bonus Points', 'Points', '500 Pts', 100000, 12500, '2024-01-01 23:59:59+00', 'active', 'Instant 500 points credit to user wallet.'),
    ('Myanmar Plaza Flash Sale', 'Discount', '30%', 5000, 120, '2024-06-30 23:59:59+00', 'active', '30% off at participating stores in Myanmar Plaza.'),
    ('City Mart Grocery Voucher', 'Voucher', '5,000 Ks', 2000, 500, '2024-05-15 23:59:59+00', 'active', '5,000 MMK discount on groceries.'),
    ('JCGV Cinema Ticket BOGO', 'Voucher', '1 Ticket', 1000, 850, '2024-04-01 23:59:59+00', 'active', 'Buy 1 Get 1 Free for weekend movies.'),
    ('Grab Ride 20% Off', 'Discount', '20%', 10000, 3000, '2024-12-31 23:59:59+00', 'active', 'Discount on next 5 Grab rides.')
ON CONFLICT (name) DO UPDATE SET
    type = EXCLUDED.type,
    value = EXCLUDED.value,
    total_stock = EXCLUDED.total_stock,
    claimed_count = EXCLUDED.claimed_count,
    validity_date = EXCLUDED.validity_date,
    status = EXCLUDED.status,
    description = EXCLUDED.description;

-- ============================================
-- SEED CAMPAIGNS
-- ============================================

INSERT INTO campaigns (id, name, status, channel, flow_definition, stats, reach, conversion_rate)
VALUES
    (
        'cmp1',
        'Yangon Rainy Season Data',
        'active',
        'Omni',
        '{"nodes":[{"id":"1","type":"trigger","data":{"label":"Trigger: Balance < $1"},"position":{"x":50,"y":150}},{"id":"2","type":"condition","data":{"label":"Check: ARPU > $10"},"position":{"x":300,"y":150}},{"id":"3","type":"action","data":{"label":"Action: Send SMS Offer"},"position":{"x":550,"y":50}},{"id":"4","type":"action","data":{"label":"Action: Send Push Notif"},"position":{"x":550,"y":250}}],"edges":[{"id":"e1-2","source":"1","target":"2"},{"id":"e2-3","source":"2","target":"3"},{"id":"e2-4","source":"2","target":"4"}]}'::jsonb,
        '{"sent":150000,"clicked":1890,"converted":6300}'::jsonb,
        150000,
        4.2
    ),
    (
        'cmp2',
        'Win Back Inactive 30d',
        'active',
        'SMS',
        '{"nodes":[{"id":"1","type":"trigger","data":{"label":"Trigger: Balance < $1"},"position":{"x":50,"y":150}},{"id":"2","type":"condition","data":{"label":"Check: ARPU > $10"},"position":{"x":300,"y":150}},{"id":"3","type":"action","data":{"label":"Action: Send SMS Offer"},"position":{"x":550,"y":50}},{"id":"4","type":"action","data":{"label":"Action: Send Push Notif"},"position":{"x":550,"y":250}}],"edges":[{"id":"e1-2","source":"1","target":"2"},{"id":"e2-3","source":"2","target":"3"},{"id":"e2-4","source":"2","target":"4"}]}'::jsonb,
        '{"sent":45000,"clicked":1485,"converted":495}'::jsonb,
        45000,
        1.1
    ),
    (
        'cmp3',
        'VVIP Birthday Surprise',
        'paused',
        'Push',
        '{"nodes":[{"id":"1","type":"trigger","data":{"label":"Trigger: Balance < $1"},"position":{"x":50,"y":150}},{"id":"2","type":"condition","data":{"label":"Check: ARPU > $10"},"position":{"x":300,"y":150}},{"id":"3","type":"action","data":{"label":"Action: Send SMS Offer"},"position":{"x":550,"y":50}},{"id":"4","type":"action","data":{"label":"Action: Send Push Notif"},"position":{"x":550,"y":250}}],"edges":[{"id":"e1-2","source":"1","target":"2"},{"id":"e2-3","source":"2","target":"3"},{"id":"e2-4","source":"2","target":"4"}]}'::jsonb,
        '{"sent":1200,"clicked":666,"converted":222}'::jsonb,
        1200,
        18.5
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    channel = EXCLUDED.channel,
    flow_definition = EXCLUDED.flow_definition,
    stats = EXCLUDED.stats,
    reach = EXCLUDED.reach,
    conversion_rate = EXCLUDED.conversion_rate;

-- ============================================
-- SEED PROFILES (50 users with realistic distribution)
-- ============================================
-- Note: This generates 50 users with realistic tier distribution
-- Crown: 5, Diamond: 10, Platinum: 15, Gold: 15, Silver: 5

INSERT INTO profiles (msisdn, name, age, gender, tier, status, device_type, location_city, churn_score, arpu_30d)
VALUES
    -- Crown Tier (5 users) - High value, iPhone 15 Pro/Samsung S24, ARPU 40-60
    ('+95 9 1001 1001', 'Aung San', 35, 'Male', 'Crown', 'Active', 'iPhone 15 Pro', 'Yangon', 0.05, 52.30),
    ('+95 9 1002 1002', 'Thida Win', 28, 'Female', 'Crown', 'Active', 'Samsung Galaxy S24 Ultra', 'Mandalay', 0.06, 48.90),
    ('+95 9 1003 1003', 'Kyaw Min', 42, 'Male', 'Crown', 'Active', 'iPhone 15 Pro Max', 'Yangon', 0.04, 55.20),
    ('+95 9 1004 1004', 'Su Su', 31, 'Female', 'Crown', 'Active', 'Samsung Galaxy S24 Ultra', 'Naypyidaw', 0.05, 50.10),
    ('+95 9 1005 1005', 'Myo Aung', 38, 'Male', 'Crown', 'Active', 'iPhone 15 Pro', 'Yangon', 0.07, 46.80),
    
    -- Diamond Tier (10 users) - High value, iPhone 14/Samsung S23, ARPU 30-45
    ('+95 9 2001 2001', 'Hla Hla', 29, 'Female', 'Diamond', 'Active', 'iPhone 14 Pro', 'Mandalay', 0.12, 38.50),
    ('+95 9 2002 2002', 'Zaw Min', 33, 'Male', 'Diamond', 'Active', 'Samsung Galaxy S23', 'Yangon', 0.10, 42.30),
    ('+95 9 2003 2003', 'Nyein Nyein', 26, 'Female', 'Diamond', 'Active', 'iPhone 14', 'Bago', 0.11, 40.20),
    ('+95 9 2004 2004', 'Aung Ko', 39, 'Male', 'Diamond', 'Active', 'Samsung Galaxy S23', 'Mandalay', 0.09, 44.10),
    ('+95 9 2005 2005', 'May Thwe', 24, 'Female', 'Diamond', 'Active', 'iPhone 14 Pro', 'Yangon', 0.13, 36.80),
    ('+95 9 2006 2006', 'Thant Zin', 36, 'Male', 'Diamond', 'Active', 'Samsung Galaxy S23', 'Taunggyi', 0.08, 45.60),
    ('+95 9 2007 2007', 'Khin Khin', 30, 'Female', 'Diamond', 'Active', 'iPhone 14', 'Yangon', 0.11, 39.40),
    ('+95 9 2008 2008', 'Soe Moe', 27, 'Male', 'Diamond', 'Active', 'Samsung Galaxy S23', 'Mawlamyine', 0.12, 37.90),
    ('+95 9 2009 2009', 'Aye Aye', 32, 'Female', 'Diamond', 'Active', 'iPhone 14 Pro', 'Mandalay', 0.10, 41.70),
    ('+95 9 2010 2010', 'Min Min', 35, 'Male', 'Diamond', 'Active', 'Samsung Galaxy S23', 'Yangon', 0.09, 43.20),
    
    -- Platinum Tier (15 users) - Medium-high value, ARPU 20-35
    ('+95 9 3001 3001', 'Win Win', 28, 'Male', 'Platinum', 'Active', 'iPhone 13', 'Yangon', 0.18, 28.50),
    ('+95 9 3002 3002', 'Hnin Hnin', 25, 'Female', 'Platinum', 'Active', 'Samsung Galaxy A54', 'Mandalay', 0.20, 26.30),
    ('+95 9 3003 3003', 'Ko Ko', 31, 'Male', 'Platinum', 'Active', 'Xiaomi 13', 'Yangon', 0.17, 30.10),
    ('+95 9 3004 3004', 'Mi Mi', 29, 'Female', 'Platinum', 'Active', 'iPhone 13', 'Bago', 0.19, 27.40),
    ('+95 9 3005 3005', 'Tun Tun', 34, 'Male', 'Platinum', 'Active', 'Samsung Galaxy A54', 'Mandalay', 0.16, 31.80),
    ('+95 9 3006 3006', 'Su Mon', 23, 'Female', 'Platinum', 'Active', 'Xiaomi 13', 'Yangon', 0.21, 24.90),
    ('+95 9 3007 3007', 'Aung Htun', 37, 'Male', 'Platinum', 'Active', 'iPhone 13', 'Taunggyi', 0.15, 33.20),
    ('+95 9 3008 3008', 'Thazin', 26, 'Female', 'Platinum', 'Active', 'Samsung Galaxy A54', 'Yangon', 0.18, 29.60),
    ('+95 9 3009 3009', 'Myint Myint', 30, 'Male', 'Platinum', 'Active', 'Xiaomi 13', 'Mandalay', 0.17, 30.80),
    ('+95 9 3010 3010', 'Khin Mar', 28, 'Female', 'Platinum', 'Active', 'iPhone 13', 'Yangon', 0.19, 27.70),
    ('+95 9 3011 3011', 'Zaw Zaw', 32, 'Male', 'Platinum', 'Active', 'Samsung Galaxy A54', 'Bago', 0.16, 32.40),
    ('+95 9 3012 3012', 'Nilar', 24, 'Female', 'Platinum', 'Active', 'Xiaomi 13', 'Mandalay', 0.20, 25.50),
    ('+95 9 3013 3013', 'Htet Htet', 35, 'Male', 'Platinum', 'Active', 'iPhone 13', 'Yangon', 0.15, 34.10),
    ('+95 9 3014 3014', 'May Zin', 27, 'Female', 'Platinum', 'Active', 'Samsung Galaxy A54', 'Mawlamyine', 0.18, 28.90),
    ('+95 9 3015 3015', 'Soe Soe', 29, 'Male', 'Platinum', 'Active', 'Xiaomi 13', 'Yangon', 0.17, 31.30),
    
    -- Gold Tier (15 users) - Medium value, ARPU 10-25
    ('+95 9 4001 4001', 'Aye Thwe', 22, 'Female', 'Gold', 'Active', 'Samsung Galaxy A34', 'Yangon', 0.35, 18.50),
    ('+95 9 4002 4002', 'Min Ko', 26, 'Male', 'Gold', 'Active', 'Xiaomi Redmi Note 12', 'Mandalay', 0.38, 15.20),
    ('+95 9 4003 4003', 'Hla Myint', 31, 'Female', 'Gold', 'Active', 'Oppo A78', 'Yangon', 0.32, 21.80),
    ('+95 9 4004 4004', 'Kyaw Kyaw', 24, 'Male', 'Gold', 'Active', 'Samsung Galaxy A34', 'Bago', 0.40, 12.90),
    ('+95 9 4005 4005', 'Nwe Nwe', 28, 'Female', 'Gold', 'Active', 'Xiaomi Redmi Note 12', 'Mandalay', 0.33, 20.40),
    ('+95 9 4006 4006', 'Thant Oo', 29, 'Male', 'Gold', 'Active', 'Oppo A78', 'Yangon', 0.36, 17.60),
    ('+95 9 4007 4007', 'Khin Su', 25, 'Female', 'Gold', 'Active', 'Samsung Galaxy A34', 'Taunggyi', 0.37, 16.30),
    ('+95 9 4008 4008', 'Aung Zaw', 33, 'Male', 'Gold', 'Active', 'Xiaomi Redmi Note 12', 'Yangon', 0.31, 22.70),
    ('+95 9 4009 4009', 'Mi Mi Khin', 27, 'Female', 'Gold', 'Active', 'Oppo A78', 'Mandalay', 0.34, 19.10),
    ('+95 9 4010 4010', 'Soe Naing', 30, 'Male', 'Gold', 'Active', 'Samsung Galaxy A34', 'Yangon', 0.35, 18.80),
    ('+95 9 4011 4011', 'Thin Thin', 23, 'Female', 'Gold', 'Active', 'Xiaomi Redmi Note 12', 'Bago', 0.39, 14.50),
    ('+95 9 4012 4012', 'Myo Win', 28, 'Male', 'Gold', 'Active', 'Oppo A78', 'Mandalay', 0.32, 21.20),
    ('+95 9 4013 4013', 'Hla Htay', 26, 'Female', 'Gold', 'Active', 'Samsung Galaxy A34', 'Yangon', 0.36, 17.90),
    ('+95 9 4014 4014', 'Zaw Naing', 31, 'Male', 'Gold', 'Active', 'Xiaomi Redmi Note 12', 'Mawlamyine', 0.33, 20.60),
    ('+95 9 4015 4015', 'May Thandar', 24, 'Female', 'Gold', 'Active', 'Oppo A78', 'Yangon', 0.38, 15.80),
    
    -- Silver Tier (5 users) - Low value, ARPU 5-15
    ('+95 9 5001 5001', 'Aung Myo', 20, 'Male', 'Silver', 'Active', 'Samsung Galaxy A14', 'Yangon', 0.58, 8.20),
    ('+95 9 5002 5002', 'Khin Hnin', 22, 'Female', 'Silver', 'Active', 'Feature Phone', 'Mandalay', 0.62, 6.50),
    ('+95 9 5003 5003', 'Myo Thant', 19, 'Male', 'Silver', 'Inactive', 'Basic Android', 'Bago', 0.65, 5.80),
    ('+95 9 5004 5004', 'Thin Zar', 21, 'Female', 'Silver', 'Active', 'Samsung Galaxy A14', 'Yangon', 0.60, 7.30),
    ('+95 9 5005 5005', 'Aung Hla', 23, 'Male', 'Silver', 'Churned', 'Feature Phone', 'Mandalay', 0.68, 5.20)
ON CONFLICT (msisdn) DO NOTHING;

-- ============================================
-- SEED USAGE HISTORY (30 days per user)
-- ============================================
-- Note: This generates usage data for the past 30 days
-- Weekend spikes are included (Friday/Saturday have 30-50% more data usage)

-- This would be very long if we generate all 50 users × 30 days × 3 types
-- Instead, we'll generate a sample for a few users to demonstrate the pattern
-- For production, you might want to use a script or generate this programmatically

-- Sample: Generate usage for first 5 users (Crown tier) for last 7 days
-- You can expand this pattern for all users

DO $$
DECLARE
    user_record RECORD;
    usage_date DATE;
    data_amount NUMERIC;
    voice_amount NUMERIC;
    sms_amount NUMERIC;
    day_of_week INT;
    is_weekend BOOLEAN;
    tier_multiplier NUMERIC;
BEGIN
    -- Loop through all profiles
    FOR user_record IN SELECT id, tier FROM profiles LOOP
        -- Set tier multiplier
        CASE user_record.tier
            WHEN 'Crown' THEN tier_multiplier := 1.0;
            WHEN 'Diamond' THEN tier_multiplier := 0.7;
            WHEN 'Platinum' THEN tier_multiplier := 0.5;
            WHEN 'Gold' THEN tier_multiplier := 0.3;
            WHEN 'Silver' THEN tier_multiplier := 0.1;
            ELSE tier_multiplier := 0.3;
        END CASE;
        
        -- Generate 30 days of history
        FOR i IN 0..29 LOOP
            usage_date := CURRENT_DATE - i;
            day_of_week := EXTRACT(DOW FROM usage_date);
            is_weekend := (day_of_week = 5 OR day_of_week = 6); -- Friday or Saturday
            
            -- Generate Data usage
            data_amount := (500 + (RANDOM() * 1500)) * tier_multiplier;
            IF is_weekend THEN
                data_amount := data_amount * (1.3 + RANDOM() * 0.2); -- 30-50% increase
            END IF;
            
            -- Generate Voice usage
            voice_amount := (50 + (RANDOM() * 150)) * tier_multiplier;
            
            -- Generate SMS usage
            sms_amount := (10 + (RANDOM() * 40)) * tier_multiplier;
            
            -- Insert Data usage
            INSERT INTO telecom_usage (user_id, type, amount, timestamp)
            VALUES (
                user_record.id,
                'Data',
                ROUND(data_amount::numeric, 2),
                usage_date + (RANDOM() * INTERVAL '1 day')
            );
            
            -- Insert Voice usage
            INSERT INTO telecom_usage (user_id, type, amount, timestamp)
            VALUES (
                user_record.id,
                'Voice',
                ROUND(voice_amount::numeric, 2),
                usage_date + (RANDOM() * INTERVAL '1 day')
            );
            
            -- Insert SMS usage
            INSERT INTO telecom_usage (user_id, type, amount, timestamp)
            VALUES (
                user_record.id,
                'SMS',
                ROUND(sms_amount::numeric, 2),
                usage_date + (RANDOM() * INTERVAL '1 day')
            );
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'Coupons', COUNT(*) FROM coupons
UNION ALL
SELECT 'Profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'Campaigns', COUNT(*) FROM campaigns
UNION ALL
SELECT 'Usage Records', COUNT(*) FROM telecom_usage;

-- Expected results:
-- Products: 4
-- Coupons: 7
-- Profiles: 50
-- Campaigns: 3
-- Usage Records: 4,500 (50 users × 30 days × 3 types)

