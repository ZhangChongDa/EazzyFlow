-- ============================================
-- User Tags and Segments System
-- ============================================
-- This schema enables:
-- 1. User Tags: Custom labels for users (e.g., "Gamer", "Student", "High Value")
-- 2. User Segments: Saved audience groups with criteria
-- 3. Tag Assignments: Many-to-many relationship between users and tags
-- ============================================

-- 1. User Tags Table
CREATE TABLE IF NOT EXISTS user_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'Custom', -- 'Demographics', 'Consumption', 'Lifecycle', 'Interests', 'Channel Pref', 'Custom'
    color TEXT DEFAULT '#6366f1', -- Hex color for UI display
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Tag Assignments (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_tag_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES user_tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by TEXT, -- Optional: track who assigned it
    UNIQUE(user_id, tag_id) -- Prevent duplicate assignments
);

-- 3. User Segments Table (Saved Audience Groups)
CREATE TABLE IF NOT EXISTS user_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL, -- Stores SegmentCriteria structure
    estimated_size INTEGER DEFAULT 0, -- Cached audience size
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tag_assignments_user_id ON user_tag_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_assignments_tag_id ON user_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_category ON user_tags(category);
CREATE INDEX IF NOT EXISTS idx_user_segments_name ON user_segments(name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_user_tags_updated_at ON user_tags;
CREATE TRIGGER update_user_tags_updated_at
    BEFORE UPDATE ON user_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_segments_updated_at ON user_segments;
CREATE TRIGGER update_user_segments_updated_at
    BEFORE UPDATE ON user_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default tags (optional - for demo)
INSERT INTO user_tags (name, category, color, description) VALUES
    ('Gamer', 'Interests', '#6366f1', 'Users who play mobile games'),
    ('Student', 'Demographics', '#10b981', 'Student segment'),
    ('Night Owl', 'Consumption', '#f59e0b', 'Users active during night hours'),
    ('High Data User', 'Consumption', '#ec4899', 'Users with high data consumption'),
    ('Roamer', 'Consumption', '#8b5cf6', 'Users who frequently roam'),
    ('Social Media', 'Interests', '#06b6d4', 'Active social media users'),
    ('Music Lover', 'Interests', '#f97316', 'Users who stream music'),
    ('Price Sensitive', 'Lifecycle', '#ef4444', 'Users sensitive to pricing'),
    ('Dual SIM', 'Demographics', '#84cc16', 'Users with dual SIM cards'),
    ('iPhone User', 'Demographics', '#3b82f6', 'iOS device users'),
    ('Android User', 'Demographics', '#22c55e', 'Android device users')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions
GRANT ALL ON user_tags TO authenticated;
GRANT ALL ON user_tag_assignments TO authenticated;
GRANT ALL ON user_segments TO authenticated;

