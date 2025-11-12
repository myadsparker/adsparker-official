# Meta Ads Publishing - Testing Guide

## Testing Checklist

This guide helps you test the complete Meta ads publishing flow from Stripe checkout to publishing ads.

---

## Prerequisites

### 1. Environment Setup
Ensure these environment variables are set:
```env
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
NEXT_PUBLIC_SITE_URL=your_site_url
STRIPE_SECRET_KEY=your_stripe_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Migrations
Run all migrations:
```bash
# Apply migrations in order
001_create_meta_ad_interests.sql
002_add_workflow_name_to_projects.sql
003_create_user_profiles.sql
004_create_subscriptions.sql
005_add_projects_rls_policies.sql
006_add_meta_campaign_to_projects.sql
```

### 3. Meta Developer Setup
- Create Meta App in developers.facebook.com
- Add OAuth redirect URL: `{SITE_URL}/api/meta-auth/callback`
- Request permissions: `email`, `ads_management`, `business_management`, `ads_read`
- Create test ad account in Meta Business Manager

---

## Test Flow

### Step 1: User Signup & Login ✅
```
1. Go to /signup
2. Create new account
3. Verify email if required
4. Login to application
```

**Expected Result:**
- User is logged in
- Redirected to dashboard
- `user_profiles` record created automatically

**Verify in Database:**
```sql
SELECT * FROM user_profiles WHERE user_id = 'your_user_id';
```

---

### Step 2: Create Project ✅
```
1. Go to /dashboard/projects/new
2. Enter website URL
3. Click "Create Project"
```

**Expected Result:**
- Project created with status 'PENDING'
- Redirected to project page
- Project ID visible in URL

**Verify in Database:**
```sql
SELECT project_id, url_analysis, status 
FROM projects 
WHERE user_id = 'your_user_id';
```

---

### Step 3: Connect Meta Account ✅
```
1. Navigate to project plan page
2. Click "Connect Meta Account" button
3. Authorize on Facebook OAuth page
4. Grant all requested permissions
5. Redirected back to plan page
```

**Expected Result:**
- Success message: "Meta account connected successfully!"
- Meta account info displayed
- Ad accounts visible

**Verify in Database:**
```sql
SELECT meta_connected, meta_accounts 
FROM user_profiles 
WHERE user_id = 'your_user_id';
```

**Meta Accounts Structure:**
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
    ]
  }
]
```

---

### Step 4: Generate Ad Sets ✅
```
1. On plan page, complete business analysis
2. Generate ad sets (should already be generated)
3. Verify ad sets appear in the UI
```

**Expected Result:**
- At least 1 ad set visible
- Ad set includes:
  - Title
  - Audience description
  - Age range
  - Gender
  - Targeting interests
  - Ad copy

**Verify in Database:**
```sql
SELECT ad_set_proposals 
FROM projects 
WHERE project_id = 'your_project_id';
```

---

### Step 5: Stripe Checkout (Free Trial) ✅
```
1. Click "Start Free Trial" or subscription button
2. Redirected to Stripe Checkout
3. Enter test card: 4242 4242 4242 4242
4. Complete checkout
5. Redirected back to plan page with ?checkout=success
```

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- 3D Secure: `4000 0027 6000 3184`
- Decline: `4000 0000 0000 0002`

**Expected Result:**
- Subscription created with status 'active'
- Success message displayed
- URL cleaned (checkout param removed)
- "Publish Ads" button becomes active

**Verify in Database:**
```sql
SELECT * FROM subscriptions 
WHERE user_id = 'your_user_id' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Step 6: Publish Ads to Meta ✅
```
1. On plan page, locate "Publish Ads" button
2. Ensure Meta account is connected (green checkmark)
3. Ensure subscription is active
4. Click "Publish Ads" button
5. Wait for publishing process (10-30 seconds)
```

**Expected Result:**
- Loading indicator shows "Publishing Ads..."
- Success alert with campaign details:
  ```
  ✅ Campaign created with X ad sets!
  
  Campaign: Your Campaign Name
  Campaign ID: 120210000000000
  Ad Sets Created: 10/10
  Status: PAUSED (for safety)
  
  You can now activate and manage your ads in Meta Ads Manager.
  ```

**Verify API Calls:**
Check browser console for:
```
🚀 Publishing ads to Meta...
✅ Campaign Created: {...}
✅ Ad Set 1 Created: {...}
✅ Ad Set 2 Created: {...}
...
✅ Ads published successfully
```

**Verify in Database:**
```sql
-- Check campaign stored in project
SELECT meta_campaign_id, meta_campaign_name 
FROM projects 
WHERE project_id = 'your_project_id';

