# 🔧 Complete RLS Policy Fix - All Tables

## ❌ Current Problem

Only 3 tables have policies:
- ✅ coupons
- ✅ products  
- ✅ profiles

Missing policies for:
- ❌ telecom_usage
- ❌ campaigns
- ❌ campaign_logs

## ✅ Solution

### Step 1: Execute Complete Policy Script

In Supabase Dashboard → SQL Editor, execute:

```sql
-- File: supabase/create-all-policies.sql
```

This script will:
1. Enable RLS on all 6 tables
2. Drop existing policies (clean slate)
3. Create policies for ALL tables:
   - profiles
   - products
   - coupons
   - telecom_usage
   - campaigns
   - campaign_logs

4. Create 4 policies per table:
   - SELECT (read)
   - INSERT (create)
   - UPDATE (modify)
   - DELETE (remove)

**Total: 6 tables × 4 policies = 24 policies**

### Step 2: Verify All Policies

After executing, run this to verify:

```sql
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(cmd, ', ' ORDER BY cmd) as commands
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
GROUP BY tablename
ORDER BY tablename;
```

**Expected Result:**
```
tablename          | policy_count | commands
-------------------+--------------+----------------------------
campaign_logs      | 4            | DELETE, INSERT, SELECT, UPDATE
campaigns          | 4            | DELETE, INSERT, SELECT, UPDATE
coupons            | 4            | DELETE, INSERT, SELECT, UPDATE
products           | 4            | DELETE, INSERT, SELECT, UPDATE
profiles           | 4            | DELETE, INSERT, SELECT, UPDATE
telecom_usage      | 4            | DELETE, INSERT, SELECT, UPDATE
```

### Step 3: Test in Application

1. **Refresh browser** (or logout/login)
2. **Check console** - should see 200 OK for all API calls
3. **Verify data loads:**
   - Profiles (50 users)
   - Products (4 items)
   - Coupons (7 items)
   - Campaigns (3 items)
   - Usage history (4,500 records)

## 📊 Policy Details

Each table will have these 4 policies:

1. **SELECT Policy**: `Allow authenticated users to read [table]`
   - Allows reading data
   - Uses: `auth.uid() IS NOT NULL`

2. **INSERT Policy**: `Allow authenticated users to insert [table]`
   - Allows creating new records
   - Uses: `auth.uid() IS NOT NULL`

3. **UPDATE Policy**: `Allow authenticated users to update [table]`
   - Allows modifying existing records
   - Uses: `auth.uid() IS NOT NULL`

4. **DELETE Policy**: `Allow authenticated users to delete [table]`
   - Allows removing records
   - Uses: `auth.uid() IS NOT NULL`

## 🔍 Quick Check Query

To see all policies at once:

```sql
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename, cmd;
```

## ✅ Success Criteria

After applying the fix:
- ✅ All 6 tables have policies
- ✅ Each table has 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ Total of 24 policies created
- ✅ No 403 errors in browser console
- ✅ All data loads correctly in the application

