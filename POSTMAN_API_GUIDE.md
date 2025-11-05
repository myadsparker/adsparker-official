# Postman API Testing Guide

## Webhook Setup API

### Create Webhook Endpoint

**Endpoint:** `POST /api/subscriptions/setup-webhook`

**Postman Setup:**
1. Method: `POST`
2. URL: `http://localhost:3000/api/subscriptions/setup-webhook`
3. Headers:
   - `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "webhook_url": "https://yourdomain.com/api/subscriptions/webhook"
   }
   ```
   Or leave body empty to use defaults:
   ```json
   {}
   ```

**Example Request:**
```json
{
  "webhook_url": "https://yourdomain.com/api/subscriptions/webhook",
  "enabled_events": [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed"
  ]
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Webhook endpoint created successfully",
  "endpoint": {
    "id": "we_xxxxxxxxxxxxx",
    "url": "https://yourdomain.com/api/subscriptions/webhook",
    "status": "enabled",
    "enabled_events": [...]
  },
  "signing_secret": "whsec_... or Check Stripe Dashboard for secret",
  "instructions": {
    "step1": "Go to Stripe Dashboard → Developers → Webhooks",
    "step2": "Find endpoint: we_xxxxxxxxxxxxx",
    "step3": "Click on the endpoint → Click 'Reveal' next to Signing secret",
    "step4": "Copy the signing secret (starts with whsec_)",
    "step5": "Add to .env.local: STRIPE_WEBHOOK_SECRET=whsec_..."
  }
}
```

### List Webhook Endpoints

**Endpoint:** `GET /api/subscriptions/setup-webhook`

**Postman Setup:**
1. Method: `GET`
2. URL: `http://localhost:3000/api/subscriptions/setup-webhook`
3. No headers or body needed

**Success Response:**
```json
{
  "total_endpoints": 2,
  "subscription_endpoints": [
    {
      "id": "we_xxxxxxxxxxxxx",
      "url": "https://yourdomain.com/api/subscriptions/webhook",
      "status": "enabled",
      "enabled_events": [...],
      "created": "2025-01-01T00:00:00.000Z"
    }
  ],
  "all_endpoints": [...],
  "note": "To get signing secret, go to Stripe Dashboard..."
}
```

### Delete Webhook Endpoint

**Endpoint:** `DELETE /api/subscriptions/setup-webhook`

**Postman Setup:**
1. Method: `DELETE`
2. URL: `http://localhost:3000/api/subscriptions/setup-webhook`
3. Headers:
   - `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "endpoint_id": "we_xxxxxxxxxxxxx"
   }
   ```

**Success Response:**
```json
{
  "success": true,
  "message": "Webhook endpoint deleted successfully",
  "endpoint": {
    "id": "we_xxxxxxxxxxxxx",
    "url": "https://yourdomain.com/api/subscriptions/webhook",
    "deleted": true
  }
}
```

## Common Postman Issues Fixed

### ✅ Empty Body Support
- You can send empty body `{}` or no body at all
- API will use defaults automatically

### ✅ Content-Type Header
- API checks for `Content-Type: application/json`
- If missing, uses defaults (for POST) or returns error (for DELETE)

### ✅ Error Handling
- Clear error messages for invalid requests
- Detailed error responses for debugging

## Testing Checklist

- [ ] Create webhook endpoint (POST with body)
- [ ] Create webhook endpoint (POST without body - uses defaults)
- [ ] List webhook endpoints (GET)
- [ ] Delete webhook endpoint (DELETE with endpoint_id)
- [ ] Test with invalid JSON body
- [ ] Test with missing Content-Type header

