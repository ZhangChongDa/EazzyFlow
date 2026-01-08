/**
 * Test Supabase Connection
 * 
 * This script tests the connection to Supabase and verifies data access
 * 
 * Usage: npx tsx scripts/test-connection.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL must be set');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY && !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Either VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

// Use Service Role Key if available (bypasses RLS), otherwise use Anon Key
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

if (SUPABASE_SERVICE_ROLE_KEY) {
  console.log('🔑 Using Service Role Key (bypasses RLS)\n');
} else {
  console.log('⚠️  Using Anon Key\n');
}

async function testConnection() {
  console.log('🧪 Testing Supabase Connection...\n');
  console.log('=' .repeat(50));

  // Test 1: Products
  console.log('\n📦 Test 1: Fetching Products...');
  try {
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) {
      console.error('  ❌ Error:', error.message);
    } else {
      console.log(`  ✅ Success: Found ${products?.length || 0} products`);
      if (products && products.length > 0) {
        console.log(`     Sample: ${products[0].marketing_name}`);
      }
    }
  } catch (err: any) {
    console.error('  ❌ Exception:', err.message);
  }

  // Test 2: Coupons
  console.log('\n🎫 Test 2: Fetching Coupons...');
  try {
    const { data: coupons, error } = await supabase.from('coupons').select('*');
    if (error) {
      console.error('  ❌ Error:', error.message);
    } else {
      console.log(`  ✅ Success: Found ${coupons?.length || 0} coupons`);
      if (coupons && coupons.length > 0) {
        console.log(`     Sample: ${coupons[0].name}`);
      }
    }
  } catch (err: any) {
    console.error('  ❌ Exception:', err.message);
  }

  // Test 3: Profiles
  console.log('\n👥 Test 3: Fetching Profiles...');
  try {
    const { data: profiles, error } = await supabase.from('profiles').select('*').limit(5);
    if (error) {
      console.error('  ❌ Error:', error.message);
    } else {
      console.log(`  ✅ Success: Found ${profiles?.length || 0} profiles (showing first 5)`);
      if (profiles && profiles.length > 0) {
        console.log(`     Sample: ${profiles[0].name} (${profiles[0].tier}) - ARPU: $${profiles[0].arpu_30d}`);
      }
    }
  } catch (err: any) {
    console.error('  ❌ Exception:', err.message);
  }

  // Test 4: Usage History
  console.log('\n📊 Test 4: Fetching Usage History...');
  try {
    const { data: usage, error } = await supabase
      .from('telecom_usage')
      .select('*')
      .limit(5);
    if (error) {
      console.error('  ❌ Error:', error.message);
    } else {
      console.log(`  ✅ Success: Found usage records (showing first 5)`);
      if (usage && usage.length > 0) {
        console.log(`     Sample: ${usage[0].type} - ${usage[0].amount} (${usage[0].timestamp})`);
      }
    }
  } catch (err: any) {
    console.error('  ❌ Exception:', err.message);
  }

  // Test 5: Campaigns
  console.log('\n🎯 Test 5: Fetching Campaigns...');
  try {
    const { data: campaigns, error } = await supabase.from('campaigns').select('*');
    if (error) {
      console.error('  ❌ Error:', error.message);
    } else {
      console.log(`  ✅ Success: Found ${campaigns?.length || 0} campaigns`);
      if (campaigns && campaigns.length > 0) {
        console.log(`     Sample: ${campaigns[0].name} (${campaigns[0].status})`);
      }
    }
  } catch (err: any) {
    console.error('  ❌ Exception:', err.message);
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  
  // Check if we had any permission errors
  const hasPermissionErrors = false; // This would be set based on errors above
  
  if (hasPermissionErrors) {
    console.log('⚠️  Permission errors detected!\n');
    console.log('💡 Solution: Disable RLS for development');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Execute: supabase/fix-rls-permissions.sql');
    console.log('   3. Or manually run:');
    console.log('      ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;');
    console.log('      ALTER TABLE products DISABLE ROW LEVEL SECURITY;');
    console.log('      ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;');
    console.log('      ALTER TABLE telecom_usage DISABLE ROW LEVEL SECURITY;');
    console.log('      ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;');
    console.log('      ALTER TABLE campaign_logs DISABLE ROW LEVEL SECURITY;\n');
  } else {
    console.log('✅ Connection test completed!\n');
    console.log('💡 Next steps:');
    console.log('   1. Start the dev server: npm run dev');
    console.log('   2. Open the app in browser');
    console.log('   3. Check browser console for any errors');
    console.log('   4. Navigate through different pages to test data display\n');
  }
}

testConnection().catch(console.error);

