# Meta Ads Publishing Guide

## Overview

This guide explains how to publish ad campaigns and ad sets to Meta (Facebook) after a successful Stripe checkout. The system automatically publishes your generated ad sets to your connected Meta ad account.

---

## Complete Flow

```
User Journey:
1. User connects Meta account (OAuth)
2. User completes Stripe checkout (subscription activation)
3. User clicks "Publish Ads" button on plan page
4. System creates campaign and ad sets on Meta
5. Ads are created in PAUSED status for safety
6. User can activate ads in Meta Ads Manager
```

---

## Architecture

### Database Schema

#### User Profiles Table
Stores Meta access tokens for authenticated API calls:

```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id),
  meta_accounts JSONB DEFAULT '[]',
  meta_connected BOOLEAN DEFAULT FALSE,
  ...
);
```

**Meta Account Structure (JSONB):**
```json
[
  {
    "access_token": "EAAxxxx...",
    "profile": {
      "id": "123456789",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "ad_accounts": [
      {
        "id": "act_123456",
        "name": "My Ad Account",
        "account_status": 1
      }
    ],
    "connected_at": "2025-11-05T12:00:00Z"
  }
]
```

#### Projects Table
Stores generated ad sets and campaign references:

```sql
ALTER TABLE projects 
ADD COLUMN meta_campaign_id TEXT,
ADD COLUMN meta_campaign_name TEXT,
ADD COLUMN ad_set_proposals JSONB;
```

#### Published Ads Table
Tracks all published ads for usage limits:

```sql
CREATE TABLE public.published_ads (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID,
  campaign_name TEXT,
  ad_set_id TEXT,
  ad_account_id TEXT,
  daily_budget DECIMAL(10, 2),
  status TEXT CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
  metadata JSONB,
  ...
);
```

---

## API Endpoints

### 1. Publish Complete Campaign + Ad Sets

**Endpoint:** `POST /api/meta/publish-ads`

**Purpose:** Creates both campaign and all ad sets in one request

**Request Body:**
```typescript
{
  projectId: string;
  campaignName: string;
  adSets: Array<{
    ad_set_title: string;
    age_range: { min: number; max: number };
    genders: string[];
    audience_tags: string[];
    targeting: {
      GeoLocations: { Countries: string[] };
      FlexibleSpec: Array<{
        interests: Array<{ id: string; name: string }>;
      }>;
    };
    daily_budget?: number;
  }>;
  adAccountId: string;
  dailyBudget: number;
  objective?: string; // default: 'OUTCOME_TRAFFIC'
  specialAdCategories?: string[];
}
```

**Response:**
```typescript
{
  success: boolean;
  campaign: {
    id: string;
    name: string;
    status: 'PAUSED';
  };
  adSets: Array<{
    id: string;
    name: string;
    daily_budget: number;
    status: 'PAUSED';
  }>;
  totalRequested: number;
  totalCreated: number;
  totalFailed: number;
  message: string;
  errors?: Array<{
    adSetTitle: string;
    error: string;
    details: any;
  }>;
}
```

**Process:**
1. Validates user authentication
2. Checks active subscription
3. Retrieves Meta access token from user_profiles
4. Creates campaign on Meta using Graph API
5. Creates ad sets under the campaign
6. Updates projects table with campaign info
7. Tracks published ads in database
8. Updates subscription usage counters

---

### 2. Publish Campaign Only

**Endpoint:** `POST /api/meta/publish-campaign`

**Purpose:** Creates only a campaign (useful for manual ad set creation later)

**Request Body:**
```typescript
{
  projectId: string;
  campaignName: string;
  adAccountId: string;
  objective?: string; // default: 'OUTCOME_TRAFFIC'
  specialAdCategories?: string[];
}
```

---

### 3. Publish Ad Sets Only

**Endpoint:** `POST /api/meta/publish-adsets`

**Purpose:** Creates ad sets under an existing campaign

**Request Body:**
```typescript
{
  projectId: string;
  campaignId: string;
  adSets: Array<AdSet>;
  adAccountId: string;
  dailyBudget: number;
}
```

---

## Meta Graph API Integration

### Campaign Creation

**API Call:**
```http
POST https://graph.facebook.com/v18.0/act_{ad_account_id}/campaigns
Content-Type: application/json

{
  "name": "Campaign Name",
  "objective": "OUTCOME_TRAFFIC",
  "status": "PAUSED",
  "special_ad_categories": [],
  "access_token": "EAAxxxx..."
}
```

