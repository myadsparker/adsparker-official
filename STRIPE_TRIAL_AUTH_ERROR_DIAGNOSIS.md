# Stripe Free Trial Authentication Error - Diagnosis & Fix

## 🔍 What's Happening

When you click "Start Free Trial", here's the flow:
1. Your app creates a Stripe Checkout Session with `mode: 'subscription'` and `trial_period_days: 7`
2. Stripe redirects the user to enter card details
3. **Stripe attempts to authenticate the payment method for future billing** (after trial ends)
4. This authentication is failing with: "We are unable to authenticate your payment method"

**Key Point**: Even though it's a free trial (no charge now), Stripe must validate the card will work for billing after the trial ends. This requires payment method authentication.

## 🚨 Most Common Causes (In Order of Likelihood)

### 1. **Test Mode vs Live Mode Mismatch** ⭐ (MOST LIKELY)
**Problem**: Using test cards with live mode keys, or real cards with test mode keys.

**Check**:
- Go to Stripe Dashboard → top-left corner
- Look for "Test Mode" toggle
- If testing: Must use **Test Mode** + Test cards
- If production: Must use **Live Mode** + Real cards

**Test Cards for Test Mode**:
- `4242 4242 4242 4242` - Works without 3DS
- `4000 0025 0000 3155` - Triggers 3DS authentication
- Any future expiry date, any 3-digit CVC

**Solution**:
```env
# For TEST MODE:
STRIPE_SECRET_KEY=sk_test_51...

# For LIVE MODE:
STRIPE_SECRET_KEY=sk_live_51...
```

### 2. **Stripe Account Not Fully Activated** ⭐
**Problem**: Your Stripe account is in restricted mode or needs verification.

**Check**:
- Go to Stripe Dashboard → Home
- Look for any banners/alerts about "Activate your account" or "Complete verification"
- Check Dashboard → Settings → Business settings

**Common Issues**:
- Business information incomplete
- Identity verification pending
- Payment methods not enabled

**Solution**:
- Complete all required information in Stripe Dashboard
- Verify your identity
- Enable payment methods (Dashboard → Settings → Payment methods)

### 3. **Stripe Radar Blocking Payments** ⭐
**Problem**: Fraud prevention rules are too aggressive.

**Check**:
- Go to Stripe Dashboard → Radar → Rules
- Look for rules set to "Block" mode
- Check if any rules are blocking trial signups

**Solution**:
- Temporarily lower Radar sensitivity for testing
- Add exception for your test IP address
- Review and adjust rules in Radar settings

### 4. **Missing or Invalid Price ID**
**Problem**: The monthly price ($199/month) doesn't exist in Stripe.

**Check**:
- Go to Stripe Dashboard → Products → Prices
- Look for a price with:
  - Recurring: Monthly
  - Amount: $199.00 USD
  - Status: Active

**Solution**:
Run the setup endpoint to create products:
```bash
POST /api/subscriptions/setup-stripe
```

### 5. **Bank/Card Declining Authorization**
**Problem**: The card issuer is declining the authorization hold for future payment.

**This happens when**:
- Card doesn't support recurring payments
- Card has insufficient credit limit
- Bank blocks online transactions
- Bank requires 3DS but authentication fails

**Solution**:
- Try a different card
- Contact the card issuer
- For testing: Use Stripe test cards

### 6. **Browser/Network Issues**
**Problem**: 3DS popup blocked or network issues.

**Check**:
- Popup blocker enabled?
- Using VPN?
- Browser extensions blocking authentication?

**Solution**:
- Disable popup blocker
- Turn off VPN
- Try incognito/private mode
- Try different browser

## 📝 Step-by-Step Diagnostic Process

### Step 1: Check Stripe Dashboard Logs (MOST IMPORTANT)
1. Go to **Stripe Dashboard → Developers → Logs**
2. Find the most recent failed payment attempt
3. Look for error code and message

**Common Error Codes**:
- `authentication_required` - 3DS authentication failed
- `card_declined` - Card issuer declined
- `testmode_charges_only` - Using real card in test mode
- `livemode_test_card` - Using test card in live mode
- `invalid_request_error` - Configuration error

### Step 2: Verify Test vs Live Mode
1. **Check your `.env` or environment variables**:
   ```bash
   # Look for:
   STRIPE_SECRET_KEY=sk_test_... (test mode)
   # OR
   STRIPE_SECRET_KEY=sk_live_... (live mode)
   ```

