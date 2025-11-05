# Stripe Authentication Error Fix Guide

## ✅ Code Changes Made

1. **Fixed API Version**: Changed from invalid `'2025-08-27.basil'` to `'2024-06-20'`
2. **Removed Invalid Parameter**: Removed `payment_method_options` from Checkout Sessions (this parameter is only for Payment Intents, not Checkout Sessions)
3. **Fixed Free Trial Logic**: Corrected subscription mode configuration

## 🔍 Stripe Dashboard Checks Required

### 1. **Check Test vs Live Mode**
- **Location**: Stripe Dashboard → Settings → API Keys
- **Action**: 
  - If testing with test cards, ensure you're using **Test mode** keys (`sk_test_...`)
  - If using real cards, ensure you're using **Live mode** keys (`sk_live_...`)
  - **Important**: Test cards only work in test mode, real cards only work in live mode

### 2. **Review Payment Method Settings**
- **Location**: Stripe Dashboard → Settings → Payment methods
- **Action**:
  - Ensure "Cards" is enabled
  - Check if there are any restrictions on card types
  - Verify that your Stripe account is fully activated (not in restricted mode)

### 3. **Check Stripe Radar Rules**
- **Location**: Stripe Dashboard → Radar → Rules
- **Action**:
  - Review any active fraud rules that might be blocking payments
  - Check if Radar is set to "Block" mode (might be too strict)
  - Consider temporarily lowering Radar sensitivity for testing

### 4. **Review Failed Payment Logs**
- **Location**: Stripe Dashboard → Developers → Logs
- **Action**:
  - Find the failed payment attempt
  - Look for:
     - **Error code** (e.g., `authentication_required`, `card_declined`)
     - **Decline reason** (if any)
     - **3D Secure status**
     - **Payment intent details**

### 5. **Check Account Status**
- **Location**: Stripe Dashboard → Settings → Account
- **Action**:
  - Verify your account is fully activated
  - Check if there are any verification requirements
  - Ensure business information is complete

### 6. **Verify Webhook Configuration**
- **Location**: Stripe Dashboard → Developers → Webhooks
- **Action**:
  - Ensure webhook endpoint is active
  - Check webhook events are being received
  - Verify webhook signing secret matches your `.env` file

### 7. **Check 3D Secure Settings**
- **Location**: Stripe Dashboard → Settings → Payment methods → Cards
- **Action**:
  - Verify 3D Secure is enabled (it should be by default)
  - Check if there are any specific 3DS requirements or restrictions

## 🧪 Testing Steps

### Test with Stripe Test Cards

1. **Use 3D Secure Test Card**:
   - Card Number: `4000 0025 0000 3155`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - This card will trigger 3D Secure authentication

2. **Use Regular Test Card**:
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - This card should work without 3DS

3. **Test Declined Card** (to verify error handling):
   - Card Number: `4000 0000 0000 0002`
   - This should be declined

### Test in Browser

1. **Clear Browser Cache**: Authentication flows can be cached
2. **Try Incognito/Private Mode**: To rule out extension interference
3. **Disable VPN**: If you're using one
4. **Try Different Browser**: To rule out browser-specific issues

## 🔧 Additional Configuration (If Needed)

### If Using Test Mode:
- Ensure `STRIPE_SECRET_KEY` starts with `sk_test_`
- Use test cards from Stripe documentation

### If Using Live Mode:
- Ensure `STRIPE_SECRET_KEY` starts with `sk_live_`
- Account must be fully activated
- Business information must be complete

## 📝 Common Issues and Solutions

### Issue 1: "Card declined" or "Authentication required"
**Solution**: 
- Check Stripe Dashboard → Logs for specific error
- Verify you're using correct mode (test/live)
- Check if card supports online transactions

### Issue 2: 3D Secure popup not appearing
**Solution**:
- Check browser popup blocker settings
- Ensure browser allows redirects
- Try different browser

### Issue 3: Payment succeeds but subscription not updating
**Solution**:
- Check webhook configuration
- Verify webhook endpoint is accessible
- Check webhook logs in Stripe Dashboard

## 🚨 Next Steps

1. **Check Stripe Dashboard Logs**:
   - Go to Stripe Dashboard → Developers → Logs
   - Find the failed payment attempt
   - Note the exact error code and message
   - Share this information for further debugging

2. **Test with Stripe Test Cards**:
   - Use the test card `4242 4242 4242 4242`
   - See if the error still occurs

3. **Verify Environment Variables**:
   ```bash
   # Check your .env file has:
   STRIPE_SECRET_KEY=sk_test_... or sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Check Network/Server Logs**:
   - Review your application server logs
   - Look for any errors during checkout session creation
   - Check if the session is being created successfully

## 📞 If Issue Persists

If the error continues after checking all above:

1. **Contact Stripe Support**:
   - Provide the payment intent ID or checkout session ID
   - Share the error code from logs
   - Explain the steps you've taken

2. **Check Stripe Status Page**:
   - Visit https://status.stripe.com/
   - Ensure Stripe services are operational

3. **Review Recent Changes**:
   - Check if anything changed in your Stripe account recently
   - Review any new rules or settings added

## ✅ Verification Checklist

- [ ] Code changes deployed (API version fixed, invalid parameter removed)
- [ ] Stripe Dashboard → Logs reviewed for specific error
- [ ] Test mode vs Live mode verified
- [ ] Test card used to verify behavior
- [ ] Browser cache cleared
- [ ] Stripe Radar rules reviewed
- [ ] Account status verified (fully activated)
- [ ] Webhook endpoint active and receiving events
- [ ] Environment variables correct (STRIPE_SECRET_KEY format)

