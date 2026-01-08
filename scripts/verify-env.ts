/**
 * Verify Environment Variables
 * 
 * This script verifies that all environment variables are correctly configured
 * 
 * Usage: npx tsx scripts/verify-env.ts
 */

import 'dotenv/config';

console.log('🔍 Verifying Environment Variables...\n');
console.log('=' .repeat(60));

const errors: string[] = [];
const warnings: string[] = [];

// Check VITE_SUPABASE_URL
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
if (!SUPABASE_URL) {
  errors.push('❌ VITE_SUPABASE_URL is missing');
} else if (!SUPABASE_URL.startsWith('https://')) {
  errors.push('❌ VITE_SUPABASE_URL should start with https://');
} else if (!SUPABASE_URL.includes('.supabase.co')) {
  warnings.push('⚠️  VITE_SUPABASE_URL might be incorrect (should contain .supabase.co)');
} else {
  console.log('✅ VITE_SUPABASE_URL:', SUPABASE_URL);
}

// Check VITE_SUPABASE_ANON_KEY
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
if (!ANON_KEY) {
  errors.push('❌ VITE_SUPABASE_ANON_KEY is missing');
} else if (!ANON_KEY.startsWith('eyJ')) {
  errors.push('❌ VITE_SUPABASE_ANON_KEY should start with "eyJ" (JWT format)');
} else if (ANON_KEY.length < 200) {
  warnings.push('⚠️  VITE_SUPABASE_ANON_KEY seems too short (should be 200+ characters)');
} else {
  console.log('✅ VITE_SUPABASE_ANON_KEY:', ANON_KEY.substring(0, 20) + '...' + ANON_KEY.substring(ANON_KEY.length - 20));
  console.log('   Length:', ANON_KEY.length, 'characters');
  
  // Try to decode JWT to verify format
  try {
    const parts = ANON_KEY.split('.');
    if (parts.length !== 3) {
      errors.push('❌ VITE_SUPABASE_ANON_KEY should have 3 parts separated by dots (JWT format)');
    } else {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('   Role:', payload.role);
      console.log('   Issuer:', payload.iss?.substring(0, 50) + '...');
    }
  } catch (e) {
    warnings.push('⚠️  Could not decode VITE_SUPABASE_ANON_KEY (might still be valid)');
  }
}

// Check SUPABASE_SERVICE_ROLE_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!SERVICE_KEY) {
  warnings.push('⚠️  SUPABASE_SERVICE_ROLE_KEY is missing (optional, but recommended for seeding)');
} else if (!SERVICE_KEY.startsWith('eyJ')) {
  errors.push('❌ SUPABASE_SERVICE_ROLE_KEY should start with "eyJ" (JWT format)');
} else if (SERVICE_KEY.length < 200) {
  warnings.push('⚠️  SUPABASE_SERVICE_ROLE_KEY seems too short (should be 200+ characters)');
} else {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY:', SERVICE_KEY.substring(0, 20) + '...' + SERVICE_KEY.substring(SERVICE_KEY.length - 20));
  console.log('   Length:', SERVICE_KEY.length, 'characters');
  
  // Try to decode JWT to verify format
  try {
    const parts = SERVICE_KEY.split('.');
    if (parts.length !== 3) {
      errors.push('❌ SUPABASE_SERVICE_ROLE_KEY should have 3 parts separated by dots (JWT format)');
    } else {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('   Role:', payload.role);
      if (payload.role !== 'service_role') {
        errors.push('❌ SUPABASE_SERVICE_ROLE_KEY should have role "service_role"');
      }
    }
  } catch (e) {
    warnings.push('⚠️  Could not decode SUPABASE_SERVICE_ROLE_KEY (might still be valid)');
  }
}

// Check VITE_RESEND_API_KEY
const RESEND_KEY = process.env.VITE_RESEND_API_KEY || '';
if (!RESEND_KEY) {
  warnings.push('⚠️  VITE_RESEND_API_KEY is missing (optional)');
} else if (!RESEND_KEY.startsWith('re_')) {
  warnings.push('⚠️  VITE_RESEND_API_KEY should start with "re_"');
} else {
  console.log('✅ VITE_RESEND_API_KEY:', RESEND_KEY.substring(0, 10) + '...');
}

// Summary
console.log('\n' + '=' .repeat(60));

if (errors.length > 0) {
  console.log('\n❌ ERRORS FOUND:\n');
  errors.forEach(err => console.log('  ' + err));
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:\n');
  warnings.forEach(warn => console.log('  ' + warn));
}

if (errors.length === 0) {
  console.log('\n✅ All environment variables are correctly configured!');
  console.log('\n💡 Next steps:');
  console.log('   1. Restart dev server: npm run dev');
  console.log('   2. Check browser console for any errors');
  console.log('   3. Test login and data access');
}


