# Product Image Integration for Ad Generation

## Overview

This enhancement automatically detects product pages and extracts real product images to include in generated ad creatives, ensuring that the actual product is displayed instead of AI-generated dummy products.

## What Changed

### 1. **Freepik-Extract Route** (`src/app/api/freepik-extract/route.ts`)

#### Enhanced Screenshot Analysis

- Added product page detection to the screenshot analysis
- New fields in `ScreenshotAnalysis` type:
  - `pageType`: Identifies if it's a product_page, home_page, or landing_page
  - `isProductPage`: Boolean flag for product pages
  - `hasMainProduct`: Indicates if a main product is visible
  - `mainProductDescription`: Brief description of the product

#### Product Extraction Flow

Added new Step 3.5 in the main POST function:

1. **Detect Product Page**: After screenshot analysis, check if it's a product page
2. **Extract Product Coordinates**: Call `/api/product-extraction` to get product location
3. **Crop Product Image**: Call `/api/extract-product-image` to extract and save the real product image
4. **Include in Ad Generation**: Pass the extracted product image URL to the AI assistant

#### Updated Seedream v4 Integration

- Migrated from Freepik Mystic API to Seedream v4
- Updated endpoint: `https://api.freepik.com/v1/ai/text-to-image/seedream-v4`
- Simplified parameters (removed model, resolution, etc.)
- Uses `guidance_scale: 7.5` for better prompt adherence

#### AI Assistant Integration

Enhanced the prompt sent to the OpenAI assistant to include:

- Product page detection status
- Real product image URL (if available)
- Instructions to incorporate the real product into ad creatives
- Clear marking that this is the actual product (not a dummy)

#### Response Enhancement

Added `productExtraction` field to the response containing:

- `croppedProductImage`: URL of the extracted product image
- `productDescription`: Description of the product
- `isProductPage`: Boolean flag
- `coordinates`: Bounding box coordinates of the product
- `usedRealProductImage`: Flag indicating if real product was used

### 2. **Extract Product Image API** (`src/app/api/extract-product-image/route.ts`)

New endpoint to crop and save product images:

- **Endpoint**: `POST /api/extract-product-image`
- **Purpose**: Extracts specific product from screenshot using coordinates
- **Process**:
  1. Fetches project data from Supabase
  2. Gets product coordinates from `url_analysis.product_extraction`
  3. Downloads screenshot
  4. Crops product using Sharp image processing library
  5. Uploads cropped image to Supabase Storage
  6. Returns public URL of the product image

**Request Body**:

```json
{
  "project_id": "string",
  "product_index": 0 // Which product to extract (default: 0 for main product)
}
```

**Response**:

```json
{
  "success": true,
  "product_image_url": "https://...",
  "product_description": "...",
  "product_category": "...",
  "coordinates": {
    "x": 100,
    "y": 200,
    "width": 400,
    "height": 400
  }
}
```

### 3. **Reverted Changes** (`src/app/api/analyze-snapshot/route.ts`)

- Kept the original functionality intact
- No product extraction logic in this file
- All product handling moved to `freepik-extract` route only

## How It Works

### User Flow

1. **User submits website URL**
2. **Screenshot Analysis** (`/api/analyzing-points`)
   - Captures website screenshot
   - Stores in Supabase

3. **Page Type Detection** (`/api/freepik-extract`)
   - Analyzes screenshot with GPT-4 Vision
   - Detects if it's a product page
   - Identifies if main product is visible

4. **Product Extraction** (automatic if product page detected)
   - Extracts product coordinates from screenshot
   - Crops and saves real product image
   - Stores product image URL

5. **Ad Generation** (with real product)
   - AI generates ad concepts with the real product image
   - Freepik Seedream v4 creates ad creatives
   - Real product is incorporated into the final ad

### Example Workflow

```
Product Page URL
    ↓
Screenshot Analysis
    ↓
✅ Product Page Detected!
    ↓
Extract Product Coordinates
    ↓
Crop & Save Product Image
    ↓
Generate Ad with Real Product
    ↓
Final Ad Creative with Actual Product
```

## Benefits

### 1. **Authenticity**

- Uses actual product photos instead of AI-generated approximations
- Maintains brand consistency and product accuracy

### 2. **Better Ad Performance**

- Real products resonate better with customers
- No mismatch between ad and actual product
- Builds trust and credibility

### 3. **Automated Detection**

- Automatically identifies product pages
- No manual intervention required
- Seamless integration into existing workflow

### 4. **Fallback Support**

- If product extraction fails, continues with normal flow
- Home pages and landing pages work as before
- Graceful error handling

## API Endpoints

### 1. Product Extraction

```
POST /api/product-extraction
Body: { "project_id": "..." }
```

### 2. Extract Product Image

```
POST /api/extract-product-image
Body: { "project_id": "...", "product_index": 0 }
```

### 3. Freepik Extract (with product integration)

```
POST /api/freepik-extract
Body: { "project_id": "..." }
```

## Database Schema

### Projects Table - `url_analysis` Field

```json
{
  "website_url": "...",
  "snapshotanalysis": {
    "pageType": "product_page",
    "isProductPage": true,
    "hasMainProduct": true,
    "mainProductDescription": "Red leather handbag with gold hardware",
    "colors": { ... },
    "visualElements": "...",
    ...
  },
  "product_extraction": {
    "productsDetected": true,
    "productCount": 1,
    "products": [
      {
        "id": 1,
        "coordinates": { "x": 100, "y": 200, "width": 400, "height": 400 },
        "description": "Main product image",
        "category": "Fashion",
        ...
      }
    ]
  },
  "cropped_product_image": "https://supabase-url/product-image.png"
}
```

## Environment Variables Required

```env
# Existing
FREEPIK_API_KEY=your_freepik_api_key
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional (for local development)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Testing

### Test with a Product Page

1. **Start the dev server**:

   ```bash
   npm run dev
   ```

2. **Test the flow**:
   - Submit a product page URL (e.g., Amazon product, Shopify product page)
   - Check console logs for "🛍️ Product page detected!"
   - Verify that product image is extracted
   - Check final ad creative includes the real product

3. **Expected console output**:
   ```
   📸 Analyzing screenshot...
   🛍️ Product page detected! Extracting real product image...
   📦 Product: Red leather handbag
   ✅ Product coordinates extracted
   ✂️ Cropping product image...
   ✅ Real product image extracted: https://...
   🎨 Generating ad with real product...
   ✅ Ad generation complete!
   ```

### Test with a Home Page

1. Submit a home page URL
2. Expected: Normal flow without product extraction
3. Console log: "ℹ️ Not a product page or no main product detected"

## Error Handling

- Product extraction failures don't block ad generation
- Graceful fallback to normal flow
- Detailed error logging for debugging
- All errors are caught and logged

## Performance Considerations

- Product extraction adds ~3-5 seconds to the workflow
- Only runs for product pages (automatic detection)
- Asynchronous processing
- Cached product images in Supabase

## Future Enhancements

1. **Multiple Product Support**: Extract multiple products from catalog pages
2. **Product Variants**: Support for color/size variations
3. **Smart Product Selection**: AI-powered selection of best product image
4. **Image Optimization**: Automatic background removal, resizing
5. **A/B Testing**: Generate variants with/without real product

## Notes

- Uses Sharp library for image processing (fast and efficient)
- Supabase Storage for image hosting
- GPT-4 Vision for product detection
- Freepik Seedream v4 for ad generation
- All changes are backward compatible
