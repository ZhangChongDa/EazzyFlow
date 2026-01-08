/**
 * Verify Supabase Key Format
 * 
 * This script helps verify if your Service Role Key is correct
 */

import 'dotenv/config';

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('🔍 Verifying Supabase Keys...\n');

if (SUPABASE_SERVICE_ROLE_KEY) {
  console.log('📋 SUPABASE_SERVICE_ROLE_KEY:');
  console.log(`   Length: ${SUPABASE_SERVICE_ROLE_KEY.length} characters`);
  console.log(`   Starts with: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...`);
  
  if (SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
    console.log('   ✅ Format: Correct (JWT token)');
  } else if (SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_publishable_')) {
    console.log('   ❌ Format: Incorrect - This is a PUBLISHABLE key, not SERVICE_ROLE key');
    console.log('   💡 Solution: Get the "service_role" key from Supabase Dashboard');
  } else if (SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_')) {
    console.log('   ❌ Format: Incorrect - This appears to be an ANON key, not SERVICE_ROLE key');
    console.log('   💡 Solution: Get the "service_role" key from Supabase Dashboard');
  } else {
    console.log('   ⚠️  Format: Unknown - Service Role Key should start with "eyJ"');
  }
} else {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY: Not set');
}

console.log('\n📋 VITE_SUPABASE_ANON_KEY:');
if (SUPABASE_ANON_KEY) {
  console.log(`   Length: ${SUPABASE_ANON_KEY.length} characters`);
  console.log(`   Starts with: ${SUPABASE_ANON_KEY.substring(0, 15)}...`);
} else {
  console.log('   Not set');
}

console.log('\n💡 How to get Service Role Key:');
console.log('   1. Go to Supabase Dashboard → Project Settings → API');
console.log('   2. Find the "service_role" section (below "anon public")');
console.log('   3. Copy the key (it should start with "eyJ" and be a long JWT token)');
console.log('   4. Add it to .env as: SUPABASE_SERVICE_ROLE_KEY=your_key_here\n');


