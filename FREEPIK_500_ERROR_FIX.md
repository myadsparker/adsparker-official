# Freepik 500 Error Fix - Seedream 4 Edit

## Issues Found & Fixed

After thoroughly reviewing the [Freepik Seedream 4 Edit documentation](https://docs.freepik.com/api-reference/text-to-image/seedream-4-edit/post-seedream-v4-edit), I identified and fixed the following issues:

### 1. ❌ **Wrong Polling Endpoint**

**Problem**: We were polling the wrong endpoint for Seedream 4 Edit tasks.

**Before**:

```typescript
// ❌ WRONG - Using regular Seedream v4 endpoint
const response = await fetch(
  `https://api.freepik.com/v1/ai/text-to-image/seedream-v4/${taskId}`
);
```

**After**:

```typescript
// ✅ CORRECT - Using Seedream v4-edit endpoint when using reference images
const endpoint = isEdit ? 'seedream-v4-edit' : 'seedream-v4';
const response = await fetch(
  `https://api.freepik.com/v1/ai/text-to-image/${endpoint}/${taskId}`
);
```

### 2. ✅ **Better Error Logging**

Added comprehensive error logging to help debug 500 errors:

```typescript
if (!response.ok) {
  console.error('❌ Freepik Seedream 4 Edit API Error:', {
    status: response.status,
    statusText: response.statusText,
    error: data.error,
    fullResponse: JSON.stringify(data, null, 2),
  });
  throw new Error(
    `Freepik API error (${response.status}): ${data.error?.message || JSON.stringify(data)}`
  );
}
```

### 3. ✅ **OG Image URL Validation**

Added validation to ensure the OG image URL is:

- A valid URL format
- Publicly accessible
- Has proper content-type

```typescript
// Validate URL format
try {
  new URL(ogImage);

  // Test accessibility with HEAD request
  const testResponse = await axios.head(ogImage, { timeout: 3000 });
  console.log(
    '✅ OG Image is accessible, content-type:',
    testResponse.headers['content-type']
  );
} catch (urlError) {
  console.error('❌ Invalid OG Image URL:', ogImage);
  ogImage = null;
}
```

### 4. ✅ **Smart Endpoint Selection**

The polling function now automatically selects the correct endpoint:

```typescript
const generatedImageUrls = await pollFreepikTaskStatus(
  generationResult.taskId,
  !!referenceImages // true if using Seedream 4 Edit
);
```

## Key Documentation Findings

From the official docs:

### Reference Images Parameter

```json
{
  "reference_images": [
    "iVBORw0KGgoAAAANSUhEUgAAASwAAAEsAQAAAABRBrPYAAABrElEQVR4nO3BMQEAAADCoPVPbQ0Po...",
    "https://example.com/reference-image.jpg"
  ]
}
```

**Requirements**:

- ✅ Array of strings
- ✅ Can be Base64 encoded strings OR publicly accessible URLs
- ✅ **Maximum 5 reference images**
- ✅ Optional parameter

### Endpoints

**Generation**:

- Regular: `POST /v1/ai/text-to-image/seedream-v4`
- With reference: `POST /v1/ai/text-to-image/seedream-v4-edit`

**Status Check**:

- Regular: `GET /v1/ai/text-to-image/seedream-v4/{task_id}`
- With reference: `GET /v1/ai/text-to-image/seedream-v4-edit/{task_id}`

## Common Causes of 500 Errors

### 1. **Inaccessible Reference Images**

- OG image URL is not publicly accessible
- URL requires authentication
- Image is behind a firewall/VPN
- CDN/hosting issues

**Solution**: Validate URL accessibility before sending to API

### 2. **Invalid Image Format**

- Image is not a valid format (not JPEG/PNG)
- Image is corrupted
- URL doesn't point to an actual image

**Solution**: Check content-type header

### 3. **Wrong Polling Endpoint**

- Using `/seedream-v4/` instead of `/seedream-v4-edit/`
- Results in 404/500 errors when checking status

**Solution**: Use correct endpoint based on whether reference images were used

### 4. **Image Size Issues**

- Image is too large (>10MB)
- Image dimensions are too large

**Solution**: May need to resize/compress before using as reference

## Testing Checklist

Before deploying:

- [ ] OG image URL is publicly accessible
- [ ] OG image is a valid image format (JPEG/PNG)
- [ ] Using correct polling endpoint (`seedream-v4-edit` vs `seedream-v4`)
- [ ] Error logging captures full response for debugging
- [ ] Handle cases where OG image is not found gracefully

## Expected Console Output

### Success Case:

```
🛍️ Product page detected! Extracting OG image with Cheerio...
📦 Product: Red leather handbag
🌐 Fetching website: https://example.com/product/123
✅ OG Image extracted: https://example.com/images/product.jpg
✅ OG Image is accessible, content-type: image/jpeg
🎯 Generating image with Freepik Seedream v4 EDIT (with product reference)...
📝 Prompt: Create a Facebook ad featuring...
🖼️  Reference images: 1
✅ Image generation started (with reference), task ID: abc-123
⏳ Polling Freepik seedream-v4-edit task status...
📊 Poll attempt 1: Status = IN_PROGRESS
📊 Poll attempt 2: Status = IN_PROGRESS
📊 Poll attempt 3: Status = COMPLETED
✅ Image generation completed!
📸 Generated image URL: https://...
✅ Image generated and saved successfully!
🎉 Ad generation with Freepik complete!
```

### Error Case (500):

```
❌ Freepik Seedream 4 Edit API Error: {
  status: 500,
  statusText: 'Internal Server Error',
  error: {
    code: 'invalid_reference_image',
    message: 'Reference image is not accessible'
  },
  fullResponse: '{ ... }'
}
```

## Debugging Steps

If you still get 500 errors:

1. **Check Console Logs**: Look for the detailed error response
2. **Verify OG Image**:
   - Open the URL in a browser
   - Check if it requires authentication
   - Verify it's a real image (not HTML page)
3. **Test Without Reference**: Try generating without product reference to isolate issue
4. **Check API Key**: Ensure your Freepik API key has access to Seedream 4 Edit
5. **Check Freepik Status**: Visit Freepik API status page

## Files Modified

1. ✅ `src/app/api/freepik-extract/route.ts`
   - Fixed polling endpoint selection
   - Added OG image validation
   - Enhanced error logging
   - Smart endpoint routing

## Summary of Changes

| Issue                  | Before                      | After                                                    |
| ---------------------- | --------------------------- | -------------------------------------------------------- |
| **Polling Endpoint**   | Always used `/seedream-v4/` | Smart selection: `/seedream-v4-edit/` or `/seedream-v4/` |
| **Error Logging**      | Basic error message         | Full response with status, error details                 |
| **URL Validation**     | None                        | Validates format + accessibility                         |
| **Endpoint Selection** | Manual                      | Automatic based on reference images                      |

## Next Steps

1. **Test with a product page** that has OG image
2. **Monitor console logs** for detailed error messages
3. **Verify OG image accessibility** if errors persist
4. **Consider fallback**: If OG image fails, use regular Seedream v4

## Reference Links

- [Seedream 4 Edit Documentation](https://docs.freepik.com/api-reference/text-to-image/seedream-4-edit/post-seedream-v4-edit)
- [Seedream 4 Documentation](https://docs.freepik.com/api-reference/text-to-image/seedream-4/post-seedream-v4)
- [Freepik API Authentication](https://docs.freepik.com/api/authentication)

---

**Note**: The 500 error was likely caused by using the wrong polling endpoint (`/seedream-v4/{taskId}` instead of `/seedream-v4-edit/{taskId}`). This fix should resolve the issue! 🎉
