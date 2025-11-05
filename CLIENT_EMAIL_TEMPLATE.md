# Email Template for Client - Stripe Webhook Setup

## Simple Email You Can Send

**Subject:** Quick Setup Needed: Stripe Webhook Configuration

---

Hi [Client Name],

I need a quick favor to complete the payment subscription setup. It's very simple and takes about 5 minutes.

**What I Need:**
A webhook signing secret from your Stripe account. This allows the payment system to automatically update subscriptions when customers pay.

**Here's How to Do It:**

1. **Log into Stripe Dashboard**
   - Go to: https://dashboard.stripe.com
   - Sign in with your Stripe account

2. **Go to Webhooks**
   - Click "Developers" in the left menu
   - Click "Webhooks"

3. **Add Webhook Endpoint**
   - Click "Add endpoint" button
   - Enter this URL: `https://adsparker.com/api/subscriptions/webhook`
   - *(Replace with your actual domain if different)*

4. **Select Events**
   - Click "Select events"
   - Check these 6 events:
     - ✅ checkout.session.completed
     - ✅ customer.subscription.created
     - ✅ customer.subscription.updated
     - ✅ customer.subscription.deleted
     - ✅ invoice.payment_succeeded
     - ✅ invoice.payment_failed
   - Click "Add events"

5. **Save**
   - Click "Add endpoint"
   - Wait for it to create

6. **Get Signing Secret**
   - Click on your newly created webhook
   - Find "Signing secret" section
   - Click "Reveal" button
   - Copy the secret (starts with `whsec_...`)

7. **Send It to Me**
   - Just reply with: `STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx`
   - That's it!

**Visual Guide:**
I've attached a simple guide with screenshots if you need it.

**Questions?**
If you get stuck, just let me know and I can help!

Thanks,
[Your Name]

---

## Alternative: Even Simpler Version

If you want it even shorter:

---

**Subject:** Need 5 Minutes: Stripe Webhook Setup

Hi [Client Name],

Need a quick setup for the payment system. Takes 5 minutes:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://adsparker.com/api/subscriptions/webhook`
4. Select these 6 events (I can send exact list if needed)
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_...`)
7. Send it to me

That's it! Let me know if you need help.

Thanks!

---

## Is It Simple?

**Yes, it's very simple:**

✅ **5-7 steps** - Just clicking buttons  
✅ **No coding required** - All done in Stripe Dashboard  
✅ **Takes 5 minutes** - Very quick  
✅ **One-time setup** - Only need to do once  
✅ **Visual interface** - Easy to follow  

Most clients can do this easily. The Stripe Dashboard is user-friendly.

