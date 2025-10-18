# Freepik API Debugging Guide

## Error: "Unexpected token '<', '<!DOCTYPE' is not valid JSON"

### What This Error Means

When you see this error, it means the Freepik API is returning an **HTML error page** instead of JSON. This typically happens due to:

1. ❌ **Invalid or Missing API Key**
2. ❌ **Expired API Key**
3. ❌ **Wrong API Endpoint**
4. ❌ **API Service Down**
5. ❌ **Rate Limit Exceeded**

---

## How to Debug

### Step 1: Check Your API Key

The improved error handling will now show:

```bash
🔑 API Key configured: true/false
🔑 API Key length: XX
```

**Action Required**:

1. Open your `.env` or `.env.local` file
2. Verify `FREEPIK_API_KEY` is set:
   ```env
   FREEPIK_API_KEY=your-actual-api-key-here
   ```
3. Check that the key is valid (no extra spaces, quotes, or newlines)

### Step 2: Verify API Key is Active

1. Go to [Freepik API Dashboard](https://www.freepik.com/api/dashboard)
2. Check if your API key is still active
3. Check your API usage/quota
4. Verify you have access to Gemini 2.5 Flash endpoint

### Step 3: Test API Key Manually

Test with curl:

```bash
curl -X GET "https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview/{some-task-id}" \
  -H "x-freepik-api-key: YOUR_API_KEY"
```

**Expected Response**:

- ✅ JSON with `{"data": {...}}`
- ❌ HTML page = Invalid key

### Step 4: Check Enhanced Console Output

The code now provides detailed debugging information:

#### Generation Phase:

```bash
🎨 Generating image with Freepik Gemini 2.5 Flash...
📝 Prompt: ...
🔑 API Key configured: true
🔑 API Key length: 64
🖼️  Reference images: 2
   📷 Image 1 size: 245.67 KB
   📷 Image 2 size: 45.67 KB
📤 Sending request to Gemini 2.5 Flash API...
📡 Response status: 401 Unauthorized   ← Check this!
📋 Response content-type: text/html    ← Should be application/json
❌ Non-JSON response received
```

#### Polling Phase:

```bash
⏳ Polling Freepik Gemini 2.5 Flash task status...
🔍 Polling URL (attempt 1): https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview/abc-123
📡 Response status: 401 Unauthorized   ← Check this!
📋 Response headers: {...}
❌ Non-OK response:
   status: 401
   body: <!DOCTYPE html>...
```

---

## Common Issues & Solutions

### Issue 1: 401 Unauthorized

**Symptoms**:

```bash
📡 Response status: 401 Unauthorized
📋 Response content-type: text/html
```

**Solution**:

- ✅ Check your API key is correct
- ✅ Regenerate API key from Freepik dashboard
- ✅ Make sure key has no extra whitespace

### Issue 2: 403 Forbidden

**Symptoms**:

```bash
📡 Response status: 403 Forbidden
```

**Solution**:

- ✅ Your account may not have access to Gemini 2.5 Flash
- ✅ Upgrade your Freepik API plan
- ✅ Check endpoint permissions in dashboard

### Issue 3: 429 Too Many Requests

**Symptoms**:

```bash
📡 Response status: 429 Too Many Requests
```

**Solution**:

- ✅ You've hit rate limits
- ✅ Wait before retrying
- ✅ Check your API quota in dashboard

### Issue 4: 500 Internal Server Error

**Symptoms**:

```bash
📡 Response status: 500 Internal Server Error
```

**Solution**:

- ✅ Freepik API is having issues
- ✅ Check [Freepik Status Page](https://status.freepik.com) (if exists)
- ✅ Try again in a few minutes
- ✅ Contact Freepik support

### Issue 5: Network/Firewall Issues

**Symptoms**:

```bash
❌ Error: fetch failed
```

**Solution**:

- ✅ Check your internet connection
- ✅ Check if `api.freepik.com` is accessible
- ✅ Verify no firewall/proxy blocking
- ✅ Try from different network

---

## API Key Best Practices

### 1. Environment Variables

**Correct**:

```env
FREEPIK_API_KEY=fpk_abc123xyz456...
```

**Incorrect**:

```env
FREEPIK_API_KEY="fpk_abc123xyz456..."  ❌ No quotes
FREEPIK_API_KEY= fpk_abc123xyz456...   ❌ No leading space
```

### 2. Restart After Changes

After updating `.env`:

```bash
# Stop the dev server (Ctrl+C)
# Restart it
npm run dev
```

### 3. Check Key Format

Freepik API keys typically:

- Start with `fpk_` or similar prefix
- Are 40-64 characters long
- Contain alphanumeric characters

---

## Testing the Fix

After fixing your API key, you should see:

```bash
🎨 Generating image with Freepik Gemini 2.5 Flash...
🔑 API Key configured: true
🔑 API Key length: 64
📤 Sending request to Gemini 2.5 Flash API...
📡 Response status: 200 OK                    ← Success!
📋 Response content-type: application/json    ← JSON response
✅ Image generation started, task ID: abc-123

⏳ Polling Freepik Gemini 2.5 Flash task status...
🔍 Polling URL (attempt 1): ...
📡 Response status: 200 OK                    ← Success!
📊 Poll attempt 1: Status = IN_PROGRESS
📊 Poll attempt 2: Status = COMPLETED
✅ Image generation completed!
```

---

## Quick Checklist

Before running the API again:

- [ ] `FREEPIK_API_KEY` is set in `.env`
- [ ] No quotes around the API key value
- [ ] No extra whitespace before/after key
- [ ] Restarted the dev server after changing `.env`
- [ ] API key is active in Freepik dashboard
- [ ] Account has access to Gemini 2.5 Flash
- [ ] Not hitting rate limits
- [ ] Internet connection is working

---

## Getting a New API Key

If your key is invalid or expired:

1. Go to [Freepik Developers](https://www.freepik.com/api)
2. Sign in to your account
3. Navigate to API Dashboard
4. Generate a new API key
5. Copy the key (you won't see it again!)
6. Update your `.env` file
7. Restart your development server

---

## Contact Freepik Support

If issues persist after checking everything:

- 📧 Email: api-support@freepik.com (or check their docs)
- 📚 Docs: https://docs.freepik.com
- 💬 Community: Check Freepik developer forums

Include in your support request:

- Error message from console
- Response status code (401, 403, etc.)
- Approximate timestamp of error
- Your account email (not your API key!)

---

## Code Changes Made

### Enhanced Error Handling

1. **Pre-JSON Parse Checks**:
   - Validates response status code
   - Checks content-type header
   - Logs response body if not JSON

2. **Detailed Logging**:
   - API key existence and length
   - Request/response headers
   - Full error responses
   - Helpful troubleshooting hints

3. **Better Error Messages**:
   - Identifies JSON parsing failures
   - Suggests likely causes
   - Provides actionable next steps

---

## Example: Working Configuration

**`.env.local`**:

```env
# Freepik API
FREEPIK_API_KEY=fpk_1a2b3c4d5e6f7g8h9i0j...

# Other keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
OPENAI_API_KEY=sk-proj-...
```

**Console Output (Success)**:

```bash
🎨 Extracting logo from website...
✅ Logo saved to Supabase
🎨 Generating image with Freepik Gemini 2.5 Flash...
🔑 API Key configured: true
🔑 API Key length: 64
🖼️  Reference images: 2
📤 Sending request to Gemini 2.5 Flash API...
📡 Response status: 200 OK
✅ Image generation started, task ID: 046b6c7f...
⏳ Polling Freepik Gemini 2.5 Flash task status...
📊 Poll attempt 1: Status = IN_PROGRESS
📊 Poll attempt 2: Status = COMPLETED
✅ Image generation completed!
```

---

**Last Updated**: October 13, 2024  
**Status**: Enhanced error handling implemented ✅