**Response:**
```json
{
  "id": "120210000000000"
}
```

### Ad Set Creation

**API Call:**
```http
POST https://graph.facebook.com/v18.0/act_{ad_account_id}/adsets
Content-Type: application/json

{
  "name": "Ad Set Name",
  "campaign_id": "120210000000000",
  "daily_budget": 1000,
  "billing_event": "IMPRESSIONS",
  "optimization_goal": "LINK_CLICKS",
  "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
  "targeting": {
    "age_min": 25,
    "age_max": 45,
    "genders": [0],
    "geo_locations": {
      "countries": ["US"]
    },
    "flexible_spec": [
      {
        "interests": [
          { "id": "123", "name": "Technology" }
        ]
      }
    ]
  },
  "status": "PAUSED",
  "access_token": "EAAxxxx..."
}
```

**Response:**
```json
{
  "id": "120210000000001"
}
```

---

## Targeting Configuration

### Gender Mapping
- `0` = All genders
- `1` = Male
- `2` = Female

### Age Range
- `age_min`: 18-65 (default: 18)
- `age_max`: 18-65 (default: 65)

### Geographic Targeting
```typescript
{
  geo_locations: {
    countries: ["US", "CA", "GB"] // ISO 2-letter codes
  }
}
```

### Interest Targeting
```typescript
{
  flexible_spec: [
    {
      interests: [
        { id: "6003139266461", name: "Technology" },
        { id: "6003020834693", name: "Startups" }
      ]
    }
  ]
}
```

---

## Budget Configuration

### Budget Format
- Meta API uses **cents** (not dollars)
- Daily budget of $10 = 1000 cents
- Conversion: `dailyBudget * 100`

### Example:
```typescript
const dailyBudgetDollars = 10;
const dailyBudgetCents = Math.round(dailyBudgetDollars * 100); // 1000
```

---

## Security & Permissions

### Required Meta Permissions
When connecting Meta account, request these scopes:
- `email`
- `ads_management`
- `business_management`
- `ads_read`

### Row Level Security (RLS)
All tables have RLS enabled:
- Users can only access their own profiles
- Users can only view/update their own projects
- Users can only see their own published ads

---

## Error Handling

### Common Errors

#### 1. Invalid Access Token
```json
{
  "error": {
    "message": "Invalid OAuth access token",
    "type": "OAuthException",
    "code": 190
  }
}
```
**Solution:** Reconnect Meta account

#### 2. No Ad Account
```json
{
  "error": {
    "message": "User does not have permission to access this ad account",
    "type": "OAuthException",
    "code": 200
  }
}
```
**Solution:** Ensure user has admin access to ad account

#### 3. Budget Too Low
```json
{
  "error": {
    "message": "Daily budget is too low",
    "type": "FacebookApiException"
  }
}
```
**Solution:** Increase daily budget (minimum varies by country)

---

## Subscription Flow Integration

### After Stripe Checkout Success

1. **URL Redirect:**
```
/dashboard/projects/{projectId}/plan?checkout=success&session_id={CHECKOUT_SESSION_ID}
```

2. **Session Verification:**
```typescript
fetch('/api/subscriptions/verify-session', {
  method: 'POST',
  body: JSON.stringify({ session_id: sessionId })
});
```

3. **Subscription Activated:**
- User can now publish ads
- Publish button becomes active
- Usage limits are enforced

---

## Usage Tracking

### Subscription Usage Table
Tracks limits and current usage:

```typescript
interface SubscriptionUsage {
  projects_count: number;
  campaigns_count: number;
  ads_published_count: number;
  max_projects: number;
  max_campaigns: number;
  max_ads_per_day: number;
  daily_budget_cap: number;
}
```

### Limit Checks
Before publishing:
1. Check if subscription is active
2. Check ads_published_count < max_ads_per_day
3. Check daily_budget <= daily_budget_cap
4. Update counters after successful publish

---

## Testing the Flow

### 1. Connect Meta Account
```bash
GET /api/meta-auth?projectId={id}&action=connect
```

### 2. Complete Stripe Checkout
```bash
POST /api/subscriptions/checkout
{
  "plan_type": "free_trial",
  "projectId": "xxx"
}
```

