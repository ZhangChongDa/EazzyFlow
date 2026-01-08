# ⚡ Quick Fix for 403 Error

## 🚀 Immediate Actions (Try in Order)

### 1. Clear Browser Storage and Re-login ⭐ (Most Common Fix)

1. **Open Browser DevTools** (F12)
2. **Go to Application tab** → **Storage**
3. **Clear:**
   - Local Storage → Delete all `supabase.*` entries
   - Session Storage → Clear all
   - Cookies → Clear all
4. **Close and reopen browser tab**
5. **Login again**

### 2. Restart Dev Server

```bash
# Stop server (Ctrl+C in terminal)
# Then restart
npm run dev
```

### 3. Check Session in Console

Open browser console and run:

```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

**If `session` is `null`:**
- You're not logged in
- Need to login again

**If `session` exists but still 403:**
- Try Solution 4

### 4. Force Re-authentication

In browser console:

```javascript
// Logout
await supabase.auth.signOut();

// Wait a moment, then check
setTimeout(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('After logout:', session); // Should be null
}, 1000);

// Then login again through the UI
```

### 5. Verify Policies Are Active

In Supabase Dashboard → SQL Editor:

```sql
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons')
GROUP BY tablename;
```

Should show 4 policies per table.

## 🔍 Debug Steps

### Check if Token is Being Sent

1. Open **Network tab** in DevTools
2. Find a failed request (403)
3. Click on it
4. Check **Headers** tab
5. Look for `Authorization` header

**Should see:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**If missing:**
- Session is not being used
- Need to login again

## ✅ Expected Result

After fixing:
- ✅ No 403 errors in console
- ✅ Data loads in application
- ✅ Session exists in browser storage
- ✅ Authorization header in network requests

