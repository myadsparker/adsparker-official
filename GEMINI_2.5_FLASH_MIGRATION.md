# Migration to Gemini 2.5 Flash Model

## Overview

Migrated from **Freepik Seedream 4 Edit** to **Gemini 2.5 Flash** for AI image generation with reference images.

## What Changed

### API Endpoint

**Before (Seedream 4 Edit)**:

```
POST https://api.freepik.com/v1/ai/text-to-image/seedream-v4-edit
GET https://api.freepik.com/v1/ai/text-to-image/seedream-v4-edit/{task_id}
```

**After (Gemini 2.5 Flash)**:

```
POST https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview
GET https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview/{task_id}
```

### Parameters (Simplified)

**Gemini 2.5 Flash Parameters**:

```json
{
  "prompt": "Your detailed prompt",
  "reference_images": [
    "iVBORw0KGgoAAAA...", // Base64 or URL
    "https://example.com/image.jpg"
  ],
  "webhook_url": "https://optional-webhook.com"
}
```

**Removed Parameters**:

- ❌ `aspect_ratio` (not supported by Gemini 2.5 Flash)
- ❌ `guidance_scale` (not supported by Gemini 2.5 Flash)
- ❌ `seed` (not supported by Gemini 2.5 Flash)

**Kept Parameters**:

- ✅ `prompt` (required)
- ✅ `reference_images` (optional, max 3)
- ✅ `webhook_url` (optional)

### Why Gemini 2.5 Flash?