-- Check published ads tracked
SELECT * FROM published_ads 
WHERE project_id = 'your_project_id' 
ORDER BY created_at DESC;

-- Check usage updated
SELECT campaigns_count, ads_published_count 
FROM subscription_usage 
WHERE user_id = 'your_user_id';
```

---

### Step 7: Verify in Meta Ads Manager ✅
```
1. Go to https://business.facebook.com/adsmanager
2. Select your ad account
3. Look for newly created campaign
```

**Expected in Meta:**
- Campaign exists with correct name
- Campaign status: PAUSED
- All ad sets created under campaign
- Each ad set has:
  - Correct name
  - Daily budget set
  - Targeting configured
  - Status: PAUSED

**Campaign Structure:**
```
📢 Campaign Name (PAUSED)
  ├─ 📊 Ad Set 1: Startup Innovators (PAUSED)
  ├─ 📊 Ad Set 2: AI Enthusiasts (PAUSED)
  ├─ 📊 Ad Set 3: Freelance Developers (PAUSED)
  └─ ... (more ad sets)
```

---

## Error Testing

### Test 1: No Meta Connection
```
1. Disconnect Meta account
2. Try to publish ads
```

**Expected:**
- Error: "Meta account not connected. Please connect your Meta account first."
- No API calls made

---

### Test 2: No Active Subscription
```
1. Cancel subscription in Stripe
2. Try to publish ads
```

**Expected:**
- Error: "Active subscription required to publish ads"
- Redirected to pricing or subscription page

---

### Test 3: Invalid Ad Account
```
1. Manually set invalid ad account ID
2. Try to publish ads
```

**Expected:**
- Error from Meta API
- Clear error message displayed
- No partial campaign/ad sets created

---

### Test 4: Budget Exceeds Limit
```
1. Set daily budget > plan's daily_budget_cap
2. Try to publish ads
```

**Expected:**
- Error: "Daily budget exceeds your plan limit"
- No API calls made

---

### Test 5: No Ad Sets
```
1. Delete ad_set_proposals from project
2. Try to publish ads
```

**Expected:**
- Error: "No ad sets found. Please generate ad sets first."
- Prompt to go back and generate ad sets

---

## API Testing with Postman/cURL

### 1. Test Campaign Creation
```bash
curl -X POST http://localhost:3000/api/meta/publish-campaign \
  -H "Content-Type: application/json" \
  -H "Cookie: your_session_cookie" \
  -d '{
    "projectId": "your_project_id",
    "campaignName": "Test Campaign",
    "adAccountId": "act_123456",
    "objective": "OUTCOME_TRAFFIC"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "120210000000000",
    "name": "Test Campaign",
    "objective": "OUTCOME_TRAFFIC",
    "status": "PAUSED"
  },
  "message": "Campaign created successfully"
}
```

---

### 2. Test Ad Sets Creation
```bash
curl -X POST http://localhost:3000/api/meta/publish-adsets \
  -H "Content-Type: application/json" \
  -H "Cookie: your_session_cookie" \
  -d '{
    "projectId": "your_project_id",
    "campaignId": "120210000000000",
    "adAccountId": "act_123456",
    "dailyBudget": 10,
    "adSets": [
      {
        "ad_set_title": "Test Ad Set",
        "age_range": { "min": 25, "max": 45 },
        "genders": ["All"],
        "audience_tags": ["Technology", "Startups"],
        "targeting": {
          "GeoLocations": { "Countries": ["US"] },
          "FlexibleSpec": []
        }
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "createdAdSets": [
    {
      "id": "120210000000001",
      "name": "Test Ad Set",
      "daily_budget": 10,
      "status": "PAUSED"
    }
  ],
  "totalRequested": 1,
  "totalCreated": 1,
  "totalFailed": 0,
  "message": "Successfully created 1 ad sets"
}
```

---

### 3. Test Complete Publishing
```bash
curl -X POST http://localhost:3000/api/meta/publish-ads \
  -H "Content-Type: application/json" \
  -H "Cookie: your_session_cookie" \
  -d @test-payload.json
```

**test-payload.json:**
```json
{
  "projectId": "your_project_id",
  "campaignName": "Complete Test Campaign",
  "adAccountId": "act_123456",
  "dailyBudget": 10,
  "objective": "OUTCOME_TRAFFIC",
  "adSets": [
    {
      "ad_set_title": "Startup Innovators",
      "age_range": { "min": 25, "max": 45 },
      "genders": ["All"],
      "audience_tags": ["Startups", "Entrepreneurship"],
      "targeting": {
        "GeoLocations": { "Countries": ["US"] },
        "AgeMin": 25,
        "AgeMax": 45,
        "Genders": [0],
        "FlexibleSpec": [
          {
            "interests": [
              { "id": "6003020834693", "name": "Startups" }
            ]
          }
        ]
      },
      "daily_budget": 10
    }
  ]
}
```

---

## Performance Testing

### Load Test: Multiple Ad Sets
```
Test publishing campaign with 10 ad sets simultaneously
```

**Expected:**
- All 10 ad sets created successfully
- Total time: < 60 seconds
- No rate limit errors from Meta

---

### Stress Test: Multiple Users
```
Simulate 5 users publishing ads at the same time
```

**Expected:**
- All users succeed independently
- No database deadlocks
- Correct usage tracking for each user

---

## Monitoring Checklist

### Server Logs
Look for:
- ✅ `🚀 Starting Meta Ad Publishing Process`
- ✅ `📢 Creating campaign...`
- ✅ `✅ Campaign Created:`
- ✅ `📊 Creating ad sets...`
- ✅ `✅ Ad Set X Created:`
- ✅ `💾 Saving to database...`
- ✅ `✅ Publishing process completed!`

### Error Logs
Watch for:
- ❌ Campaign creation errors
- ❌ Ad set creation errors
- ❌ Database update errors
- ❌ Access token issues

---

## Troubleshooting

### Issue: "Invalid OAuth access token"
**Solution:**
1. Disconnect Meta account
2. Reconnect via OAuth
3. Ensure all permissions granted
4. Try publishing again

### Issue: "No ad account found"
**Solution:**
1. Go to Meta Business Manager
2. Create new ad account
3. Reconnect Meta account in app
4. Verify ad account appears in meta_accounts array

### Issue: Campaign created but ad sets failed
**Solution:**
1. Check Meta API error codes
2. Verify targeting interests are valid
3. Check budget meets minimum for selected countries
4. Retry ad set creation with /api/meta/publish-adsets

### Issue: "Daily budget exceeds limit"
**Solution:**
1. Lower daily budget OR
2. Upgrade subscription plan
3. Check subscription_usage.daily_budget_cap

---

## Success Criteria

✅ User can complete Stripe checkout  
✅ Subscription activated successfully  
✅ Meta account connected with valid token  
✅ Campaign created on Meta  
✅ All ad sets created under campaign  
✅ Campaign and ad sets in PAUSED status  
✅ Database updated with campaign info  
✅ Published ads tracked correctly  
✅ Usage counters incremented  
✅ Visible in Meta Ads Manager  

---

## Next Steps After Testing

1. **Activate Ads:**
   - Go to Meta Ads Manager
   - Review campaign and ad sets
   - Activate when ready

2. **Monitor Performance:**
   - Check impressions, clicks, conversions
   - Adjust budgets as needed
   - Optimize targeting based on results

3. **Iterate:**
   - Test different ad copy
   - Try various audiences
   - A/B test creatives

---

## Support

If you encounter issues:
1. Check server logs for detailed errors
2. Review META_ADS_PUBLISHING_GUIDE.md
3. Verify all environment variables
4. Test with Meta's Graph API Explorer
5. Check Meta developer documentation

---

## Summary

This testing guide ensures:
- ✅ Complete flow works end-to-end
- ✅ All integrations are properly configured
- ✅ Errors are handled gracefully
- ✅ Data is stored correctly
- ✅ Usage limits are enforced
- ✅ Ads appear in Meta Ads Manager

Happy testing! 🚀

