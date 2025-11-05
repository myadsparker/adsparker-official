# Client Instructions: Setting Up Stripe Webhook

## Simple Steps for Client

### Option 1: Manual Setup (Recommended for Non-Technical Users)

This is the easiest way - just a few clicks in Stripe Dashboard.

**Step 1: Log into Stripe**
1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Log in with your Stripe account credentials

**Step 2: Navigate to Webhooks**
1. Click on **"Developers"** in the left sidebar
2. Click on **"Webhooks"**

**Step 3: Add Webhook Endpoint**
1. Click the **"Add endpoint"** button (top right)
2. Enter your webhook URL:
   ```
   https://adsparker.com/api/subscriptions/webhook
   ```
   *(Replace `adsparker.com` with your actual domain if different)*

**Step 4: Select Events**
1. Click **"Select events"** 
2. Choose these events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
3. Click **"Add events"**

**Step 5: Save**
1. Click **"Add endpoint"** at the bottom
2. Wait for the page to load

**Step 6: Get Signing Secret**
1. Click on your newly created webhook endpoint
2. Find the **"Signing secret"** section
3. Click **"Reveal"** next to the signing secret
4. Copy the secret (it starts with `whsec_...`)

**Step 7: Share with Developer**
Send the signing secret to your developer:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## Option 2: Using API (For Technical Users)

If your client prefers automation, they can use the API:

**Postman Setup:**
1. Method: `POST`
2. URL: `https://adsparker.com/api/subscriptions/setup-webhook`
3. Headers:
   - `Content-Type: application/json`
4. Body:
   ```json
   {
     "webhook_url": "https://adsparker.com/api/subscriptions/webhook"
   }
   ```

**Then follow Step 6-7 above** to get the signing secret.

---

## What the Client Needs to Provide

After setup, the client needs to share:

1. **Webhook Signing Secret** (from Step 6 above)
   - Format: `whsec_xxxxxxxxxxxxx`
   - This will be added to environment variables

2. **Confirmation** that webhook is active
   - Status should show "Enabled" in Stripe Dashboard

---

## Time Required

- **Manual Setup**: ~3-5 minutes
- **API Setup**: ~2 minutes (if technical)

---

## Troubleshooting

**"Webhook URL must be publicly accessible"**
- Make sure your app is deployed and accessible
- Test the URL: `https://yourdomain.com/api/subscriptions/webhook`
- Should return an error (not 404) - that means it's accessible

**"Can't find Signing secret"**
- Make sure you clicked on the webhook endpoint
- Look for "Signing secret" section (usually at the top)
- Click "Reveal" button

**"Webhook not receiving events"**
- Check webhook status in Stripe Dashboard
- Make sure it's "Enabled" (green)
- Check webhook logs for errors

---

## Summary

✅ **Manual Setup is Simple** - Just 7 steps, takes 5 minutes  
✅ **No Technical Knowledge Required** - Just follow the steps  
✅ **One-Time Setup** - Only needs to be done once  
✅ **Easy to Verify** - Can see webhook status in dashboard  

The client can do this easily! Just share this guide with them.

