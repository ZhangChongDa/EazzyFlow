# 🔧 Environment Variables Guide

## ✅ Correct .env Format

### Option 1: With Quotes (Recommended for values with special characters)

```env
VITE_SUPABASE_URL="https://uyvdhsswniwmcmeahofn.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_RESEND_API_KEY="re_b7trCzjX_9KhL5DzYyFQLpLk9Xqrxw16y"
```

### Option 2: Without Quotes (Works for simple values)

```env
VITE_SUPABASE_URL=https://uyvdhsswniwmcmeahofn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_RESEND_API_KEY=re_b7trCzjX_9KhL5DzYyFQLpLk9Xqrxw16y
```

## ⚠️ Important Issues Found

### Issue 1: VITE_SUPABASE_ANON_KEY Looks Incomplete

Your current value:
```
VITE_SUPABASE_ANON_KEY="sb_publishable_XbHWdEPF9gS35nUHTIhfdQ_Utq3lx3_"
```

**Problem:** This looks incomplete. Supabase anon keys are typically:
- Full JWT tokens starting with `eyJ`
- Much longer (usually 200+ characters)

**Solution:** 
1. Go to Supabase Dashboard → Project Settings → API
2. Copy the **anon/public** key (should start with `eyJ`)
3. It should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmRoc3N3bml3bWNtZWFob2ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NDE0NDgsImV4cCI6MjA4MjExNzQ0OH0.xxxxx`

### Issue 2: Quotes in .env

**For Vite projects:**
- Quotes are **optional** but **recommended** for values with special characters
- If you use quotes, they will be included in the value (usually not what you want)
- **Best practice:** Don't use quotes unless the value contains spaces or special characters

## ✅ Recommended .env Format

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://uyvdhsswniwmcmeahofn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmRoc3N3bml3bWNtZWFob2ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NDE0NDgsImV4cCI6MjA4MjExNzQ0OH0.YOUR_FULL_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmRoc3N3bml3bWNtZWFob2ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU0MTQ0OCwiZXhwIjoyMDgyMTE3NDQ4fQ.cihkNFsAAtPJruNarW5_bbLqthF5UJNhk08NasNAXuQ

# Resend API
VITE_RESEND_API_KEY=re_b7trCzjX_9KhL5DzYyFQLpLk9Xqrxw16y
```

## 🔍 How to Verify

### Check in Browser Console

After updating .env and restarting the server:

```javascript
// Check if variables are loaded
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

**Expected:**
- URL should be the full Supabase URL
- Anon Key should start with `eyJ` and be very long

### Check in Terminal

```bash
# Check if .env is loaded (in Node.js scripts)
node -e "require('dotenv').config(); console.log(process.env.VITE_SUPABASE_URL);"
```

## 🚨 Common Mistakes

1. **Using quotes that get included in value:**
   ```env
   # ❌ Wrong - quotes become part of the value
   VITE_SUPABASE_URL="https://..."
   
   # ✅ Correct
   VITE_SUPABASE_URL=https://...
   ```

2. **Incomplete keys:**
   ```env
   # ❌ Wrong - key is cut off
   VITE_SUPABASE_ANON_KEY="sb_publishable_XbHWd..."
   
   # ✅ Correct - full JWT token
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Extra spaces:**
   ```env
   # ❌ Wrong - spaces around =
   VITE_SUPABASE_URL = https://...
   
   # ✅ Correct - no spaces
   VITE_SUPABASE_URL=https://...
   ```

## 📝 Steps to Fix

1. **Get correct Anon Key:**
   - Supabase Dashboard → Project Settings → API
   - Copy the **anon/public** key (full JWT token)

2. **Update .env file:**
   ```env
   VITE_SUPABASE_URL=https://uyvdhsswniwmcmeahofn.supabase.co
   VITE_SUPABASE_ANON_KEY=<paste_full_jwt_token_here>
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmRoc3N3bml3bWNtZWFob2ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU0MTQ0OCwiZXhwIjoyMDgyMTE3NDQ4fQ.cihkNFsAAtPJruNarW5_bbLqthF5UJNhk08NasNAXuQ
   VITE_RESEND_API_KEY=re_b7trCzjX_9KhL5DzYyFQLpLk9Xqrxw16y
   ```

3. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

4. **Test in browser console:**
   ```javascript
   console.log('Anon Key length:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length);
   // Should be 200+ characters
   ```

