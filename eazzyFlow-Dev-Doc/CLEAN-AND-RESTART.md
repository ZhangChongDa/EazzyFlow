# 🧹 Clean and Restart Guide

## ✅ Recommended: Clean Cache Before Restart

Yes, it's a good idea to clean the cache, especially after changing environment variables!

## 🚀 Quick Clean (Recommended)

```bash
npm run clean
```

This will:
- ✅ Remove Vite cache (`node_modules/.vite`)
- ✅ Remove build output (`dist`)
- ✅ Remove TypeScript build info

## 🔄 Full Clean (If Quick Clean Doesn't Work)

```bash
npm run clean:all
```

This will:
- ✅ Remove Vite cache
- ✅ Remove build output
- ✅ Remove TypeScript build info
- ✅ Remove `node_modules` and reinstall

**Note:** This takes longer but ensures a completely fresh start.

## 📋 Complete Restart Process

### Step 1: Clean Cache

```bash
npm run clean
```

### Step 2: Verify Environment Variables

```bash
npm run verify:env
```

Should show all ✅ green checks.

### Step 3: Restart Dev Server

```bash
npm run dev
```

### Step 4: Clear Browser Cache

1. Open Browser DevTools (F12)
2. Go to **Application** tab → **Storage**
3. Clear:
   - Local Storage (delete `supabase.*` entries)
   - Session Storage
   - Cookies
4. Close and reopen browser tab

### Step 5: Login and Test

1. Login with your credentials
2. Check browser console for errors
3. Verify data loads correctly

## 🔍 Why Clean is Important

Vite caches:
- Environment variables
- Module resolutions
- Build artifacts

After changing `.env` file, the cache might still have old values. Cleaning ensures fresh values are loaded.

## 🎯 When to Clean

Clean cache when:
- ✅ Changed `.env` file
- ✅ Updated dependencies
- ✅ Experiencing strange errors
- ✅ After updating Supabase keys
- ✅ After changing Vite configuration

## 📝 Available Commands

- `npm run clean` - Quick clean (removes cache and build files)
- `npm run clean:all` - Full clean (also removes node_modules)
- `npm run verify:env` - Verify environment variables
- `npm run dev` - Start development server

