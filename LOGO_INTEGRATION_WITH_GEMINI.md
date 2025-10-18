# Logo Integration with Gemini 2.5 Flash

## Overview

Successfully integrated **automatic logo extraction and inclusion** into the Freepik-Gemini 2.5 Flash ad generation pipeline. The system now:

1. ✅ Extracts company logos from any website using PushOwl API
2. ✅ Saves logos to Supabase storage
3. ✅ Converts logos to Base64 for AI processing
4. ✅ Passes logos as reference images to Gemini 2.5 Flash
5. ✅ Instructs Gemini to include logos prominently in generated ads

---

## API Endpoint

**Route**: `/api/freepik-extract`

**Method**: `POST`

**Request Body**:

```json
{
  "project_id": "your-project-id"
}
```

---

## How It Works

### Step 1: Logo Extraction

```typescript
// Extracts domain from URL (removes https://, www, paths, ports)
const domain = extractDomain(websiteUrl); // e.g., "pushowl.com"

// Calls PushOwl API
const apiUrl = `https://getlogo.pushowl.com/api/${domain}`;
```

**PushOwl API Response**:

- `{ "url": "https://example.com/logo.png" }` - Logo as URL
- `{ "svg": "<svg>...</svg>" }` - Logo as SVG

### Step 2: Save to Supabase

```typescript
// Convert to buffer
const logoBuffer = Buffer.from(response.data);

// Save to Supabase storage
await supabase.storage
  .from('project-files')
  .upload(`${projectId}/logos/${domain}-logo-${timestamp}.png`, logoBuffer);
```

**Storage Path**: `project-files/{project_id}/logos/{domain}-logo-{timestamp}.{ext}`

### Step 3: Convert to Base64

```typescript
// Convert for Gemini reference
const logoBase64 = logoBuffer.toString('base64');
```

### Step 4: Pass to Gemini 2.5 Flash

```typescript
// Prepare reference images array (max 3 for Gemini)
const referenceImages = [];

// Priority 1: Product image (if available)
if (productReferenceImage) {
  referenceImages.push(productReferenceImage);
}

// Priority 2: Company logo
if (logoBase64) {
  referenceImages.push(logoBase64);
}

