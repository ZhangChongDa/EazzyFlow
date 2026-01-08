/**
 * Diagnose Authentication and RLS Issues
 * 
 * This script helps diagnose why RLS is blocking database access
 * 
 * Usage: npx tsx scripts/diagnose-auth-issue.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
    },
  },
});

async function diagnoseAuthIssue() {
  console.log('🔍 Diagnosing Authentication and RLS Issues...\n');

  // Step 1: Check session
  console.log('📋 Step 1: Checking Session...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('❌ Session Error:', sessionError);
    return;
  }

  if (!session) {
    console.error('❌ No active session found!');
    console.log('\n💡 Solution: You need to login first.');
    console.log('   1. Open the app in browser');
    console.log('   2. Login with your credentials');
    console.log('   3. Then run this script again\n');
    return;
  }

  console.log('✅ Session found:');
  console.log('   - User ID:', session.user.id);
  console.log('   - Email:', session.user.email);
  console.log('   - Role:', session.user.role);
  console.log('   - Access Token:', session.access_token ? 'Present ✅' : 'Missing ❌');
  console.log('   - Token Type:', session.token_type);
  console.log('   - Expires At:', new Date(session.expires_at! * 1000).toLocaleString());
  console.log('');

  // Step 2: Test direct query with session
  console.log('📋 Step 2: Testing Database Query...');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, msisdn')
      .limit(1);

    if (error) {
      console.error('❌ Query Error:', error);
      console.error('   - Code:', error.code);
      console.error('   - Message:', error.message);
      console.error('   - Details:', error.details);
      console.error('   - Hint:', error.hint);
      
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        console.log('\n💡 This is an RLS (Row Level Security) issue.');
        console.log('   Possible causes:');
        console.log('   1. RLS policies are not correctly configured');
        console.log('   2. User role is not "authenticated"');
        console.log('   3. RLS policies are checking for wrong conditions');
        console.log('\n   Solution:');
        console.log('   1. Check RLS policies in Supabase Dashboard');
        console.log('   2. Run supabase/ULTIMATE-FIX.sql to fix policies');
        console.log('   3. Verify user role is "authenticated"');
      }
    } else {
      console.log('✅ Query successful!');
      console.log('   - Data:', data);
      console.log('   - Count:', data?.length || 0);
    }
  } catch (err: any) {
    console.error('❌ Unexpected error:', err);
  }

  console.log('');

  // Step 3: Check RLS status (if possible)
  console.log('📋 Step 3: Checking RLS Status...');
  console.log('   (This requires database access - check Supabase Dashboard)');
  console.log('   Go to: Supabase Dashboard → Table Editor → profiles → Settings');
  console.log('   Check if "Enable Row Level Security" is ON');
  console.log('');

  // Step 4: Test with manual headers
  console.log('📋 Step 4: Testing with Manual Headers...');
  
  if (session.access_token) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('   - Status:', response.status);
      console.log('   - Status Text:', response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('   - Response:', data);
        console.log('✅ Manual request successful!');
      } else {
        const errorText = await response.text();
        console.error('   - Error Response:', errorText);
        console.error('❌ Manual request failed!');
      }
    } catch (err: any) {
      console.error('❌ Manual request error:', err.message);
    }
  } else {
    console.error('❌ No access token available');
  }

  console.log('\n✅ Diagnosis complete!');
}

diagnoseAuthIssue().catch(console.error);


