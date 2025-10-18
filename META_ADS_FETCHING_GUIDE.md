# Meta Ads Fetching Guide

## Overview

This guide explains how to fetch campaigns and ads from Meta (Facebook) after successful authentication, and display them in your Ad Center.

---

## Architecture

### Flow Diagram

```
User Connects Meta Account
         ↓
Access Token Stored in user_profiles
         ↓
User Opens /adcenter
         ↓
Selects Ad Account
         ↓
[Option 1] Click "Load Campaigns"
         ↓
API: /api/meta/campaigns?ad_account_id=act_xxx
         ↓
Fetches campaigns + ads + insights from Meta
         ↓
Display in Campaigns Tab

[Option 2] Click "Load All Ads"
         ↓
API: /api/meta/ads?ad_account_id=act_xxx
         ↓
Fetches all ads + insights from Meta
         ↓
Display in Ads Tab
```

---

## API Endpoints

### 1. Fetch Campaigns

**Endpoint:** `GET /api/meta/campaigns`

**Query Parameters:**

- `ad_account_id` (required) - The Meta ad account ID (e.g., `act_123456`)

**Response:**

```json
{
  "success": true,
  "campaigns": [
    {
      "id": "123456789",
      "name": "Summer Sale Campaign",
      "status": "ACTIVE",
      "objective": "CONVERSIONS",
      "daily_budget": "5000",
      "lifetime_budget": null,
      "created_time": "2025-01-01T00:00:00+0000",
      "ads": [
        {
          "id": "ad_123",
          "name": "Ad 1",
          "status": "ACTIVE"
        }
      ],
      "insights": {
        "impressions": "12500",
        "clicks": "450",
        "spend": "125.50",
        "ctr": "3.6",
        "cpc": "0.28",
        "reach": "8500"
      }
    }
  ],
  "total": 1
}
```

**What it Fetches:**

- ✅ Campaign details (name, status, objective, budget)
- ✅ All ads within each campaign
- ✅ Campaign-level insights (impressions, clicks, spend, CTR, CPC, CPM, reach)

---

### 2. Fetch Ads

**Endpoint:** `GET /api/meta/ads`

**Query Parameters:**

- `ad_account_id` (required) - The Meta ad account ID

**Response:**

```json
{
  "success": true,
  "ads": [
    {
      "id": "123456789",
      "name": "Product Ad - Variant A",
      "status": "ACTIVE",
      "created_time": "2025-01-01T00:00:00+0000",
      "campaign_id": "campaign_123",
      "creative": {
        "id": "creative_123",
        "name": "Summer Creative",
        "title": "50% Off Summer Sale!",
        "body": "Limited time offer. Shop now!",
        "image_url": "https://...",
        "video_id": null
      },
      "insights": {
        "impressions": "5000",
        "clicks": "180",
        "spend": "45.20",
        "ctr": "3.6",
        "cpc": "0.25"
      }
    }
  ],
  "total": 1
}
```

**What it Fetches:**

- ✅ Ad details (name, status, campaign/adset IDs)
- ✅ Creative information (title, body, image, video)
- ✅ Ad-level insights (impressions, clicks, spend, CTR, CPC, actions)

---

## Meta Marketing API Fields

### Campaign Fields

```
id, name, status, objective,
daily_budget, lifetime_budget,
created_time, updated_time,
start_time, stop_time
```

### Ad Fields

```
id, name, status, created_time, updated_time,
campaign_id, adset_id,
creative{
  id, name, title, body,
  image_url, video_id,
  object_story_spec
}
```

### Insights Fields

```
impressions, clicks, spend, reach,
ctr, cpc, cpm,
actions, cost_per_action_type
```

---

## Frontend Usage

### Basic Example

```typescript
// Fetch campaigns for selected ad account
async function loadCampaigns(adAccountId: string) {
  try {
    const response = await fetch(
      `/api/meta/campaigns?ad_account_id=${adAccountId}`
    );
    const data = await response.json();

    if (data.success) {
      console.log('Campaigns:', data.campaigns);
      // Display campaigns in UI
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
  }
}

// Fetch all ads for selected ad account
async function loadAds(adAccountId: string) {
  try {
    const response = await fetch(`/api/meta/ads?ad_account_id=${adAccountId}`);
    const data = await response.json();

    if (data.success) {
      console.log('Ads:', data.ads);
      // Display ads in UI
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Failed to fetch ads:', error);
  }
}
```

