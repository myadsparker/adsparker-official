# Stripe Setup Guide - Information Needed from Client

## What You Need from Stripe

To complete the subscription integration, you need the following **Stripe Price IDs**:

1. **STRIPE_MONTHLY_PRICE_ID** - For the $199/month subscription
2. **STRIPE_ANNUAL_PRICE_ID** - For the $109/month (annual billing) subscription
3. **STRIPE_SECRET_KEY** - Your Stripe API secret key

## Option 1: Client Creates Stripe Products (Recommended)

If your client has access to Stripe, they should:

### Step 1: Create Monthly Subscription Product
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Products** → Click **"Add product"**
3. Fill in:
   - **Name**: "Monthly Plan" or "AdSparker Monthly"
   - **Description**: "Monthly subscription at $199/month"
   - **Pricing model**: Select **"Recurring"**
   - **Price**: $199.00
   - **Billing period**: Monthly
   - **Currency**: USD
4. Click **"Save product"**
5. Copy the **Price ID** (starts with `price_...`)

### Step 2: Create Annual Subscription Product
1. Click **"Add product"** again
2. Fill in:
   - **Name**: "Annual Plan" or "AdSparker Annual"
   - **Description**: "Annual subscription at $109/month (billed annually)"
   - **Pricing model**: Select **"Recurring"**
   - **Price**: $1,308.00 (or $109/month × 12)
   - **Billing period**: Yearly/Annual
   - **Currency**: USD
3. Click **"Save product"**
4. Copy the **Price ID** (starts with `price_...`)

### Step 3: Get API Keys
1. Go to **Developers** → **API keys**
2. Copy the **Secret key** (starts with `sk_test_...` for test mode or `sk_live_...` for production)

### Information to Request from Client

Send this template to your client:

---

## 📧 Email Template to Client

**Subject: Stripe Setup Required for Subscription Feature**

Hi [Client Name],

I've implemented the subscription payment system for AdSparker. To complete the integration, I need some information from your Stripe account.

**Please provide the following:**

1. **Stripe Secret Key** (from Developers → API keys)
   - Test mode key: `sk_test_...`
   - Production key: `sk_live_...` (when ready for production)

2. **Monthly Plan Price ID**
   - Product: $199/month subscription
   - Price ID format: `price_xxxxxxxxxxxxx`

3. **Annual Plan Price ID**
   - Product: $109/month (billed annually at $1,308)
   - Price ID format: `price_xxxxxxxxxxxxx`

**How to get these:**
- If you already have Stripe products set up, just share the Price IDs
- If not, I can guide you through creating them (takes ~5 minutes)
- Or I can create a test Stripe account for development

**Security Note:**
- Test mode keys are safe to share for development
- Production keys should only be shared securely when ready for launch

Let me know if you need help setting up the Stripe products, or if you'd prefer I create a test account for development purposes.

Best regards,
[Your Name]

---

## Option 2: Create Test Stripe Account (For Development)

If the client doesn't have Stripe yet or can't provide access:

1. **Create a test Stripe account** at https://dashboard.stripe.com/register
2. **Create test products** (same steps as above)
3. **Use test mode keys** for development
4. **Client can create production account** later when ready to launch

### Test Mode vs Production Mode

- **Test Mode**: Use `sk_test_...` keys
  - No real charges
  - Use test card: `4242 4242 4242 4242`
  - Perfect for development and testing

- **Production Mode**: Use `sk_live_...` keys
  - Real charges
  - Requires real payment methods
  - Use only when ready to launch

---

## Quick Setup Checklist

- [ ] Client has Stripe account (or create test account)
- [ ] Monthly product created ($199/month)
- [ ] Annual product created ($1,308/year)
- [ ] Price IDs copied (both start with `price_`)
- [ ] API secret key copied (starts with `sk_`)
- [ ] Added to `.env.local` file:
  ```env
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_MONTHLY_PRICE_ID=price_...
  STRIPE_ANNUAL_PRICE_ID=price_...
  ```

---

## Alternative: Use Demo Mode (For Testing Without Stripe)

If you want to test the flow without real Stripe setup, you can temporarily modify the checkout route to return a demo checkout URL. However, this is only for development - you'll need real Stripe integration for production.

---

## Need Help?

If the client needs help:
1. Share screen/guide them through Stripe dashboard
2. Create test account together
3. Use Stripe's test mode cards for testing: https://stripe.com/docs/testing