2. **Match the mode**:
   - If `sk_test_`: Use test cards (4242 4242 4242 4242)
   - If `sk_live_`: Use real cards + account must be activated

### Step 3: Test with Stripe Test Card
**If in test mode**, try this card:
- **Card Number**: `4242 4242 4242 4242`
- **Expiry**: Any future date (e.g., 12/25)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

This card should work without 3DS authentication.

### Step 4: Check Account Activation
1. Go to **Stripe Dashboard → Home**
2. Look for any warnings or action items
3. Go to **Settings → Business settings**
4. Ensure all information is complete

### Step 5: Review Radar Rules
1. Go to **Stripe Dashboard → Radar → Rules**
2. Check if any rules are set to "Block"
3. Temporarily disable aggressive rules for testing

### Step 6: Verify Products Exist
1. Go to **Stripe Dashboard → Products**
2. Look for "AdSparker Monthly Plan"
3. Click on it → Check if there's an active price for $199/month
4. If missing, run: `POST /api/subscriptions/setup-stripe`

## 🛠️ Quick Fixes to Try

### Fix 1: Switch to Test Mode (For Testing)
1. In Stripe Dashboard, toggle to "Test mode"
2. Update your environment variable:
   ```env
   STRIPE_SECRET_KEY=sk_test_51xxxxx...
   ```
3. Restart your application
4. Try with test card: `4242 4242 4242 4242`

### Fix 2: Create Test Customer Session
Run this command to test the API directly:
```bash
curl -X POST http://your-domain.com/api/subscriptions/checkout \
  -H "Content-Type: application/json" \
  -d '{"planType": "free_trial", "projectId": "test-project"}'
```

Check the response for any errors.

### Fix 3: Check Console Logs
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any JavaScript errors
4. Check Network tab for failed API calls

## 📊 What to Check in Stripe Dashboard

### Checklist:
- [ ] **Mode**: Test mode enabled (top-left toggle)
- [ ] **Logs**: Check Developers → Logs for error codes
- [ ] **Products**: AdSparker Monthly Plan exists with $199/month price
- [ ] **Account**: Fully activated (no warnings on home page)
- [ ] **Radar**: No overly aggressive blocking rules
- [ ] **Payment Methods**: Cards enabled (Settings → Payment methods)
- [ ] **API Keys**: Using correct key for test/live mode
- [ ] **Webhooks**: Endpoint active (Developers → Webhooks)

## 🎯 Expected Behavior (Correct Flow)

### Test Mode:
1. User clicks "Start Free Trial"
2. Redirected to Stripe Checkout
3. Enters test card: `4242 4242 4242 4242`
4. No 3DS popup (test card doesn't require it)
5. Redirected back with success
6. Subscription created with 7-day trial

### Live Mode:
1. User clicks "Start Free Trial"
2. Redirected to Stripe Checkout
3. Enters real card details
4. **3DS popup appears** (if card requires it)
5. User completes bank authentication (OTP/app confirmation)
6. Redirected back with success
7. Subscription created with 7-day trial

## 🔧 Code Changes Made

✅ **Fixed API Version**: Changed from invalid `'2025-08-27.basil'` to `'2024-06-20'`

✅ **Removed Invalid Parameter**: Removed `payment_method_options` (only for Payment Intents, not Checkout Sessions)

✅ **Improved Trial Configuration**: Added `payment_method_collection: 'always'` for free trials

## 📞 Next Steps

### Immediate Actions:
1. **Check Stripe Dashboard → Developers → Logs** (30 seconds)
   - Find the exact error code
   - Share it for specific solution

2. **Verify Test Mode** (30 seconds)
   - Check your environment variable
   - Ensure using test cards with test mode

3. **Test with `4242 4242 4242 4242`** (1 minute)
   - If this works: Card issue
   - If this fails: Configuration issue

### If Still Failing:
**Share these details**:
1. Error code from Stripe Logs
2. Are you using Test Mode or Live Mode?
3. What card are you testing with?
4. Screenshot of the error (if possible)

## 🆘 Emergency Contact

If all else fails:
1. **Stripe Support**: https://support.stripe.com/
2. **Provide**: Payment Intent ID or Checkout Session ID from logs
3. **Ask**: "Why is payment method authentication failing for subscription with trial?"

## ✅ Most Likely Solution

**90% of the time, it's one of these**:
1. **Test/Live Mode Mismatch**: Fix your `STRIPE_SECRET_KEY`
2. **Account Not Activated**: Complete Stripe account setup
3. **Radar Blocking**: Adjust fraud rules

Check these three first! 🎯

