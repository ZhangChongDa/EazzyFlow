/**
 * Diagnose Supabase Connection Issues
 * 
 * This script provides detailed diagnosis of connection and permission issues
 * 
 * Usage: npx tsx scripts/diagnose-connection.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔍 Supabase Connection Diagnosis\n');
console.log('=' .repeat(60));

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log(`   VITE_SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
if (SUPABASE_URL) {
  console.log(`      ${SUPABASE_URL.substring(0, 50)}...`);
}
console.log(`   VITE_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
if (SUPABASE_ANON_KEY) {
  console.log(`      ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
}
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
if (SUPABASE_SERVICE_ROLE_KEY) {
  console.log(`      ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
  if (!SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
    console.log(`      ⚠️  Warning: Service Role Key should start with "eyJ"`);
  }
}

if (!SUPABASE_URL) {
  console.error('\n❌ Error: VITE_SUPABASE_URL must be set');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY && !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ Error: Either VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

// Create clients
const anonClient = SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
}) : null;

const serviceClient = SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
}) : null;

const client = serviceClient || anonClient!;

console.log(`\n🔑 Using: ${serviceClient ? 'Service Role Key' : 'Anon Key'}`);

// Test basic connection
console.log('\n🔌 Testing Basic Connection...');
try {
  const { data, error } = await client.from('_supabase_migrations').select('*').limit(1);
  if (error && error.code !== '42P01') { // 42P01 = relation does not exist (OK for this test)
    console.log(`   ⚠️  Connection test: ${error.message}`);
  } else {
    console.log('   ✅ Basic connection successful');
  }
} catch (err: any) {
  console.log(`   ⚠️  Connection test: ${err.message}`);
}

// Test table existence using RPC or direct query
console.log('\n📊 Checking Table Existence...');
const tables = ['profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs'];

for (const table of tables) {
  try {
    // Try to get table info using a simple query
    const { data, error, count } = await client
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`   ❌ ${table}: Table does not exist`);
      } else if (error.code === '42501') {
        console.log(`   ⚠️  ${table}: Permission denied (RLS may be blocking)`);
      } else {
        console.log(`   ⚠️  ${table}: ${error.message} (code: ${error.code})`);
      }
    } else {
      console.log(`   ✅ ${table}: Exists and accessible`);
    }
  } catch (err: any) {
    console.log(`   ❌ ${table}: ${err.message}`);
  }
}

// Test with Service Role Key if available
if (serviceClient) {
  console.log('\n🔑 Testing with Service Role Key...');
  for (const table of tables) {
    try {
      const { data, error } = await serviceClient.from(table).select('*').limit(1);
      if (error) {
        console.log(`   ❌ ${table}: ${error.message} (code: ${error.code})`);
      } else {
        console.log(`   ✅ ${table}: Accessible with Service Role Key`);
      }
    } catch (err: any) {
      console.log(`   ❌ ${table}: ${err.message}`);
    }
  }
}

// Test with Anon Key if available
if (anonClient && !serviceClient) {
  console.log('\n🔓 Testing with Anon Key...');
  for (const table of tables) {
    try {
      const { data, error } = await anonClient.from(table).select('*').limit(1);
      if (error) {
        console.log(`   ❌ ${table}: ${error.message} (code: ${error.code})`);
      } else {
        console.log(`   ✅ ${table}: Accessible with Anon Key`);
      }
    } catch (err: any) {
      console.log(`   ❌ ${table}: ${err.message}`);
    }
  }
}

// Recommendations
console.log('\n' + '=' .repeat(60));
console.log('\n💡 Recommendations:\n');

console.log('1. Verify RLS Status in Supabase Dashboard:');
console.log('   Execute: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = \'public\';');

console.log('\n2. If RLS is enabled, disable it:');
console.log('   Execute: supabase/fix-rls-permissions.sql');

console.log('\n3. Verify Service Role Key:');
console.log('   - Should start with "eyJ"');
console.log('   - Get from Supabase Dashboard → Project Settings → API → service_role');

console.log('\n4. Check Supabase Project Status:');
console.log('   - Ensure project is not paused');
console.log('   - Check project settings for any restrictions');

console.log('\n5. Try direct SQL query in Supabase Dashboard:');
console.log('   SELECT COUNT(*) FROM profiles;');
console.log('   If this works, the issue is with the client connection.\n');


