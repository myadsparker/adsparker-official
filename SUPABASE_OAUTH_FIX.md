# Fix OAuth Redirecting to Localhost

## 🚨 The Problem

OAuth is redirecting to `http://localhost:3000` instead of your production domain.

**Why?** The **initial redirect from Google back to Supabase** is controlled by Supabase's **Site URL** setting in the dashboard, not your code. You need to configure this in the Supabase dashboard.

---

## ✅ Solution: Update Supabase Dashboard

### Step 1: Go to Supabase Dashboard

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **ghsgnjzkgygiqmhjvtpi**
3. Go to: **Settings** → **Authentication** (left sidebar)
4. Click on **URL Configuration** tab

### Step 2: Update Site URL

Find the **Site URL** field and change it:

**FROM:**

```
http://localhost:3000
```

**TO:**

```
https://adsparker.com
```

### Step 3: Update Redirect URLs

In the **Redirect URLs** section, make sure these URLs are added (one per line):

```
https://adsparker.com/**
https://adsparker.com/login-callback
https://adsparker.com/signup-callback
https://adsparker.com/updatepassword
http://localhost:3000/**
http://localhost:3000/login-callback
http://localhost:3000/signup-callback
```

**Note:** The `**` wildcard allows any path under that domain.

### Step 4: Save Changes

Click **Save** at the bottom of the page.

---

## 🎯 Update Google OAuth Console

You also need to configure Google OAuth to allow redirects from Supabase:

### Step 1: Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to: **APIs & Services** → **Credentials**

### Step 2: Edit OAuth 2.0 Client ID

1. Find your OAuth 2.0 Client ID (the one you're using for Supabase)
2. Click the **Edit** button (pencil icon)

### Step 3: Add Authorized Redirect URI

Under **Authorized redirect URIs**, add:

```
https://ghsgnjzkgygiqmhjvtpi.supabase.co/auth/v1/callback
```

This is the Supabase callback URL that Google redirects to.

### Step 4: Save Changes

Click **Save** at the bottom.

---

## 🧪 Test the Fix

### Step 1: Restart Dev Server

```bash
# Stop your dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 2: Clear Browser Cache

1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select **Empty Cache and Hard Reload**

Or use Incognito/Private window for testing.

### Step 3: Test OAuth Login

1. Go to your login page: `http://localhost:3000/login`
2. Click **Google** login button
3. After authentication, check the URL

**Expected Result:**

```
https://adsparker.com/login-callback#access_token=...
```

**NOT:**

```
http://localhost:3000/#access_token=...
```

---

## 📋 Checklist

Before testing, make sure:

- [ ] Supabase **Site URL** is set to `https://adsparker.com`
- [ ] Supabase **Redirect URLs** include `https://adsparker.com/**`
- [ ] Google OAuth has `https://ghsgnjzkgygiqmhjvtpi.supabase.co/auth/v1/callback`
- [ ] Dev server restarted
- [ ] Browser cache cleared

---

## 🔍 Why This Happens

### The OAuth Flow:

1. **User clicks "Login with Google"** on your site
2. **Browser redirects to Google** with OAuth request
3. **Google authenticates** the user
4. **Google redirects back to Supabase** using the URL from **Supabase's Site URL** setting
5. **Supabase processes** the OAuth callback
6. **Supabase redirects to your app** using the `redirectTo` parameter you specified

**The issue was at step 4:** Supabase's Site URL was set to localhost, so Google redirected to localhost instead of adsparker.com.

---

## 🆘 Troubleshooting

### Issue 1: Still redirecting to localhost after changes

**Solution:**

- Clear browser cache completely
- Try in Incognito/Private window
- Make sure you saved the Supabase dashboard changes
- Wait 1-2 minutes for changes to propagate

### Issue 2: "Redirect URI mismatch" error

**Possible causes:**

1. Google OAuth console doesn't have the Supabase callback URL
2. Supabase redirect URLs don't include your domain

**Solution:**

- Double-check Google OAuth console has: `https://ghsgnjzkgygiqmhjvtpi.supabase.co/auth/v1/callback`
- Double-check Supabase has: `https://adsparker.com/**`

### Issue 3: "Invalid redirect URL" error from Supabase

**Cause:** The redirect URL is not whitelisted in Supabase

**Solution:**

- Add `https://adsparker.com/**` to Supabase Redirect URLs
- Make sure there are no typos
- Save and wait a few seconds

---

## 📝 Code Configuration

The app now uses `NEXT_PUBLIC_SITE_URL` environment variable for OAuth redirects:

**Login/Signup/Forgot Password:**

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://adsparker.com';
const redirectTo = `${siteUrl}/login-callback`;
```

**Environment Variable:**
Add to your `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=https://adsparker.com
```

**For Vercel:** Add this in Settings → Environment Variables

---

## ✨ Summary

The fix requires **configuration in two places**:

1. **Supabase Dashboard:**
   - **Site URL** must be `https://adsparker.com`
   - **Redirect URLs** must include your domain

2. **Environment Variables:**
   - **NEXT_PUBLIC_SITE_URL** must be set in `.env.local` and Vercel

3. **Google OAuth Console:**
   - Must allow Supabase callback URL

After these changes, OAuth will properly redirect to your production domain instead of localhost! 🎉