### With React State

```typescript
const [campaigns, setCampaigns] = useState<Campaign[]>([]);
const [loading, setLoading] = useState(false);

async function fetchCampaigns(adAccountId: string) {
  setLoading(true);
  try {
    const response = await fetch(
      `/api/meta/campaigns?ad_account_id=${adAccountId}`
    );
    const data = await response.json();

    if (data.success) {
      setCampaigns(data.campaigns);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
}
```

---

## Ad Center Features

### Overview Tab

- ✅ Ad account information
- ✅ Account status
- ✅ Quick stats
- ✅ Buttons to load campaigns/ads

### Campaigns Tab

- ✅ List all campaigns
- ✅ Campaign status badges (Active/Paused/Archived)
- ✅ Campaign metrics (impressions, clicks, spend, CTR, CPC, reach)
- ✅ Number of ads per campaign
- ✅ Budget information

### Ads Tab

- ✅ Grid view of all ads
- ✅ Ad creative preview (image/video)
- ✅ Ad title and body text
- ✅ Ad status
- ✅ Performance metrics (impressions, clicks, spend, CTR)
- ✅ Responsive card layout

---

## Display Example

### Campaign Card

```tsx
<div className='border rounded-lg p-6'>
  <div className='flex justify-between'>
    <div>
      <h3 className='font-semibold'>{campaign.name}</h3>
      <p className='text-sm text-gray-500'>ID: {campaign.id}</p>
    </div>
    <span className='px-3 py-1 bg-green-100 text-green-800 rounded-full'>
      {campaign.status}
    </span>
  </div>

  <div className='grid grid-cols-4 gap-4 mt-4'>
    <div>
      <p className='text-xs text-gray-500'>Impressions</p>
      <p className='font-medium'>
        {Number(campaign.insights.impressions).toLocaleString()}
      </p>
    </div>
    <div>
      <p className='text-xs text-gray-500'>Clicks</p>
      <p className='font-medium'>
        {Number(campaign.insights.clicks).toLocaleString()}
      </p>
    </div>
    <div>
      <p className='text-xs text-gray-500'>Spend</p>
      <p className='font-medium'>
        ${Number(campaign.insights.spend).toFixed(2)}
      </p>
    </div>
    <div>
      <p className='text-xs text-gray-500'>CTR</p>
      <p className='font-medium'>{Number(campaign.insights.ctr).toFixed(2)}%</p>
    </div>
  </div>
</div>
```

### Ad Card with Image

```tsx
<div className='border rounded-lg p-4'>
  <h4 className='font-semibold'>{ad.name}</h4>

  {ad.creative?.image_url && (
    <img
      src={ad.creative.image_url}
      alt={ad.name}
      className='w-full h-40 object-cover rounded-lg my-3'
    />
  )}

  {ad.creative?.title && <p className='font-medium'>{ad.creative.title}</p>}

  {ad.creative?.body && (
    <p className='text-sm text-gray-600'>{ad.creative.body}</p>
  )}

  {ad.insights && (
    <div className='grid grid-cols-2 gap-2 mt-3 pt-3 border-t'>
      <div>
        <p className='text-xs text-gray-500'>Impressions</p>
        <p className='text-sm font-medium'>
          {Number(ad.insights.impressions).toLocaleString()}
        </p>
      </div>
      <div>
        <p className='text-xs text-gray-500'>Spend</p>
        <p className='text-sm font-medium'>
          ${Number(ad.insights.spend).toFixed(2)}
        </p>
      </div>
    </div>
  )}
</div>
```

---

## How Access Token is Used

### 1. Get Access Token from Database

```typescript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('meta_accounts')
  .eq('user_id', userId)
  .single();

const accessToken = profile.meta_accounts[0].access_token;
```

### 2. Make Request to Meta API

```typescript
const response = await fetch(
  `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?` +
    new URLSearchParams({
      fields: 'id,name,status,objective,...',
      access_token: accessToken,
    })
);
```

