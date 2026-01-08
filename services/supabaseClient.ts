
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  console.error('Get these values from: https://supabase.com/dashboard/project/uyvdhsswniwmcmeahofn/settings/api');
}

// Create Supabase client (will work even with invalid keys, but operations will fail)
export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder_key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'apikey': SUPABASE_ANON_KEY || 'placeholder_key',
    },
  },
});

// Debug: Log auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔐 Auth event:', event);
  if (session) {
    console.log('✅ Session active:', session.user.email);
  } else {
    console.log('❌ No session');
  }
});

// Helper to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper to check if user is authenticated
export const isAuthenticated = async () => {
  const user = await getCurrentUser();
  return !!user;
};