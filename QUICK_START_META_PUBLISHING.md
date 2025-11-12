# Quick Start - Meta Ads Publishing

## 🚀 What You Need to Know

After Stripe checkout, users can publish their generated ad sets directly to Meta (Facebook) with one click.

---

## 📍 Where Everything Is

### Main API Endpoint
```
POST /api/meta/publish-ads
```
This handles everything - creates campaign + all ad sets.

### UI Button
```
File: src/app/(dashboard)/dashboard/projects/[slug]/plan/page.tsx
Location: Bottom of page in subscription card
Button: "Publish Ads"
```

### Database
```
Access Token: user_profiles.meta_accounts[0].access_token
Ad Sets: projects.ad_set_proposals
Campaign Info: projects.meta_campaign_id
```

---

## 🔑 How to Use (User Perspective)

1. **Connect Meta Account** (one-time)
   - Click "Connect Meta Account"
   - Authorize on Facebook
   - Done ✅

2. **Complete Stripe Checkout**
   - Choose plan
   - Enter payment info
   - Returns to plan page ✅

3. **Publish Ads** (the new part!)
   - Click "Publish Ads" button
   - Wait 10-30 seconds
   - See success message ✅

4. **Activate in Meta**
   - Go to Meta Ads Manager
   - Find your campaign
   - Review and activate ✅

---

## 🔧 How It Works (Technical)

### Request Flow
```
User clicks "Publish Ads"
  ↓
Frontend calls /api/meta/publish-ads
  ↓
Backend retrieves access token from user_profiles
  ↓
Backend calls Meta Graph API:
  1. Create campaign
  2. Create ad sets (one by one)
  ↓
Backend saves campaign_id to projects
  ↓
Backend tracks published ads
  ↓
Frontend shows success message
```

### Meta API Calls
```javascript
// 1. Create Campaign
POST https://graph.facebook.com/v18.0/act_{ad_account_id}/campaigns
Body: { name, objective: "OUTCOME_TRAFFIC", status: "PAUSED" }

// 2. Create Ad Sets (loop for each)
POST https://graph.facebook.com/v18.0/act_{ad_account_id}/adsets
Body: { name, campaign_id, daily_budget, targeting, status: "PAUSED" }
```

---

## 📊 Ad Set Data Mapping

Your JSON → Meta API:

```javascript
{
  // Your data
  "ad_set_title": "Startup Innovators",
  "age_range": { "min": 25, "max": 45 },
  "genders": ["All"],
  
  // Converted to Meta format
  "targeting": {
    "age_min": 25,
    "age_max": 45,
    "genders": [0],  // 0=All, 1=Male, 2=Female
    "geo_locations": { "countries": ["US"] },
    "flexible_spec": [
      { "interests": [{ "id": "...", "name": "Startups" }] }
    ]
  }
}
```

---

## ⚠️ Important Notes

### Safety First
- All ads start **PAUSED** (not active)
- Users must activate in Meta Ads Manager
- Prevents accidental spending

### Budget Format
- Meta API uses **cents**, not dollars
- $10/day = 1000 cents
- Conversion: `dailyBudget * 100`

### Error Handling
- If campaign creation fails → No ad sets created
- If ad set fails → Campaign still exists, other ad sets continue
- All errors logged and shown to user

---

## 🎯 Testing Locally

### 1. Set Environment Variables
```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
```

### 2. Run Migration
```bash
# Apply the new migration
supabase db push
# Or manually run: 006_add_meta_campaign_to_projects.sql
```

### 3. Test Flow
```bash
# Start dev server
npm run dev

# Go to plan page
http://localhost:3000/dashboard/projects/{id}/plan

# Click "Publish Ads"
# Check console for logs
```

### 4. Verify in Meta
```
https://business.facebook.com/adsmanager
Look for new campaign
```

---

## 🐛 Quick Troubleshooting

| Error | Solution |
|-------|----------|
| "Meta account not connected" | Reconnect Meta account |
| "No ad account found" | Create ad account in Meta Business Manager |
| "Active subscription required" | Complete Stripe checkout |
| "No ad sets found" | Generate ad sets first |
| "Invalid access token" | Reconnect Meta account |

---

## 📁 Files Changed

### New Files (6)
- `src/app/api/meta/publish-ads/route.ts` ⭐ Main
- `src/app/api/meta/publish-campaign/route.ts`
- `src/app/api/meta/publish-adsets/route.ts`
- `supabase/migrations/006_add_meta_campaign_to_projects.sql`
- `META_ADS_PUBLISHING_GUIDE.md`
- `META_ADS_PUBLISHING_TEST_GUIDE.md`

### Modified Files (1)
- `src/app/(dashboard)/dashboard/projects/[slug]/plan/page.tsx`
  - Line ~825-900: Updated `handlePublishAds()` function

---

## 🎁 What You Get

✅ **One-click publishing** to Meta
✅ **Automatic campaign creation** with all ad sets
✅ **Safe defaults** (everything paused)
✅ **Error recovery** (handles partial failures)
✅ **Usage tracking** (subscription limits enforced)
✅ **Complete audit trail** (all published ads tracked)

---

## 🔍 Where to Look

### To see the button:
`src/app/(dashboard)/dashboard/projects/[slug]/plan/page.tsx` line 1619

### To see the API:
`src/app/api/meta/publish-ads/route.ts`

### To understand the flow:
`META_ADS_PUBLISHING_GUIDE.md`

### To test it:
`META_ADS_PUBLISHING_TEST_GUIDE.md`

---

## 🎯 Next Steps

1. **Test locally** with your Meta test account
2. **Verify** campaign appears in Meta Ads Manager
3. **Deploy** to production when ready
4. **Monitor** server logs for any errors

---

## 💡 Pro Tips

1. Always test with Meta's test ad accounts first
2. Use Stripe test cards for checkout testing
3. Check browser console for detailed logs
4. Start with small daily budgets ($5-10)
5. Review ads in Meta before activating

---

## 🆘 Need Help?

1. Check `META_ADS_PUBLISHING_GUIDE.md` for details
2. See `META_ADS_PUBLISHING_TEST_GUIDE.md` for testing
3. Review Meta's Marketing API docs
4. Check server logs for errors

---

## ✨ That's It!

You now have complete Meta ad publishing integrated with your Stripe checkout flow. Users stay on the plan page after checkout and can publish with one click! 🎉

