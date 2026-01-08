# 🐛 Debug 403 Error - Session Issue

## ❌ Problem

RLS policies are correct, but still getting 403 errors. This is likely a **session/authentication issue**.

## 🔍 Step-by-Step Debugging

### Step 1: Check if User is Actually Logged In

Open browser console and run:

```javascript
// Check session
const { data: { session }, error } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User:', session?.user);
console.log('Access Token:', session?.access_token ? 'Present' : 'Missing');
```

**Expected:**
- `session` should NOT be null
- `session.user` should have `id` and `email`
- `session.access_token` should exist

**If session is null:**
- User is not logged in
- Need to login again

### Step 2: Clear Browser Storage and Re-login

1. **Open Browser DevTools** (F12)
2. **Go to Application tab** (Chrome) or **Storage tab** (Firefox)
3. **Clear Storage:**
   - Clear `Local Storage` → `supabase.auth.token`
   - Clear `Session Storage`
   - Clear `Cookies`
4. **Refresh page**
5. **Login again**

### Step 3: Check Authentication Headers

In browser console, check if auth headers are being sent:

```javascript
// Check current session
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  console.log('Access Token:', session.access_token.substring(0, 20) + '...');
  console.log('Token Type:', session.token_type);
} else {
  console.error('No session found!');
}
```

### Step 4: Test Direct API Call

Test if authentication works with a direct API call:

```javascript
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  const response = await fetch('https://uyvdhsswniwmcmeahofn.supabase.co/rest/v1/profiles?select=*&limit=1', {
    headers: {
      'apikey': 'YOUR_ANON_KEY',
      'Authorization': `Bearer ${session.access_token}`
    }
  });
  
  console.log('Status:', response.status);
  console.log('Response:', await response.json());
}
```

Replace `YOUR_ANON_KEY` with your actual anon key from `.env`.

## ✅ Solutions

### Solution 1: Force Re-login

1. **Logout:**
   ```javascript
   await supabase.auth.signOut();
   ```

2. **Clear browser storage** (see Step 2)

3. **Login again**

4. **Refresh page**

### Solution 2: Restart Dev Server

Sometimes the dev server needs a restart:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### Solution 3: Check Supabase Client Configuration

Verify `supabaseClient.ts` has correct auth settings:

```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,  // ✅ Should be true
    autoRefreshToken: true, // ✅ Should be true
    detectSessionInUrl: true, // ✅ Should be true
  },
});
```

### Solution 4: Verify Session is Being Used

Add debug logging to see if session is being used:

```typescript
// In supabaseClient.ts, add:
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  console.log('Session:', session ? 'Present' : 'Missing');
});
```

## 🔧 Quick Fix Checklist

- [ ] Check if session exists in browser console
- [ ] Clear browser storage (localStorage, sessionStorage, cookies)
- [ ] Logout and login again
- [ ] Restart dev server (`npm run dev`)
- [ ] Check browser console for auth errors
- [ ] Verify access token is being sent in requests

## 🎯 Most Likely Cause

The most common cause is:
1. **Session expired or invalid** - Need to re-login
2. **Browser cache** - Clear storage and refresh
3. **Dev server cache** - Restart server

Try these in order:
1. Logout → Clear storage → Login again
2. Restart dev server
3. Check session in console

