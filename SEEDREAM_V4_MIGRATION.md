# Migration to Freepik Seedream v4

## Overview

This document describes the migration from Freepik's Mystic API to the Seedream v4 API for image generation.

## What Changed

### API Endpoint

**Before (Mystic):**

```
POST https://api.freepik.com/v1/ai/mystic
GET https://api.freepik.com/v1/ai/mystic/{task_id}
```

**After (Seedream v4):**

```
POST https://api.freepik.com/v1/ai/text-to-image/seedream-v4
GET https://api.freepik.com/v1/ai/text-to-image/seedream-v4/{task_id}
```

### Parameters Changed

#### Removed Parameters (Mystic-specific)

- ❌ `resolution` (1k, 2k, 4k)
- ❌ `model` (realism, zen, flexible, fluid, super_real, editorial_portraits)
- ❌ `creative_detailing` (0-100)
- ❌ `engine` (automatic, magnific_illusio, etc.)
- ❌ `fixed_generation`
- ❌ `filter_nsfw`
- ❌ `structure_reference`
- ❌ `structure_strength`
- ❌ `style_reference`
- ❌ `adherence`
- ❌ `hdr`
- ❌ `styling` (styles, characters, colors)

#### New Parameters (Seedream v4)

- ✅ `guidance_scale` (0-20, default: 2.5) - Controls prompt adherence
- ✅ `seed` (0-2147483647, optional) - For reproducible results

#### Kept Parameters

- ✅ `prompt` (required)
- ✅ `aspect_ratio` (simplified options)
- ✅ `webhook_url` (optional)

### Aspect Ratio Options

**Seedream v4 supports 7 aspect ratios:**

- `square_1_1` - Square (1:1)
- `widescreen_16_9` - Widescreen (16:9)
- `social_story_9_16` - Social Story (9:16)
- `portrait_2_3` - Portrait (2:3)
- `traditional_3_4` - Traditional (3:4)
- `standard_3_2` - Standard (3:2)
- `classic_4_3` - Classic (4:3)

**Removed aspect ratios:**

- `smartphone_horizontal_20_9`
- `smartphone_vertical_9_20`
- `horizontal_2_1`
- `vertical_1_2`
- `social_5_4`
- `social_post_4_5`

## Files Modified

### 1. API Route (`src/app/api/freepik-image-gen/route.ts`)

- Updated interface to match Seedream v4 parameters
- Changed endpoint URL to Seedream v4
- Updated validation logic for new parameters
- Simplified request payload
- Updated logging messages

### 2. Component (`src/components/FreepikImageGenerator.tsx`)

- Removed resolution, model, and creative detailing controls
- Added guidance scale slider (0-20)
- Added seed input with checkbox toggle
- Updated UI to reflect Seedream v4 model
- Updated API request body structure

### 3. Documentation (`FREEPIK_API_SETUP.md`)

- Updated API endpoint references
- Updated parameter documentation
- Added guidance scale and seed documentation
- Removed Mystic-specific documentation
- Added parameter tuning guide
- Updated code examples

### 4. Test Page (`test-seedream-v4.html`)

- Created new standalone test page
- Interactive form with all Seedream v4 parameters
- Real-time polling and status updates
- Image display with download links
- Detailed logging console

## Key Benefits of Seedream v4

### Simplicity

- Fewer parameters to configure
- Easier to understand and use
- Less complex API surface

### Reproducibility

- `seed` parameter for consistent results
- Great for A/B testing and iterations
- Useful for generating variations

### Control

- `guidance_scale` provides fine-tuned control
- Clear range and behavior (0-20)
- Easier to predict output behavior

## Migration Guide for Existing Code

If you have existing code using the Mystic API, here's how to migrate:

### Before (Mystic)

```typescript
const response = await fetch('/api/freepik-image-gen', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'a beautiful landscape',
    resolution: '2k',
    model: 'realism',
    creative_detailing: 50,
    aspect_ratio: 'widescreen_16_9',
  }),
});
```

### After (Seedream v4)

```typescript
const response = await fetch('/api/freepik-image-gen', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'a beautiful landscape',
    aspect_ratio: 'widescreen_16_9',
    guidance_scale: 5.0, // Adjust based on desired prompt adherence
    seed: 12345, // Optional: for reproducibility
  }),
});
```

## Parameter Conversion Guide

| Mystic Parameter     | Seedream v4 Equivalent | Notes                               |
| -------------------- | ---------------------- | ----------------------------------- |
| `resolution`         | N/A                    | Resolution is handled automatically |
| `model`              | N/A                    | Single model, no selection needed   |
| `creative_detailing` | `guidance_scale`       | Different scale (0-20 vs 0-100)     |
| `hdr`                | `guidance_scale`       | Use higher values for more detail   |
| `adherence`          | `guidance_scale`       | Direct mapping of concept           |
| `engine`             | N/A                    | Automatic                           |
| `fixed_generation`   | `seed`                 | Use seed for consistency            |

## Guidance Scale Recommendations

Based on use case:

- **Artistic/Creative (0-5)**: More freedom, loose interpretation
- **Balanced (5-10)**: Good mix of creativity and accuracy
- **Precise (10-15)**: Strong prompt adherence
- **Strict (15-20)**: Very literal interpretation

## Testing

### Test the Implementation

1. Start your development server: `npm run dev`
2. Open `test-seedream-v4.html` in a browser
3. Try different prompts and parameters
4. Verify image generation and polling work correctly

### Test the Component

1. Navigate to the page using `FreepikImageGenerator` component
2. Test with various prompts and settings
3. Verify seed reproducibility by using the same seed multiple times

## Troubleshooting

### Common Issues

**Error: "guidance_scale must be between 0 and 20"**

- Ensure guidance_scale is within valid range
- Default is 2.5 if not specified

**Error: "seed must be between 0 and 2147483647"**

- Ensure seed is a valid integer
- Seed is optional, omit if not needed

**Images not generating**

- Check API key in `.env.local`
- Verify endpoint is accessible
- Check browser console for errors
- Review server logs for detailed errors

## Resources

- [Seedream v4 API Documentation](https://docs.freepik.com/api-reference/text-to-image/seedream-4/post-seedream-v4)
- [Freepik API Dashboard](https://www.freepik.com/api/dashboard)
- [Project Documentation](./FREEPIK_API_SETUP.md)

## Notes

- The migration maintains backward compatibility at the API route level (`/api/freepik-image-gen`)
- Response format remains the same (task_id, status, generated array)
- Polling mechanism unchanged
- Webhook support still available
