-- ============================================
-- Eazzy Flow - Telecom MCCM Database Schema (v2.0 Ultimate)
-- ============================================
-- Updated: 2026-01-03
-- Includes: Billing, DPI Usage, Device Dimensions, Holidays, Public Access RLS
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

DROP TYPE IF EXISTS user_tier CASCADE;
CREATE TYPE user_tier AS ENUM ('Crown', 'Diamond', 'Platinum', 'Gold', 'Silver');

DROP TYPE IF EXISTS user_status CASCADE;
CREATE TYPE user_status AS ENUM ('Active', 'Churned', 'Inactive');

DROP TYPE IF EXISTS gender_type CASCADE;
CREATE TYPE gender_type AS ENUM ('Male', 'Female');

DROP TYPE IF EXISTS product_type CASCADE;
CREATE TYPE product_type AS ENUM ('Data', 'Voice', 'Bundle', 'VAS', 'Device');

DROP TYPE IF EXISTS coupon_type CASCADE;
CREATE TYPE coupon_type AS ENUM ('Discount', 'Voucher', 'Points');

DROP TYPE IF EXISTS usage_type CASCADE;
CREATE TYPE usage_type AS ENUM ('Data', 'Voice', 'SMS');

DROP TYPE IF EXISTS billing_type CASCADE;
CREATE TYPE billing_type AS ENUM ('Topup', 'Package_Purchase', 'Pay_As_You_Go', 'Adjustment');

DROP TYPE IF EXISTS campaign_status CASCADE;
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');

-- ============================================
-- TABLES
-- ============================================

-- 1. Device Dimension (Must be before profiles)
CREATE TABLE IF NOT EXISTS dim_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tac TEXT, 
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    network_capability TEXT CHECK (network_capability IN ('3G', '4G', '5G')),
    is_gaming BOOLEAN DEFAULT FALSE,
    release_year INTEGER
);

-- 2. Profiles Table (User/Customer Profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    msisdn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    age INTEGER CHECK (age >= 0 AND age <= 150),
    gender gender_type,
    tier user_tier NOT NULL DEFAULT 'Silver',
    status user_status NOT NULL DEFAULT 'Active',
    device_type TEXT, 
    device_id UUID REFERENCES dim_devices(id) ON DELETE SET NULL, -- Linked Device
    location_city TEXT,
    churn_score DOUBLE PRECISION CHECK (churn_score >= 0 AND churn_score <= 1),
    arpu_30d DOUBLE PRECISION DEFAULT 0,
    balance NUMERIC(15, 2) DEFAULT 0, -- Live Wallet Balance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Products Table (Telecom Products Catalog)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technical_id TEXT UNIQUE NOT NULL,
    marketing_name TEXT NOT NULL,
    type product_type NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    description TEXT,
    image_url TEXT,
    category TEXT,
    status TEXT DEFAULT 'active',
    synced_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    type coupon_type NOT NULL,
    value TEXT NOT NULL,
    total_stock INTEGER NOT NULL DEFAULT 0,
    claimed_count INTEGER NOT NULL DEFAULT 0,
    validity_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Telecom Usage Table (Refactored for DPI/Latency)
CREATE TABLE IF NOT EXISTS telecom_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type usage_type NOT NULL,
    volume_mb NUMERIC(10, 2),       -- For Data
    duration_sec INTEGER,           -- For Voice
    latency_ms INTEGER,             -- For Gamer Churn Analysis
    metadata JSONB DEFAULT '{}'::jsonb, -- Deep Packet Inspection (App Name, SNI)
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Billing Transactions (NEW - For Revenue Tracking)
CREATE TABLE IF NOT EXISTS billing_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    type billing_type NOT NULL,
    currency TEXT DEFAULT 'MMK',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status campaign_status NOT NULL DEFAULT 'draft',
    channel TEXT,
    flow_definition JSONB,
    stats JSONB DEFAULT '{"sent": 0, "clicked": 0, "converted": 0}'::jsonb,
    reach INTEGER DEFAULT 0,
    conversion_rate DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Campaign Logs Table
CREATE TABLE IF NOT EXISTS campaign_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    status TEXT NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Public Holidays
CREATE TABLE IF NOT EXISTS public_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    notes TEXT
);