### 3. Publish Ads
```bash
POST /api/meta/publish-ads
{
  "projectId": "xxx",
  "campaignName": "Test Campaign",
  "adSets": [...],
  "adAccountId": "act_123456",
  "dailyBudget": 10
}
```

### 4. Verify in Meta Ads Manager
- Go to https://business.facebook.com/adsmanager
- Check for newly created campaign
- Ad sets should be in PAUSED status
- Activate as needed

---

## Best Practices

### 1. Always Start Paused
- All campaigns and ad sets start in PAUSED status
- Allows user to review before activation
- Prevents accidental spending

### 2. Error Recovery
- Log all Meta API responses
- Provide detailed error messages
- Track failed ad sets separately

### 3. Budget Safety
- Enforce subscription-based budget caps
- Validate budget before API calls
- Track total daily spend across projects

### 4. Token Management
- Store access tokens securely in database
- Handle token expiration gracefully
- Provide easy reconnection flow

---

## Monitoring & Logging

### Key Metrics to Track
- Campaign creation success rate
- Ad set creation success rate
- Average time to publish
- Meta API error rates
- Token expiration events

### Logging Best Practices
```typescript
console.log('🚀 Creating Meta Campaign:', { campaignName, adAccountId });
console.log('✅ Campaign Created:', campaignData);
console.error('❌ Campaign Creation Error:', errorData);
```

---

## Future Enhancements

### Planned Features
1. **Ad Creative Upload:** Attach images/videos to ad sets
2. **Advanced Targeting:** Add behaviors, demographics
3. **Budget Optimization:** AI-powered budget allocation
4. **Performance Tracking:** Fetch and display ad metrics
5. **Bulk Actions:** Pause/activate multiple ad sets
6. **A/B Testing:** Create split test campaigns

---

## Support Resources

### Meta Developer Documentation
- [Marketing API Overview](https://developers.facebook.com/docs/marketing-api)
- [Campaign Creation](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group)
- [Ad Set Creation](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign)
- [Targeting Specs](https://developers.facebook.com/docs/marketing-api/audiences/reference/targeting-specs)

### Internal Documentation
- `META_AUTH_CENTRALIZED.md` - Meta authentication setup
- `META_ADS_FETCHING_GUIDE.md` - Fetching existing ads
- `STRIPE_PAYMENT_FLOW_SUMMARY.md` - Subscription flow

---

## Troubleshooting

### "Meta account not connected"
1. Check `user_profiles.meta_connected` = true
2. Verify `meta_accounts` JSONB has valid access token
3. Reconnect via `/api/meta-auth?action=connect`

### "No ad account found"
1. Ensure user has created ad account in Meta Business Manager
2. Verify ad account appears in `meta_accounts.ad_accounts` array
3. Check ad account status is active (status = 1)

### "Failed to create campaign"
1. Verify access token has `ads_management` permission
2. Check ad account ID format (should start with `act_`)
3. Ensure objective is valid for the API version
4. Review Meta API error code and message

### "Budget exceeds limit"
1. Check subscription plan's `daily_budget_cap`
2. Verify `subscription_usage` table limits
3. Upgrade plan if needed

---

## Quick Reference

### File Locations
```
API Endpoints:
- src/app/api/meta/publish-ads/route.ts (Main endpoint)
- src/app/api/meta/publish-campaign/route.ts (Campaign only)
- src/app/api/meta/publish-adsets/route.ts (Ad sets only)

UI Components:
- src/app/(dashboard)/dashboard/projects/[slug]/plan/page.tsx

Database:
- supabase/migrations/003_create_user_profiles.sql
- supabase/migrations/004_create_subscriptions.sql
- supabase/migrations/006_add_meta_campaign_to_projects.sql

Types:
- src/types/user-profile.ts
```

### Environment Variables
```env
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
NEXT_PUBLIC_SITE_URL=https://your-domain.com
STRIPE_SECRET_KEY=your_stripe_key
```

---

## Summary

The Meta Ads Publishing system provides a complete solution for:
✅ Connecting Meta accounts via OAuth
✅ Creating campaigns and ad sets programmatically
✅ Managing subscriptions and usage limits
✅ Tracking published ads
✅ Handling errors gracefully
✅ Maintaining security with RLS

All ads are created in PAUSED status for safety and can be activated in Meta Ads Manager when ready.

