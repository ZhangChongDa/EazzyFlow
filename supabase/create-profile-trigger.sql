-- ============================================
-- Auto-Create Profile on User Sign Up
-- ============================================
-- This trigger automatically creates a profile record
-- when a new user signs up via Supabase Auth
-- ============================================

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    msisdn,
    name,
    tier,
    status,
    arpu_30d
  )
  VALUES (
    NEW.id,  -- Use auth.users.id as profile.id
    COALESCE(NEW.phone, 'N/A'),  -- Use phone if available, otherwise 'N/A'
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),  -- Use name from metadata, email, or 'User'
    'Silver',  -- Default tier
    'Active',  -- Default status
    0  -- Default ARPU
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile when user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;