### 3. Return Data to Frontend

```typescript
const data = await response.json();
return NextResponse.json({
  success: true,
  campaigns: data.data,
});
```

---

## Error Handling

### Common Errors

#### 1. Meta Account Not Connected

```json
{
  "error": "Meta account not connected"
}
```

**Solution:** Redirect to Meta OAuth flow

#### 2. Invalid Access Token

```json
{
  "error": {
    "message": "Invalid OAuth 2.0 Access Token",
    "type": "OAuthException",
    "code": 190
  }
}
```

**Solution:** Implement token refresh or reconnect Meta account

#### 3. No Ad Account Access

```json
{
  "error": {
    "message": "Insufficient permissions",
    "type": "FacebookApiException"
  }
}
```

**Solution:** User needs to grant proper permissions in Meta OAuth

#### 4. Rate Limiting

```json
{
  "error": {
    "message": "Application request limit reached",
    "type": "OAuthException",
    "code": 4
  }
}
```

**Solution:** Implement rate limiting, caching, and retry logic

---

## Best Practices

### 1. Caching

Cache campaign/ad data to reduce API calls:

```typescript
// Cache for 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}
```

### 2. Pagination

For accounts with many ads, implement pagination:

```typescript
const adsResponse = await fetch(
  `https://graph.facebook.com/v18.0/${adAccountId}/ads?` +
    new URLSearchParams({
      fields: '...',
      limit: '100',
      after: cursor, // pagination cursor
      access_token: accessToken,
    })
);
```

### 3. Batch Requests

Fetch multiple resources in one request:

```typescript
const batchResponse = await fetch('https://graph.facebook.com/v18.0/', {
  method: 'POST',
  body: JSON.stringify({
    batch: [
      { method: 'GET', relative_url: `${campaignId}/ads` },
      { method: 'GET', relative_url: `${campaignId}/insights` },
    ],
  }),
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
});
```

### 4. Error Recovery

```typescript
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();

      // If rate limited, wait and retry
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
}
```

---

## Performance Optimization

### 1. Lazy Loading

Only fetch data when user clicks on a tab:

```typescript
function handleTabChange(tab: 'campaigns' | 'ads') {
  setActiveTab(tab);

  if (tab === 'campaigns' && campaigns.length === 0) {
    fetchCampaigns(selectedAdAccount);
  }
}
```

### 2. Parallel Requests

Fetch multiple campaigns' insights in parallel:

```typescript
const campaignsWithInsights = await Promise.all(
  campaigns.map(async campaign => {
    const insights = await fetchInsights(campaign.id);
    return { ...campaign, insights };
  })
);
```

### 3. Selective Field Loading

Only request fields you need:

```typescript
// ✅ Good - specific fields
fields: 'id,name,status';

// ❌ Bad - all fields (slower)
fields: 'all';
```

---

## Next Steps

1. **Implement Token Refresh**
   - Meta tokens expire after 60 days
   - Implement automatic refresh logic

2. **Add Campaign Creation**
   - Create new campaigns via Meta API
   - Upload creatives programmatically

3. **Real-time Updates**
   - Set up Meta webhooks for live updates
   - Subscribe to campaign/ad status changes

4. **Analytics Dashboard**
   - Create charts for performance trends
   - Compare campaigns side-by-side

5. **Ad Preview**
   - Render ad previews exactly as they appear on Facebook/Instagram
   - Use Meta's Ad Preview API

---

## Files Reference

- ✅ `/api/meta/campaigns/route.ts` - Fetch campaigns endpoint
- ✅ `/api/meta/ads/route.ts` - Fetch ads endpoint
- ✅ `/(dashboard)/adcenter/page.tsx` - Ad Center UI
- ✅ `/api/meta/status/route.ts` - Check connection status
- ✅ `user_profiles` table - Stores access tokens

---

## Meta API Documentation

- [Marketing API Reference](https://developers.facebook.com/docs/marketing-apis/)
- [Campaign API](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group)
- [Ad API](https://developers.facebook.com/docs/marketing-api/reference/adgroup)
- [Insights API](https://developers.facebook.com/docs/marketing-api/insights)
- [Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/)

---

**Created:** October 13, 2025  
**Version:** 1.0.0
