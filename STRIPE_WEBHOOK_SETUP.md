# Stripe Webhook Setup Guide

## Overview

The webhook handler automatically updates your database when billing events occur in Stripe. This ensures your subscription data stays in sync with Stripe.

## What Events Are Handled

The webhook handles these Stripe events:

1. **`checkout.session.completed`** - When checkout is successful
   - Updates subscription with payment info
   - Marks card as added
   - Sets subscription status to active

2. **`customer.subscription.created`** - When subscription is created
   - Updates subscription status
   - Sets trial dates

3. **`customer.subscription.updated`** - When subscription status changes
   - Updates subscription status (active, cancelled, expired)
   - Updates trial end dates
   - Updates cancellation dates

4. **`customer.subscription.deleted`** - When subscription is cancelled
   - Sets status to 'cancelled'
   - Sets cancelled_at timestamp
   - Disables auto_renew

5. **`invoice.payment_succeeded`** - When payment succeeds
   - Updates subscription to active if it was expired
   - Updates end date based on invoice period

6. **`invoice.payment_failed`** - When payment fails
   - Sets subscription status to 'expired'
   - Logs payment failure

## Setup Instructions

### Option 1: Create Webhook via API (Recommended)

You can create the webhook endpoint programmatically using our API:

**Step 1: Create Webhook Endpoint**
```bash
# Using curl
curl -X POST http://localhost:3000/api/subscriptions/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://yourdomain.com/api/subscriptions/webhook"
  }'
```

Or using fetch in browser console:
```javascript
fetch('/api/subscriptions/setup-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    webhook_url: 'https://yourdomain.com/api/subscriptions/webhook'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Step 2: Get Signing Secret**
After creating the webhook:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks**
3. Find your newly created endpoint
4. Click on it → Click **"Reveal"** next to Signing secret
5. Copy the secret (starts with `whsec_...`)

**Step 3: Add to Environment Variables**
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Option 2: Create Webhook via Stripe Dashboard (Manual)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks**
3. Click **"Add endpoint"**
4. Enter your webhook URL:
   ```
   https://yourdomain.com/api/subscriptions/webhook
   ```
   For local development (using Stripe CLI):
   ```
   http://localhost:3000/api/subscriptions/webhook
   ```
5. Select events to listen to:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
6. Click **"Add endpoint"**
7. Copy the **Signing secret** (starts with `whsec_...`)

### Step 2: Add to Environment Variables

Add the webhook secret to your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## API Endpoints for Webhook Management

### Create Webhook Endpoint
```
POST /api/subscriptions/setup-webhook
Body: {
  "webhook_url": "https://yourdomain.com/api/subscriptions/webhook" (optional, uses default if not provided)
  "enabled_events": [...] (optional, uses default events if not provided)
}
```

### List Webhook Endpoints
```
GET /api/subscriptions/setup-webhook
Returns: List of all webhook endpoints
```

### Delete Webhook Endpoint
```
DELETE /api/subscriptions/setup-webhook
Body: {
  "endpoint_id": "we_xxxxxxxxxxxxx"
}
```

### Step 3: Test Locally (Optional)

For local development, use Stripe CLI:

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: Download from https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/subscriptions/webhook

# Copy the webhook signing secret from the output
# It will look like: whsec_xxxxxxxxxxxxx
```

### Step 4: Update Production Environment

When deploying to production:

1. Add `STRIPE_WEBHOOK_SECRET` to your production environment variables
2. Update the webhook URL in Stripe Dashboard to your production URL
3. Test the webhook by completing a test checkout

## How It Works

### Flow Diagram

```
User completes checkout
        ↓
Stripe sends webhook event
        ↓
Webhook handler receives event
        ↓
Verifies signature (security)
        ↓
Updates subscription in Supabase
        ↓
Database stays in sync ✅
```

### Security

- ✅ **Signature Verification**: Every webhook is verified using Stripe's signature
- ✅ **Idempotent**: Handles duplicate events safely
- ✅ **Error Handling**: Logs errors without breaking the flow

### Database Updates

The webhook automatically updates these fields in your `subscriptions` table:

- `status` - Based on Stripe subscription status
- `card_added` - Set to true when payment succeeds
- `payment_provider_customer_id` - Stripe customer ID
- `payment_provider_subscription_id` - Stripe subscription ID
- `trial_end_date` - Updated from Stripe subscription
- `end_date` - Updated based on billing period
- `cancelled_at` - Set when subscription is cancelled
- `auto_renew` - Disabled when subscription is cancelled

## Fallback Behavior

The existing `/api/subscriptions/verify-session` endpoint still works as a fallback:

- If webhook fails or is delayed, verify-session still updates the subscription
- Both methods update the same database fields
- No conflicts or duplicate updates

## Testing

### Test Webhook Events

1. **Test checkout completion**:
   - Complete a test checkout
   - Check webhook logs in Stripe Dashboard
   - Verify subscription in database

2. **Test payment succeeded**:
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete checkout
   - Verify subscription is active

3. **Test payment failed**:
   - Use test card: `4000 0000 0000 0002` (declines)
   - Verify subscription status is 'expired'

4. **Test subscription cancellation**:
   - Cancel subscription in Stripe Dashboard
   - Verify subscription status is 'cancelled' in database

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is correct in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
3. Check webhook logs in Stripe Dashboard for errors
4. Verify webhook endpoint is accessible (not behind firewall)

### Signature Verification Failed

- Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- Check that the raw request body is used (not parsed JSON)
- Verify webhook URL matches exactly

### Subscription Not Updating

- Check webhook logs in Stripe Dashboard
- Verify subscription exists in database with correct `payment_provider_subscription_id`
- Check server logs for errors
- Verify-session endpoint will still update as fallback

## Benefits

✅ **Automatic Sync**: Database stays updated with Stripe  
✅ **Real-time Updates**: Changes reflect immediately  
✅ **Reliable**: Handles all billing events automatically  
✅ **No Breaking Changes**: Existing functionality still works  
✅ **Secure**: Signature verification ensures authenticity  

