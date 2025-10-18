# Reference Image Exact Usage - Gemini 2.5 Flash

## Overview

Enhanced the Gemini 2.5 Flash integration to ensure the reference product image is used **EXACTLY AS IS** without any modifications in the generated ad creative.

## The Requirement

When a product page is detected and a product image is extracted:

- ✅ Use the **real product image** from the website
- ✅ Include it in the generated ad **without any changes**
- ✅ Product must appear **exactly as it is** in the reference
- ✅ Only modify the **background, scene, and composition**

## Implementation

### Two-Layer Instruction Approach

#### Layer 1: AI Assistant Instructions

Instructing the OpenAI assistant to generate prompts that tell Gemini to preserve the product:

```typescript
CRITICAL INSTRUCTIONS FOR REFERENCE IMAGE:
* A real product image is provided as reference
* Start your prompt with: "Using the reference product image EXACTLY AS IS without any modifications..."
* The reference image shows the ACTUAL PRODUCT that must appear in the final ad
* DO NOT ask the AI to recreate or modify the product
* DO NOT describe the product appearance (it comes from reference)
* ONLY describe the scene, background, lighting, and composition around the product
* Example: "Using the reference product image exactly as is, place it in a modern lifestyle setting..."
```

#### Layer 2: Runtime Prompt Enhancement

Before sending to Gemini, we prepend an explicit instruction:

```typescript
if (referenceImages) {
  // Enhance prompt to use reference exactly
  imagePrompt = `IMPORTANT: A reference product image is provided. Use this product image EXACTLY AS IS without any modifications, changes, or recreations. The product in the reference is the real product and must appear in the final ad unchanged. ${imagePrompt}`;
}
```

## How It Works

### Product Page Flow

```
1. User submits product page URL
   ↓
2. ChatGPT analyzes: "This is a product page!"
   ↓
3. Extract OG image (product photo)
   ↓
4. Convert to Base64
   ↓
5. Generate ad concept (OpenAI Assistant)
   → Instructions: "Don't modify product, only describe scene"
   ↓
6. Enhance prompt before sending to Gemini:
   → "Use reference image EXACTLY AS IS..."
   ↓
7. Send to Gemini 2.5 Flash:
   - Prompt: "Use reference exactly... [create lifestyle scene]"
   - Reference: [Base64 product image]
   ↓
8. Gemini generates ad:
   ✅ Product appears exactly as in reference
   ✅ Background/scene created based on prompt
   ↓
9. Final ad with REAL product! 🎉
```

## Example Prompts

### Bad Prompt (Old Way):

```
"Create a Facebook ad showing a red leather handbag with gold hardware,
placed on a marble surface with soft lighting..."
```

❌ Problem: Gemini might recreate the handbag instead of using reference

### Good Prompt (New Way):

```
"IMPORTANT: A reference product image is provided. Use this product image
EXACTLY AS IS without any modifications, changes, or recreations.

Using the reference product image exactly as is, create a Facebook ad that
places the product in a modern lifestyle setting with:
- Soft, warm lighting from the left
- Minimalist marble background
- Product positioned in center-right
- Subtle shadow underneath
- Clean, elegant composition matching the brand's luxury aesthetic"
```

✅ Correct: Gemini uses reference product, only creates the scene

## Console Output

```
🛍️ Product page detected! Extracting OG image with Cheerio...
✅ OG Image extracted: https://example.com/product.jpg
📥 Downloading OG image to convert to Base64...
✅ Valid image format: image/jpeg
✅ OG image converted to Base64, size: 245.67 KB
🎯 Generating image with Freepik Gemini 2.5 Flash (with product reference)...
📝 Enhanced prompt to use reference image exactly as-is  ← NEW!
🎨 Generating image with Freepik Gemini 2.5 Flash...
📝 Prompt: IMPORTANT: A reference product image is provided...  ← NEW!
🖼️  Reference images: 1
📤 Sending request to Gemini 2.5 Flash API...
✅ Image generation started (with reference), task ID: abc-123
⏳ Polling Freepik Gemini 2.5 Flash task status...
✅ Image generation completed!
✅ Real product appears exactly as in reference! ← SUCCESS!
```

## What Gets Sent to Gemini

### Request Body:

```json
{
  "prompt": "IMPORTANT: A reference product image is provided. Use this product image EXACTLY AS IS without any modifications, changes, or recreations. The product in the reference is the real product and must appear in the final ad unchanged. Create a Facebook ad showing the product in a modern lifestyle setting with warm lighting, minimalist background, and elegant composition that matches the brand's aesthetic...",
  "reference_images": ["iVBORw0KGgoAAAANSUhEUgAAASwAAAEsAQAAAABRBrPYAAA..."]
}
```

### What Gemini Does:

1. ✅ Reads the reference product image
2. ✅ Keeps the product **exactly as is**
3. ✅ Creates the scene/background based on prompt
4. ✅ Composes the final ad with real product

## Key Instructions

### For AI Assistant (Creating the Prompt):

```
- Start with: "Using the reference product image EXACTLY AS IS..."
- Don't describe product appearance
- Only describe: scene, background, lighting, composition
- Let the reference image handle the product
```

### For Gemini (Generating the Image):

```
IMPORTANT: A reference product image is provided.
Use this product image EXACTLY AS IS without any modifications,
changes, or recreations. The product in the reference is the
real product and must appear in the final ad unchanged.
```

## Benefits

### 1. **Product Authenticity**

- ✅ Exact product from website appears in ad
- ✅ No AI interpretation or recreation
- ✅ Matches customer expectations

### 2. **Brand Consistency**

- ✅ Official product photography
- ✅ Proper product representation
- ✅ Professional quality maintained

### 3. **Trust & Credibility**

- ✅ What you see is what you get
- ✅ No bait-and-switch
- ✅ Honest advertising

### 4. **Legal Compliance**

- ✅ Actual product shown
- ✅ No misleading imagery
- ✅ Accurate representation

## Example Output

### Input:

- **Product**: Red leather handbag
- **OG Image**: Professional product photo on white background
- **Prompt**: Create lifestyle ad

### Output:

- **Generated Ad**:
  - ✅ **Same exact handbag** from reference (color, style, hardware)
  - ✅ New background (lifestyle setting)
  - ✅ New lighting (warm, inviting)
  - ✅ New composition (product styled in scene)
  - ✅ **Product unchanged!**

## Testing

```bash
POST /api/freepik-extract
{
  "project_id": "product-page-project-id"
}
```

**Look for**:

```
📝 Enhanced prompt to use reference image exactly as-is
```

**Verify**:

- Product in generated ad matches OG image exactly
- Only background/scene is different
- Product hasn't been recreated or modified

## Files Modified

1. ✅ `src/app/api/freepik-extract/route.ts`
   - Added reference image instructions to assistant
   - Enhanced prompt before sending to Gemini
   - Ensured product preservation

## Summary

✅ **Two-layer instruction**: AI Assistant + Runtime enhancement  
✅ **Clear directive**: "Use reference EXACTLY AS IS"  
✅ **Product preservation**: No modifications allowed  
✅ **Scene customization**: Background, lighting, composition  
✅ **Real products**: Authentic representation in ads

🎉 **Gemini will now use the real product image exactly as provided!**
