# 🔧 Fix 403 Forbidden Error

## ❌ Problem

All API requests return `403 Forbidden` even after login:
```
GET /rest/v1/products?select=* 403 (Forbidden)
GET /rest/v1/profiles?select=* 403 (Forbidden)
GET /rest/v1/coupons?select=* 403 (Forbidden)
```

## 🔍 Root Cause

The RLS policies are blocking access because:
1. The policy check `auth.role() = 'authenticated'` might not work correctly
2. Or the policies weren't created properly
3. Or the user session isn't being recognized

## ✅ Solution

### Step 1: Update RLS Policies

In Supabase Dashboard → SQL Editor, execute:

```sql
-- Run the complete fix script
-- File: supabase/fix-rls-403-error.sql
```

Or manually execute the SQL in `supabase/fix-rls-403-error.sql`.

**Key Changes:**
- Uses `auth.uid() IS NOT NULL` instead of `auth.role() = 'authenticated'`
- Creates separate policies for SELECT, INSERT, UPDATE, DELETE
- More reliable authentication check

### Step 2: Verify User is Authenticated

Check in browser console:

```javascript
// Check if user is authenticated
import { supabase } from './services/supabaseClient';
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User:', session?.user);
```

**Expected:**
- `session` should not be null
- `session.user` should have an `id` and `email`

### Step 3: Test After Fix

1. **Refresh the browser** (or logout and login again)
2. **Check browser console** - should see successful API calls (200 status)
3. **Verify data loads** in the application

## 🔍 Alternative: Check Current Policies

If the fix doesn't work, check current policies:

```sql
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons')
ORDER BY tablename;
```

**Expected:**
- Each table should have policies for SELECT, INSERT, UPDATE, DELETE
- `qual` should contain `auth.uid() IS NOT NULL` or similar

## 🐛 Troubleshooting

### Issue 1: Still getting 403 after fix

**Check:**
1. User is actually logged in (check session)
2. Policies were created successfully
3. RLS is enabled on tables

**Solution:**
```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'products', 'coupons');

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Issue 2: Session is null

**Check:**
1. Login was successful
2. Session is persisted (check localStorage)
3. Supabase client is configured correctly

**Solution:**
- Logout and login again
- Check `supabaseClient.ts` has `persistSession: true`

### Issue 3: Policies not working

**Try:**
1. Disable RLS temporarily to test:
   ```sql
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ```
2. If data loads, the issue is with policies
3. Re-enable RLS and fix policies

## 📝 Quick Fix Checklist

- [ ] Execute `supabase/fix-rls-403-error.sql` in Supabase Dashboard
- [ ] Verify policies were created (check output)
- [ ] Logout and login again in the app
- [ ] Refresh browser
- [ ] Check browser console for 200 status codes
- [ ] Verify data loads in the application

## 🎯 Expected Result

After applying the fix:
- ✅ API calls return 200 OK
- ✅ Data loads in the application
- ✅ No 403 errors in console
- ✅ All tables accessible to authenticated users

