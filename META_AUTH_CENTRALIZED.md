# Meta Authentication - Centralized User Profile System

## Overview

Meta (Facebook) authentication has been restructured to use a centralized `user_profiles` table instead of storing meta accounts per project. This provides better data management and consistency across the application.

---

## Architecture Changes

### Before 🔴

- Meta accounts stored in `projects.meta_accounts` (JSONB)
- Meta data duplicated across multiple projects
- No centralized way to manage user's Meta connections

### After 🟢

- Meta accounts stored in `user_profiles.meta_accounts` (JSONB)
- One centralized location per user for all Meta accounts
- Automatic user profile creation on signup
- Protected `/adcenter` route requiring Meta connection

---

## Database Schema

### User Profiles Table

```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  meta_accounts JSONB DEFAULT '[]',
  meta_connected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Meta Account Structure (JSONB)

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
    "connected_at": "2025-10-13T12:00:00Z",
    "updated_at": "2025-10-13T12:00:00Z"
  }
]
```

---

## Authentication Flow

### 1. User Initiates Meta OAuth

```
GET /api/meta-auth?projectId=xxx&action=connect
```

- Generates Meta OAuth URL
- Redirects user to Facebook login

### 2. Meta Callback

```
GET /api/meta-auth/callback?code=xxx&state={projectId,userId}
```

- Exchanges code for access token
- Fetches user profile and ad accounts
- **Saves to `user_profiles` table**
- Redirects to `/adcenter?projectId=xxx`

### 3. Ad Center (Protected Route)

```
/adcenter?projectId=xxx
```

- Checks if user has `meta_connected = true`
- Displays Meta account info and ad accounts
- Only accessible with valid Meta connection

---

## API Endpoints

### Check Meta Connection Status

```typescript
GET /api/meta/status

Response:
{
  "connected": true,
  "accountsCount": 1,
  "accounts": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "adAccountsCount": 3,
      "connectedAt": "2025-10-13T12:00:00Z"
    }
  ]
}
```

### Initiate Meta OAuth

```typescript
GET /api/meta-auth?projectId=xxx&action=connect

Response:
{
  "success": true,
  "oauthUrl": "https://www.facebook.com/v18.0/dialog/oauth?...",
  "message": "Redirect to Meta OAuth"
}
```

---

## TypeScript Types

Located in `src/types/user-profile.ts`:

```typescript
export interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
}

export interface MetaProfile {
  id: string;
  name: string;
  email: string;
}

export interface MetaAccount {
  access_token: string;
  profile: MetaProfile;
  ad_accounts: MetaAdAccount[];
  connected_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  meta_accounts: MetaAccount[];
  meta_connected: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## Security Features

### Row Level Security (RLS)

✅ Users can only view/update their own profile  
✅ Automatic profile creation via database trigger  
✅ Cascade deletion when user is deleted

### Access Control

✅ Protected `/adcenter` route  
✅ Automatic redirect if Meta not connected  
✅ Server-side authentication checks

---

## Database Migration

Run the migration to create the table and triggers:

```bash
# Apply migration
psql -U postgres -d your_database -f supabase/migrations/003_create_user_profiles.sql
```

The migration includes:

- ✅ Table creation with proper schema
- ✅ RLS policies
- ✅ Automatic profile creation trigger
- ✅ Backfill for existing users
- ✅ Auto-update timestamps

---

## Usage Example

### Frontend: Check Meta Connection

```typescript
async function checkMetaStatus() {
  const response = await fetch('/api/meta/status');
  const data = await response.json();

  if (data.connected) {
    console.log('Meta connected!');
    console.log('Ad accounts:', data.accountsCount);
  } else {
    console.log('Meta not connected');
    // Redirect to connect
    window.location.href = '/api/meta-auth?projectId=xxx&action=connect';
  }
}
```

### Frontend: Access User Profile

```typescript
import { supabase } from '@/lib/supabase';

async function getUserProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  console.log('Meta accounts:', profile.meta_accounts);
}
```

---

## Benefits

✅ **Centralized**: One source of truth for Meta accounts  
✅ **Scalable**: Easy to add more OAuth providers (Google, TikTok, etc.)  
✅ **Secure**: RLS ensures data isolation  
✅ **Maintainable**: Clear separation of concerns  
✅ **Automatic**: Profile created on signup via trigger

---

## Next Steps

1. **Token Refresh**: Implement Meta token refresh logic
2. **Encryption**: Encrypt access tokens at rest
3. **Multi-Account**: Support multiple Meta accounts per user
4. **Campaign Management**: Build out campaign creation in `/adcenter`
5. **Webhooks**: Set up Meta webhooks for real-time updates

---

## Files Modified

- ✅ `supabase/migrations/003_create_user_profiles.sql` - Database schema
- ✅ `src/app/api/meta-auth/callback/route.ts` - Updated to save to user_profiles
- ✅ `src/app/api/meta/status/route.ts` - New status check endpoint
- ✅ `src/app/(dashboard)/adcenter/page.tsx` - Protected ad center page
- ✅ `src/types/user-profile.ts` - TypeScript type definitions

---

## Troubleshooting

### User Profile Not Found

- Ensure migration ran successfully
- Check if trigger is active: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
- Manually create profile if needed

### Meta Not Connected

- Check `user_profiles.meta_connected` is `true`
- Verify `meta_accounts` JSONB is not empty
- Check browser console for redirect errors

### Access Token Issues

- Meta tokens expire - implement refresh logic
- Verify token has correct scopes: `ads_management`, `business_management`, `ads_read`
- Check Meta App permissions in Facebook Developer Console

---

**Created:** October 13, 2025  
**Version:** 1.0.0
