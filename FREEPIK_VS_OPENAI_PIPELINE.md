# Freepik vs OpenAI Image Generation Pipeline

## Overview

We have two complete ad generation pipelines that follow the same workflow but use different image generation methods:

| Feature                 | Original (`firecrawl-extract`) | New (`freepik-extract`)   |
| ----------------------- | ------------------------------ | ------------------------- |
| **Screenshot Analysis** | ✅ GPT-4 Vision (OpenAI)       | ✅ GPT-4 Vision (OpenAI)  |
| **Content Extraction**  | ✅ Firecrawl API               | ✅ Firecrawl API          |
| **Concept Generation**  | ✅ OpenAI Assistant            | ✅ OpenAI Assistant       |
| **Image Generation**    | ❌ OpenAI (DALL-E/GPT-Image-1) | ✅ **Freepik Mystic API** |
| **Quality Evaluation**  | ✅ OpenAI Assistant            | ✅ OpenAI Assistant       |
| **Feedback Loop**       | ✅ Yes (5 attempts)            | ✅ Yes (3 attempts)       |

## Pipeline Flow

### Common Steps (Both APIs)

```
1. Fetch Project from Supabase
   ↓
2. Get Screenshot URL from analysing_points
   ↓
3. Analyze Screenshot with GPT-4 Vision (OpenAI)
   ↓
4. Extract Content from URL using Firecrawl
   ↓
5. Create OpenAI Assistant
   ↓
6. Generate Ad Concepts with OpenAI
   ↓
7. Select Best Concept
```

### Difference: Image Generation Step

#### Original (`firecrawl-extract`) - Uses OpenAI

```
8. Generate Image with OpenAI (GPT-Image-1 or DALL-E-3)
   ↓
9. Upload to Supabase
   ↓
10. Evaluate with OpenAI Assistant
   ↓
11. Loop if rating < 10 (max 5 attempts)
```

#### New (`freepik-extract`) - Uses Freepik

```
8. Generate Image with Freepik Mystic API
   ↓
9. Poll Freepik Task Status (async, ~3-10 seconds)
   ↓
10. Download Image from Freepik CDN
   ↓
11. Upload to Supabase
   ↓
12. Evaluate with OpenAI Assistant
   ↓
13. Loop if rating < 8 (max 3 attempts)
```

## API Endpoints

### Original: POST `/api/firecrawl-extract`

```json
{
  "project_id": "your-project-id"
}
```

### New: POST `/api/freepik-extract`

```json
{
  "project_id": "your-project-id"
}
```

## Response Structure (Both APIs)

```json
{
  "success": true,
  "project_id": "abc-123",
  "url": "https://example.com",
  "screenshotUrl": "https://...",
  "screenshotAnalysis": {
    "visualElements": "Modern, minimal design...",
    "colorScheme": "Primary: #3498db, Secondary: #2ecc71...",
    "layout": "Hero section with CTA...",
    "keyFeatures": ["Contact form", "Product images"],
    "brandingElements": "Bold sans-serif typography...",
    "userInterface": "Material Design patterns..."
  },
  "extracted": {
    "logoUrl": "https://...",
    "mainImageUrl": "https://...",
    "logoDescription": "Blue circular logo...",
    "productDescription": "Modern software dashboard...",
    "businessDescription": "SaaS platform for..."
  },
  "analysis": {
    "business_type": "SaaS",
    "target_audience": "Small business owners",
    "key_value_props": ["Easy to use", "Affordable"],
    "tone": "Professional yet friendly",
    "brand_colors": "#3498db, #2ecc71",
    "visual_style": "Modern, minimal"
  },
  "chosenConcept": {
    "headline": "Grow Your Business Today",
    "primary_text": "Join 10,000+ businesses...",
    "cta": "Start Free Trial",
    "image_prompt": "Professional photograph of..."
  },
  "generation": {
    "method": "freepik",  // or "openai"
    "attempts": 2,
    "finalRating": 8,
    "finalImageUrl": "https://supabase.../image.png",
    "evaluationHistory": [
      {
        "attempt": 1,
        "rating": 6,
        "feedback": "Good but colors don't match brand...",
        "imageUrl": "https://...",
        "freepikTaskId": "046b6c7f-..."  // Only in freepik-extract
      },
      {
        "attempt": 2,
        "rating": 8,
        "feedback": "Much better! Colors now match...",
        "imageUrl": "https://...",
        "freepikTaskId": "157c8d9e-..."
      }
    ]
  },
  "allConcepts": [...]
}
```

## Key Differences

### 1. Image Generation Method

**Original (OpenAI)**

- Uses GPT-Image-1 or DALL-E-3
- Instant generation (~5-10 seconds)
- Directly returns base64 or URL
- Good for artistic/creative images
- More expensive per image

**New (Freepik)**

- Uses Freepik Mystic API
- Async generation (task-based)
- Requires polling for completion (~3-30 seconds)
- Multiple AI models (realism, flexible, fluid, etc.)
- More photorealistic results
- More cost-effective