-- 10. Marketing Offers (Updated: With AI Content Fields)
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    marketing_name TEXT NOT NULL,
    discount_percent INTEGER,
    final_price NUMERIC(10, 2),
    image_url TEXT,
    
    -- ✅ 新增字段 (同步到文档中)
    marketing_copy TEXT,          -- 存储 DeepSeek 生成的文案
    terms_conditions TEXT,        -- 存储 AI 生成的条款
    
    status TEXT DEFAULT 'active', -- 建议显式加上默认状态
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_telecom_usage_user_ts ON telecom_usage(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telecom_usage_latency ON telecom_usage(latency_ms) WHERE latency_ms > 100;
CREATE INDEX IF NOT EXISTS idx_billing_user_ts ON billing_transactions(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_device ON profiles(device_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public_holidays(date);

-- ============================================
-- TRIGGERS (Auto-Balance Update)
-- ============================================

CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'Topup' THEN
        UPDATE profiles SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.type IN ('Package_Purchase', 'Pay_As_You_Go') THEN
        UPDATE profiles SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_balance ON billing_transactions;
CREATE TRIGGER trg_update_balance
AFTER INSERT ON billing_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();

-- Campaign updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (Public Demo Mode)
-- ============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Create Permissive Policies
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'products', 'coupons', 'telecom_usage', 'billing_transactions', 'campaigns', 'campaign_logs', 'public_holidays', 'dim_devices', 'offers')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public Access %s" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Public Access %s" ON %I FOR ALL TO public USING (true) WITH CHECK (true)', t, t);
    END LOOP;
END$$;

-- Connect 'anon' role just in case
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;

-- ============================================
-- DATA MIGRATION: 2026 MYANMAR HOLIDAYS
-- ============================================

TRUNCATE public_holidays;

INSERT INTO public_holidays (date, name, type, notes) VALUES
('2026-01-01', 'New Year''s Day', 'Public Holiday', NULL),
('2026-01-04', 'Independence Day', 'Public Holiday', 'Sunday'),
('2026-02-12', 'Union Day', 'Public Holiday', 'Thursday'),
('2026-03-02', 'Peasants'' Day', 'Long Weekend', 'Monday'),
('2026-03-04', 'Full Moon Day of Tabaung', 'Public Holiday', 'Wednesday'),
('2026-03-27', 'Armed Forces Day', 'Long Weekend', 'Friday'),
('2026-04-13', 'Water Festival', 'Long Weekend', 'Monday'),
('2026-04-14', 'Second Day of Water Festival', 'Public Holiday', 'Tuesday'),
('2026-04-15', 'Third Day of Water Festival', 'Public Holiday', 'Wednesday'),
('2026-04-16', 'Fourth Day of Water Festival', 'Public Holiday', 'Thursday'),
('2026-04-17', 'Burmese New Year', 'Long Weekend', 'Friday'),
('2026-05-01', 'Labor Day', 'Long Weekend', 'Friday'),
('2026-05-02', 'Full Moon Day of Kasong', 'Public Holiday', 'Saturday'),
('2026-07-19', 'Martyrs'' Day', 'Public Holiday', 'Sunday'),
('2026-07-31', 'Full Moon Day of Waso', 'Long Weekend', 'Friday'),
('2026-10-25', 'Day before Full Moon Day of Thadingyut', 'Public Holiday', 'Sunday'),
('2026-10-26', 'Full Moon Day of Thadingyut', 'Long Weekend', 'Monday'),
('2026-10-27', 'Day after Full Moon Day of Thadingyut', 'Public Holiday', 'Tuesday'),
('2026-11-22', 'Day before Full Moon Day of Tazaungmone', 'Public Holiday', 'Sunday'),
('2026-11-23', 'Full Moon Day of Tazaungmone', 'Long Weekend', 'Monday'),
('2026-12-04', 'National Day', 'Long Weekend', 'Friday'),
('2026-12-25', 'Christmas Day', 'Long Weekend', 'Friday'),
('2026-12-31', 'New Year''s Eve', 'Public Holiday', 'Thursday');

-- Force schema reload
NOTIFY pgrst, 'reload schema';