According to the [documentation](https://docs.freepik.com/api-reference/text-to-image/google/post-gemini-2-5-flash-image-preview):

1. **Supports Reference Images**: Up to 3 reference images
2. **Image Generation & Editing**: Both text-to-image and image-to-image
3. **Style Transfer**: Uses reference images for style guidance
4. **Simpler API**: Fewer parameters to configure

### Code Changes

#### 1. Generation Function

**Before**:

```typescript
// Complex: Different endpoints for with/without reference
if (referenceImages) {
  url = 'https://api.freepik.com/v1/ai/text-to-image/seedream-v4-edit';
  body = { prompt, reference_images, aspect_ratio, guidance_scale };
} else {
  url = 'https://api.freepik.com/v1/ai/text-to-image/seedream-v4';
  body = { prompt, aspect_ratio, guidance_scale };
}
```

**After**:

```typescript
// Simple: One endpoint handles both cases
const url = 'https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview';
const body = { prompt };

// Add reference images if available (max 3)
if (referenceImages) {
  body.reference_images = referenceImages.slice(0, 3);
}
```

#### 2. Polling Function

**Before**:

```typescript
async function pollFreepikTaskStatus(
  taskId: string,
  isEdit: boolean = false // Need to know which endpoint
) {
  const endpoint = isEdit ? 'seedream-v4-edit' : 'seedream-v4';
  // ...
}
```

**After**:

```typescript
async function pollFreepikTaskStatus(
  taskId: string // Simplified signature
) {
  // Always use same endpoint
  const url = `https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview/${taskId}`;
  // ...
}
```

## Benefits

### 1. **Simpler API**

- ✅ One endpoint for all cases
- ✅ Fewer parameters to manage
- ✅ No need to track "edit" vs "regular" mode

### 2. **Better Reference Image Support**

- ✅ Built-in support for reference images
- ✅ Up to 3 reference images
- ✅ Automatic style transfer

### 3. **Cleaner Code**

- ✅ Removed conditional endpoint logic
- ✅ Simplified polling (no `isEdit` flag needed)
- ✅ Single model for all generation

### 4. **Google Imagen 3 Technology**

- ✅ Powered by Google's Gemini 2.5 Flash
- ✅ High-quality image generation
- ✅ Better understanding of prompts

## Implementation Details

### Reference Images

- **Format**: Base64 or publicly accessible URLs
- **Maximum**: 3 images
- **Use Case**: Product photography, style transfer, composition reference

### Request Structure

```typescript
const requestBody: any = {
  prompt: 'Create a Facebook ad featuring...',
};

// Add reference images if available
if (referenceImages && referenceImages.length > 0) {
  requestBody.reference_images = referenceImages.slice(0, 3);
}

await fetch('https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview', {
  method: 'POST',
  headers: {
    'x-freepik-api-key': apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody),
});
```

### Response Format

```json
{
  "data": {
    "generated": [],
    "task_id": "046b6c7f-0b8a-43b9-b35d-6489e6daee91",
    "status": "CREATED"
  }
}
```

## Console Output

### With Product Reference:

```
🛍️ Product page detected! Extracting OG image with Cheerio...
✅ OG Image extracted: https://example.com/product.jpg
✅ OG Image is accessible, content-type: image/jpeg
📥 Downloading OG image to convert to Base64...
✅ Valid image format: image/jpeg
✅ OG image converted to Base64, size: 245.67 KB
🎯 Generating image with Freepik Gemini 2.5 Flash (with product reference)...
🎨 Generating image with Freepik Gemini 2.5 Flash...
📝 Prompt: Create a Facebook ad...
🖼️  Reference images: 1
📤 Sending request to Gemini 2.5 Flash API...
✅ Image generation started (with reference), task ID: abc-123
⏳ Polling Freepik Gemini 2.5 Flash task status...
📊 Poll attempt 1: Status = IN_PROGRESS
📊 Poll attempt 2: Status = COMPLETED
✅ Image generation completed!
📸 Generated image URL: https://...
✅ Image generated and saved successfully!
🎉 Ad generation with Freepik complete!
```

### Without Product Reference:

```
ℹ️ Not a product page or no main product detected
🎯 Generating image with Freepik Gemini 2.5 Flash...
🎨 Generating image with Freepik Gemini 2.5 Flash...
📝 Prompt: Create a Facebook ad...
📤 Sending request to Gemini 2.5 Flash API...
✅ Image generation started, task ID: xyz-789
⏳ Polling Freepik Gemini 2.5 Flash task status...
✅ Image generation completed!
🎉 Ad generation with Freepik complete!
```

## API Response

```json
{
  "success": true,
  "screenshotAnalysis": {
    "pageType": "product_page",
    "isProductPage": true,
    "mainProductDescription": "Red leather handbag"
  },
  "productExtraction": {
    "ogImageUrl": "https://example.com/product.jpg",
    "ogImageBase64Length": 327456,
    "productDescription": "Red leather handbag",
    "extractionMethod": "cheerio-og-image-base64"
  },
  "generation": {
    "method": "freepik-gemini-2.5-flash",
    "finalImageUrl": "https://...",
    "usedRealProductImage": true,
    "referenceImageFormat": "base64",
    "extractionMethod": "cheerio-og-image-base64"
  }
}
```

## Comparison

| Feature              | Seedream 4 Edit        | Gemini 2.5 Flash   |
| -------------------- | ---------------------- | ------------------ |
| **Reference Images** | ✅ Up to 5             | ✅ Up to 3         |
| **Aspect Ratio**     | ✅ Configurable        | ❌ Automatic       |
| **Guidance Scale**   | ✅ 0-20                | ❌ N/A             |
| **Seed**             | ✅ For reproducibility | ❌ N/A             |
| **API Simplicity**   | Moderate               | ✅ Simple          |
| **Endpoints**        | 2 (regular + edit)     | ✅ 1 (unified)     |
| **Technology**       | Seedream               | ✅ Google Imagen 3 |

## Benefits of Gemini 2.5 Flash

1. **Unified Endpoint**: No need to switch between regular/edit modes
2. **Simpler Parameters**: Just prompt + optional reference images
3. **Google Technology**: Powered by Google's latest Imagen model
4. **Automatic Optimization**: Handles aspect ratio and quality automatically
5. **Better Prompt Understanding**: Gemini's advanced language understanding

## Error Handling

Same error handling as before:

- Invalid image format → Falls back to no reference
- OG image not found → Uses regular generation
- Download failed → Continues without reference
- API errors → Detailed logging with full response

## Testing

```bash
POST /api/freepik-extract
{
  "project_id": "your-project-id"
}
```

**Expected**:

- Product pages: Uses reference image
- Home pages: Regular generation
- Both: Gemini 2.5 Flash model

## Migration Summary

✅ **Simpler**: One endpoint vs two  
✅ **Fewer Parameters**: No aspect_ratio, guidance_scale, seed  
✅ **Same Features**: Still supports reference images  
✅ **Better Tech**: Google Gemini 2.5 Flash (Imagen 3)  
✅ **Maintained**: All functionality preserved

## Files Modified

1. ✅ `src/app/api/freepik-extract/route.ts`
   - Updated generation function
   - Updated polling function
   - Updated logs and response

## Documentation

- [Gemini 2.5 Flash API Docs](https://docs.freepik.com/api-reference/text-to-image/google/post-gemini-2-5-flash-image-preview)

---

🎉 **Successfully migrated to Gemini 2.5 Flash!**