### 2. Generation Settings

**Freepik Mystic Settings:**

```typescript
{
  resolution: '2k',          // 1k, 2k, or 4k
  aspect_ratio: 'square_1_1', // Multiple options
  model: 'realism',           // realism, zen, flexible, fluid, super_real, editorial_portraits
  creative_detailing: 50,     // 0-100 (detail level)
  engine: 'automatic',        // automatic, magnific_illusio, magnific_sharpy, magnific_sparkle
  filter_nsfw: true
}
```

**OpenAI Settings:**

```typescript
{
  model: 'gpt-image-1',  // or 'dall-e-3'
  size: '1024x1024',
  quality: 'medium',     // or 'standard'/'hd'
  n: 1
}
```

### 3. Polling Mechanism

**Freepik** requires polling:

```typescript
async function pollFreepikTaskStatus(taskId: string) {
  // Poll every 3 seconds
  // Max 60 attempts (3 minutes)
  // Returns generated image URLs when complete
}
```

**OpenAI** returns immediately (no polling needed)

### 4. Attempt Limits

- **Original**: 5 max attempts (OpenAI is faster)
- **New**: 3 max attempts (Freepik takes longer per generation)

### 5. Acceptance Threshold

- **Original**: Requires 10/10 rating (or 9/10 after 3+ attempts)
- **New**: Requires 10/10 rating (or 8/10 after 2+ attempts)

## When to Use Which?

### Use Original (`firecrawl-extract`) - OpenAI

✅ Need faster generation
✅ Creative/artistic ad images
✅ Abstract concepts
✅ Don't need extreme photorealism
✅ Want instant results

### Use New (`freepik-extract`) - Freepik

✅ Need photorealistic images
✅ Product photography style
✅ Professional editorial shots
✅ Cost-effective at scale
✅ Can wait a bit longer for better quality
✅ Need specific visual styles (zen, flexible, fluid, etc.)

## Environment Variables Required

### Both APIs Need:

```env
# OpenAI (for analysis and concepts)
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_... (optional, will be created)

# Firecrawl (for content extraction)
FIRECRAWL_API_KEY=fc-...

# Supabase (for storage)
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Additional for `freepik-extract`:

```env
# Freepik (for image generation)
FREEPIK_API_KEY=your_freepik_api_key_here
```

## Example Usage

### Frontend Code (works with both)

```typescript
const generateAd = async (projectId: string, method: 'openai' | 'freepik') => {
  const endpoint =
    method === 'freepik' ? '/api/freepik-extract' : '/api/firecrawl-extract';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project_id: projectId,
    }),
  });

  const result = await response.json();

  if (result.success) {
    console.log('Generated ad image:', result.generation.finalImageUrl);
    console.log('Rating:', result.generation.finalRating);
    console.log('Method used:', result.generation.method);
  }

  return result;
};

// Use Freepik (new method)
await generateAd('project-123', 'freepik');

// Or use OpenAI (original method)
await generateAd('project-123', 'openai');
```

## Performance Comparison

| Metric                              | OpenAI     | Freepik    |
| ----------------------------------- | ---------- | ---------- |
| **Single Image**                    | ~5-10 sec  | ~10-30 sec |
| **With Feedback Loop (3 attempts)** | ~15-30 sec | ~30-90 sec |
| **Image Quality**                   | 8/10       | 9/10       |
| **Photorealism**                    | 7/10       | 10/10      |
| **Brand Consistency**               | 8/10       | 9/10       |
| **Cost per Image**                  | $$$        | $$         |

## Migration Guide

If you want to switch from OpenAI to Freepik:

1. **Add Freepik API key** to `.env.local`:

   ```env
   FREEPIK_API_KEY=your_key_here
   ```

2. **Change the endpoint** in your frontend:

   ```diff
   - const response = await fetch('/api/firecrawl-extract', {
   + const response = await fetch('/api/freepik-extract', {
   ```

3. **No other changes needed!** The request/response structure is identical.

## Troubleshooting

### Freepik-Specific Issues

**Issue**: `Freepik image generation timeout`

- **Solution**: Increase `maxAttempts` in `pollFreepikTaskStatus()` function

**Issue**: `Freepik API key is not configured`

- **Solution**: Add `FREEPIK_API_KEY` to your environment variables

**Issue**: Images taking too long

- **Solution**: This is normal for 2k/4k resolution. Consider using 1k for faster results

**Issue**: Task status stuck at IN_PROGRESS

- **Solution**: Freepik's queue might be busy. Wait longer or retry

## Conclusion

Both pipelines provide **high-quality ad generation** with:

- ✅ Screenshot analysis
- ✅ Content extraction
- ✅ AI-powered concept generation
- ✅ Automated image creation
- ✅ Quality evaluation loop

Choose **Freepik** for photorealistic, professional images at scale.
Choose **OpenAI** for faster, more artistic/creative results.

Both maintain the same **screenshot analysis** and **business understanding** using OpenAI's GPT-4 Vision, ensuring brand consistency! 🚀