// Generate with Gemini
await generateImageWithFreepik(prompt, referenceImages);
```

### Step 5: Gemini Instructions

The system enhances the prompt with specific logo instructions:

```typescript
imagePrompt = `
1. REFERENCE IMAGES PROVIDED:
   - Company logo image = BRAND LOGO (include this EXACT logo prominently in the ad)
   - Logo placement: Top corner, center overlay, or naturally integrated (most suitable position)
   - Logo must be clearly visible, maintaining brand identity and recognition

2. NATURAL HUMAN PRESENCE:
   - Include 1-2 people from target demographic
   - Show authentic human features and interactions

3. PROFESSIONAL PHOTOGRAPHY STYLE:
   - Soft, natural lighting
   - Realistic depth of field
   - Warm, inviting color palette

🎯 GOAL: Create a professional ad image that includes the company logo and exact product, 
with natural-looking people, authentic lifestyle photography style.
`;
```

---

## Example Flow

### Example 1: Product Page with Logo

**Input**:

```json
{
  "project_id": "abc-123",
  "website_url": "https://www.nike.com/shoe-product"
}
```

**Process**:

1. 🎨 Extract logo from `nike.com` → Nike swoosh logo
2. 🛍️ Extract product image → Shoe OG image
3. 📸 Analyze screenshot → Product page, sporty style
4. 🎯 Generate with Gemini:
   - Reference images: [shoe-image-base64, nike-logo-base64]
   - Prompt: "Create ad with Nike logo in corner, person wearing shoe..."

**Output**:

```json
{
  "success": true,
  "logoExtraction": {
    "logoUrl": "https://supabase.../nike-logo-123.png",
    "logoBase64Length": 12345,
    "extractionMethod": "pushowl-api",
    "includedInGeneration": true
  },
  "productExtraction": {
    "ogImageUrl": "https://nike.com/shoe.jpg",
    "isProductPage": true
  },
  "generation": {
    "method": "freepik-gemini-2.5-flash",
    "finalImageUrl": "https://supabase.../ad-image.png",
    "usedRealProductImage": true,
    "usedCompanyLogo": true,
    "referenceImagesCount": 2
  }
}
```

### Example 2: Home Page with Logo Only

**Input**:

```json
{
  "project_id": "xyz-789",
  "website_url": "https://www.airbnb.com"
}
```

**Process**:

1. 🎨 Extract logo from `airbnb.com` → Airbnb logo
2. ℹ️ No product image (home page)
3. 📸 Analyze screenshot → Home page, travel style
4. 🎯 Generate with Gemini:
   - Reference images: [airbnb-logo-base64]
   - Prompt: "Create ad with Airbnb logo, people traveling..."

**Output**:

```json
{
  "success": true,
  "logoExtraction": {
    "logoUrl": "https://supabase.../airbnb-logo-456.png",
    "includedInGeneration": true
  },
  "productExtraction": null,
  "generation": {
    "method": "freepik-gemini-2.5-flash",
    "usedCompanyLogo": true,
    "referenceImagesCount": 1
  }
}
```

---

## Console Output

### With Logo Extracted:

```
🎨 Extracting logo from website...
🎨 Fetching logo for domain: pushowl.com
📥 Downloading logo from: https://pushowl.com/logo.png
✅ Logo converted to Base64, size: 45.67 KB
✅ Logo saved to Supabase: https://supabase.../pushowl-logo-123.png
✅ Logo URL saved to project url_analysis
✅ Logo will be included as reference image for Gemini
🎯 Generating with Gemini 2.5 Flash (product + logo reference)...
📸 ✅ Instructions: Natural humans + product + logo + authentic lifestyle
```

### Without Logo:

```
🎨 Extracting logo from website...
🎨 Fetching logo for domain: example.com
⚠️ No logo found for example.com
🎯 Generating with Gemini 2.5 Flash...
```

---

## Benefits

### 1. **Automatic Brand Consistency**

- ✅ Company logo automatically included in all ads
- ✅ No manual logo placement needed
- ✅ Brand identity maintained across campaigns

### 2. **Professional Appearance**

- ✅ Logo placed in most suitable position by Gemini
- ✅ Natural integration with ad creative
- ✅ Matches real brand materials

### 3. **Reference Image Quality**

- ✅ Uses actual company logo (not AI-generated)
- ✅ Base64 format ensures reliable delivery to Gemini
- ✅ Preserved in Supabase for future use

### 4. **Multi-Reference Support**

- ✅ Combines logo + product images
- ✅ Up to 3 reference images for Gemini 2.5 Flash
- ✅ Priority order: Product → Logo → Additional

### 5. **Fallback Handling**

- ✅ Continues if logo extraction fails
- ✅ Graceful degradation (generates ad without logo)
- ✅ Detailed error logging

---

## Technical Details

### Domain Extraction

```typescript
function extractDomain(url: string): string {
  let domain = url.replace(/^https?:\/\//, ''); // Remove protocol
  domain = domain.replace(/^www\./, ''); // Remove www
  domain = domain.split('/')[0]; // Remove paths
  domain = domain.split(':')[0]; // Remove ports
  return domain;
}
```

**Examples**:

- `https://www.example.com/path` → `example.com`
- `http://subdomain.example.com:8080` → `subdomain.example.com`
- `www.example.com/page?query=1` → `example.com`

### File Naming Convention

```
{projectId}/logos/{domain}-logo-{timestamp}.{ext}

Example:
abc-123/logos/pushowl.com-logo-1697123456789.png
```

### Supported Logo Formats

- ✅ PNG
- ✅ JPG/JPEG
- ✅ SVG
- ✅ AVIF (modern format)
- ✅ WEBP (modern format)

**Note**: All logos are automatically converted to optimized PNG format for consistency and smaller file sizes.

### Reference Image Priority

1. **Product Image** (if product page)
2. **Company Logo** (if extracted)
3. _Additional images_ (reserved for future use)

**Max**: 3 reference images (Gemini 2.5 Flash limit)

---

## Database Updates

### `url_analysis` Field

```json
{
  "website_url": "https://example.com",
  "extracted_logo_url": "https://supabase.../logo.png",
  "logo_extraction_timestamp": "2024-10-13T12:34:56.789Z"
}
```

This allows:

- ✅ Logo reuse for same project
- ✅ Audit trail of logo extraction
- ✅ Future reference without re-extraction

---

## Error Handling

### Logo Not Found

```
⚠️ No logo found for domain
→ Continues without logo reference
→ Generates ad with product/general imagery only
```

### Logo Download Failed

```
❌ Error fetching/saving logo: timeout
→ Still returns base64 if available
→ Continues with ad generation
```

### Invalid Logo Format

```
❌ OG URL is not an image, content-type: text/html
→ Skips invalid logo
→ Continues with valid reference images
```

### PushOwl API Timeout

```
❌ Error fetching logo from PushOwl: ETIMEDOUT
→ Graceful fallback
→ Ad generation continues
```

---

## API Response Fields

### `logoExtraction`

```typescript
{
  logoUrl: string | null; // Supabase public URL
  logoBase64Length: number; // Size in bytes
  extractionMethod: 'pushowl-api'; // Source
  includedInGeneration: boolean; // Was it used in Gemini?
}
```

### `generation`

```typescript
{
  method: 'freepik-gemini-2.5-flash';
  finalImageUrl: string; // Generated ad URL
  usedRealProductImage: boolean; // Product ref used?
  usedCompanyLogo: boolean; // Logo ref used?
  referenceImagesCount: number; // Total refs sent to Gemini
  referenceImageFormat: 'base64'; // Format used
}
```

---

## Testing

### Test with Logo:

```bash
curl -X POST https://your-domain.com/api/freepik-extract \
  -H "Content-Type: application/json" \
  -d '{"project_id": "test-123"}'
```

**Expected**:

- ✅ Logo extracted from website
- ✅ Logo saved to Supabase
- ✅ Logo included in generated ad
- ✅ Response includes `logoExtraction` data

### Test without Logo:

```bash
# Website without logo in PushOwl database
curl -X POST https://your-domain.com/api/freepik-extract \
  -H "Content-Type: application/json" \
  -d '{"project_id": "test-456"}'
```

**Expected**:

- ⚠️ No logo found warning
- ✅ Ad generation continues
- ✅ `logoExtraction: null` in response

---

## Comparison: Before vs After

| Feature           | Before          | After              |
| ----------------- | --------------- | ------------------ |
| Logo Extraction   | ❌ Manual       | ✅ Automatic       |
| Logo in Ads       | ❌ Not included | ✅ Always included |
| Reference Images  | Product only    | Product + Logo     |
| Brand Consistency | Inconsistent    | ✅ Automatic       |
| Storage           | N/A             | ✅ Supabase        |
| Reusability       | N/A             | ✅ Saved in DB     |

---

## Integration Points

### Related APIs

1. **`/api/logo-extraction`** - Standalone logo extraction
2. **`/api/freepik-extract`** - Full ad generation (this API)
3. **`/api/projects/[id]/generate-images`** - Alternative generation route

### Shared Functions

```typescript
// Used in both logo-extraction and freepik-extract
function extractDomain(url: string): string;
async function fetchAndSaveLogo(websiteUrl, projectId);
```

---

## Future Enhancements

### Potential Improvements

1. **Logo Cache**: Check if logo already extracted for domain
2. **Logo Size Optimization**: Compress large logos for faster processing
3. **Logo Placement Control**: Allow user to specify logo position
4. **Multiple Logo Variants**: Extract light/dark versions
5. **Logo Quality Check**: Validate logo resolution/quality

### Potential Issues

1. **Large SVG Logos**: May need size limits
2. **Animated Logos**: GIF/APNG handling
3. **Logo Position**: Gemini might not always place optimally
4. **Rate Limits**: PushOwl API may have rate limits

---

## Attribution

As per PushOwl's terms of use:

> "This service is free to use with attribution to 'PushOwl' linked back to https://getlogo.pushowl.com"

Consider adding attribution in:

- Ad generation UI
- API documentation
- Footer of generated ads (optional)

---

## Summary

✅ **Logo Extraction**: Automatic via PushOwl API  
✅ **Storage**: Saved to Supabase (`project-files/{project_id}/logos/`)  
✅ **Format**: Base64 for Gemini reference  
✅ **Integration**: Passed as reference image to Gemini 2.5 Flash  
✅ **Instructions**: Gemini told to include logo prominently  
✅ **Fallback**: Graceful degradation if extraction fails  
✅ **Database**: Logo URL saved in `url_analysis` field  
✅ **Modern Formats**: Supports AVIF, WEBP, PNG, JPG, SVG

🎉 **Result**: All generated ads now automatically include the company's actual logo in the most suitable position!

---

## Recent Fixes

### AVIF/WEBP Support (October 13, 2024)

**Issue**: PushOwl API was returning logos in modern formats (AVIF, WEBP) that weren't recognized by the code.

**Example**:

```json
{
  "url": "https://cdn.prod.website-files.com/.../image_3-removebg-preview%201.avif"
}
```

**Solution**:

- ✅ Added AVIF format detection and support
- ✅ Added WEBP format detection and support
- ✅ Improved URL parsing (now uses `.includes()` instead of `.endsWith()` to handle URL-encoded characters)
- ✅ Added fallback detection from content-type headers
- ✅ Added detailed logging of detected format

**Detection Logic**:

1. Check URL for file extension (`.avif`, `.webp`, `.png`, `.jpg`, `.svg`)
2. Fallback to content-type header if URL doesn't contain extension
3. Default to PNG if neither method works

This ensures compatibility with all modern image formats used by CDNs and website builders.

---

## Files Modified

1. ✅ `src/app/api/freepik-extract/route.ts`
   - Added `extractDomain()` function
   - Added `fetchAndSaveLogo()` function
   - Integrated logo extraction in main POST route
   - Updated reference images array to include logo
   - Enhanced prompts with logo instructions
   - Updated response object with logo data
   - Added database update for logo URL

---

**Documentation Created**: October 13, 2024  
**Version**: 1.0  
**Status**: ✅ Production Ready
