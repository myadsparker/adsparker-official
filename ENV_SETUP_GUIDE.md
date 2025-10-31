# Environment Variables Setup Guide

## ⚠️ Error: Missing OpenAI API Key

The error you're seeing occurs because the `OPENAI_API_KEY` environment variable is not set.

## 🔧 How to Fix

### Step 1: Create `.env.local` file

In the root directory of your project (`E:\personal-work\adsparker-new-design\`), create a file named `.env.local`

### Step 2: Add your API keys

Add the following content to `.env.local`:

```env
# OpenAI API Key (Required)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google AI API Key (if using Gemini)
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Meta/Facebook API (if needed)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# Stripe (if needed)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# HERE Maps API Key (if needed)
HERE_API_KEY=your_here_api_key
```

### Step 3: Get your OpenAI API Key

1. Go to [OpenAI API Keys page](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-proj-` or `sk-`)
5. Paste it in your `.env.local` file after `OPENAI_API_KEY=`

### Step 4: Restart your development server

Stop your current dev server (Ctrl+C) and restart it:

```bash
npm run dev
```

## 📝 Important Notes

- `.env.local` should **NOT** be committed to git (it should already be in `.gitignore`)
- Never share your API keys publicly
- Each API key should be replaced with your actual keys
- The `.env.local` file will be automatically loaded by Next.js

## ✅ Verification

After setting up, you should see in your terminal:

- No more "Missing credentials" errors
- The OpenAI API will work properly

## 🔍 What I Fixed

I've improved the error handling in these files:

1. `src/app/api/ad-copy-gen/route.ts` - Now checks for API key and returns a helpful error message
2. `src/lib/opanai.ts` - Added error logging when API key is missing

Now when the API key is missing, you'll get a clear error message instead of a crash.

## 🚀 Vercel Deployment Setup

When deploying to Vercel, you need to add the environment variables in the Vercel dashboard:

### Step 1: Go to Project Settings

1. Open your project in Vercel
2. Go to **Settings** → **Environment Variables**

### Step 2: Add Each Variable

Add the following environment variables one by one:

| Variable Name               | Value                                              | Environment                      |
| --------------------------- | -------------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SITE_URL`      | Your site URL (e.g., https://adsparker.vercel.app) | Production, Preview, Development |
| `OPENAI_API_KEY`            | Your OpenAI API key (sk-proj-xxx)                  | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL`  | Your Supabase project URL                          | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key                     | Production, Preview, Development |
| `GOOGLE_AI_API_KEY`         | Your Google AI API key (if using)                  | Production, Preview, Development |
| `HERE_API_KEY`              | Your HERE Maps API key (if using)                  | Production, Preview, Development |

### Step 3: Important Notes for Vercel

⚠️ **Critical Settings:**

- Select **all three environments** (Production, Preview, Development) for each variable
- After adding variables, you must **redeploy** your application
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser (client-side)
- Other variables are only available server-side

### Step 4: Redeploy

After adding all environment variables:

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click the **"..."** menu → **Redeploy**
4. Select **"Use existing Build Cache"** or **"Redeploy without cache"**

### Quick Checklist for Deployment

- [ ] OPENAI_API_KEY is set in Vercel
- [ ] NEXT_PUBLIC_SUPABASE_URL is set in Vercel
- [ ] SUPABASE_SERVICE_ROLE_KEY is set in Vercel
- [ ] All variables are set for Production, Preview, and Development
- [ ] Redeployed after adding variables
- [ ] No errors in deployment logs

## 🐛 Common Deployment Errors

### Error: "Missing credentials. Please pass an `apiKey`"

**Solution:** Add `OPENAI_API_KEY` to Vercel environment variables and redeploy

### Error: "supabaseUrl is required"

**Solution:** Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables and redeploy

### Error: "Invalid API key"

**Solution:** Double-check that you copied the full API key correctly, including any prefix like `sk-proj-`

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Setup](https://supabase.com/docs)
- [Vercel Environment Variables Guide](https://vercel.com/docs/environment-variables)
