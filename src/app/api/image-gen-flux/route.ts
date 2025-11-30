import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ImageGenResponse = {
  success: boolean;
  project_id: string;
  generatedImageUrl?: string;
  logoUrl?: string;
  prompt?: string;
  error?: string;
};

/**
 * Generate image prompt from business descriptions using ChatGPT
 */
async function generateImagePromptFromDescriptions(
  sellingPoints: string,
  adsGoalStrategy: string,
  productInformation: string,
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    description?: string;
  },
  tone?: string
): Promise<{
  prompt: string;
  recommendedStyle: string;
  tagline: string;
  ctaText: string;
}> {
  console.log(
    '🤖 Generating image prompt from business descriptions with ChatGPT...'
  );

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a senior AI art director and Meta ad strategist who creates cinematic, professionally-shot marketing ad visuals.
        
        You will receive three business data points:
        - sellingPoints
        - adsGoalStrategy
        - productInformation
        
        From these, your task is to:
        1. Create a **high-quality, professional marketing ad creative prompt** that focuses CLEARLY on the main service.
        2. Extract a compelling, on-brand **tagline**.
        3. Suggest a **CTA** (call-to-action) relevant to the business.
        
        ### CRITICAL IMAGE PROMPT RULES
        
        **SERVICE FOCUS:**
        - The SERVICE must be the CENTER of attention, clearly visible and hero of the shot
        - Service should be shown in its best light - realistic, appealing, and professional
        - Describe the service's exact presentation, context, and how it's featured
        
        **HUMAN SUBJECT:**
        - Include ONLY ONE human subject that is symmetrical and visually connected to the service
        - Gender and style should naturally match the service's nature and target audience (infer from productInformation)
        - Human should be relatable to the service - using it, benefitting from it, or positioned to enhance the service story
        - Subject positioning should be balanced and symmetrical in the composition
        
        **PROFESSIONAL MARKETING AESTHETIC:**
        - Must look like a REAL service photoshoot or campaign ad, not an AI-generated collage
        - Cinematic and professional quality - like ads from major brands
        - Clean, focused composition with premium lighting
        - Realistic or stylized environment that enhances service appeal
        - Avoid AI artifacts, distortions, or "uncanny valley" effects
        
        **COMPOSITION DETAILS to include:**
        - Exact service presentation and prominence
        - Human subject: gender, age range, styling that matches target audience
        - How the human interacts with or relates to the service
        - Environment: specific setting that enhances brand story
        - Lighting: professional studio or natural lighting style
        - Camera angle: eye-level, slightly above, or hero angle
        - Depth of field: shallow for service focus or deep for context
        - Color palette: aligned with brand mood
        - Overall emotional tone: premium, aspirational, relatable
        
        **TEXT INTEGRATION:**
        - Tagline: positioned cleanly without obscuring service
        - CTA button: clear and professional placement
        
        ### BRAND GUIDELINES (STRICT)
        - Color palette must follow brand colors when provided:
          - Primary: ${brandColors?.primary || 'auto-detect'}
          - Secondary: ${brandColors?.secondary || 'auto-detect'}
          - Accent: ${brandColors?.accent || 'auto-detect'}
        - Visual tone/mood must reflect: ${tone || 'professional'}
        - Apply brand colors to background, accents, wardrobe/props, lighting color grading, and UI elements (CTA/button), while preserving realism.
        - Avoid clashing colors or unrelated palettes.
        
        ### OUTPUT FORMAT (JSON)
        {
          "prompt": "Detailed professional marketing ad prompt with clear service focus",
          "recommendedStyle": "cinematic / editorial / studio-shot / lifestyle",
          "tagline": "short punchy tagline for ad",
          "ctaText": "Shop Now / Try Free / Order Today / etc."
        }`,
        },
        {
          role: 'user',
          content: `Generate a professional marketing ad creative prompt for a Facebook/Instagram ad.

SELLING POINTS: ${sellingPoints}

ADVERTISING STRATEGY: ${adsGoalStrategy}

PRODUCT/SERVICE INFORMATION: ${productInformation}

BRAND COLORS: ${brandColors?.primary || ''} ${brandColors?.secondary || ''} ${brandColors?.accent || ''}
BRAND TONE: ${tone || ''}

IMPORTANT: Create a prompt that generates a high-quality marketing ad creative that:
1. Focuses CLEARLY on the main service described in the service information
2. Includes only ONE human subject positioned symmetrically and relatable to the service
3. Gender and style should naturally match the service's nature and target audience
4. Looks like a REAL service photoshoot or campaign ad, not an AI-generated collage
5. Service is the center of attention, clearly visible and hero of the shot
6. Professional, cinematic quality like ads from major brands
7. Includes tagline and CTA text elegantly integrated into the design
8. Enforce brand color palette across background, accents, UI, and color grading to reflect the specified brand tone.`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    console.log('✅ Image prompt generated from descriptions');
    console.log(`🎨 Recommended style: ${result.recommendedStyle || 'photo'}`);
    console.log(`📝 Tagline: "${result.tagline}"`);
    console.log(`📝 CTA: "${result.ctaText}"`);

    const paletteInstruction = brandColors
      ? ` Use the brand palette strictly: primary ${brandColors.primary || 'auto'}, secondary ${brandColors.secondary || 'auto'}, accent ${brandColors.accent || 'auto'}. Apply these to background, accents, props, wardrobe accents, and CTA/button. Avoid off-brand hues.`
      : '';
    const toneInstruction = tone
      ? ` The overall mood must feel ${tone}. Reflect this tone through lighting, styling, depth of field, and color grading.`
      : '';

    // Enhance the prompt with the base structure to ensure consistency
    const enhancedPrompt = `Generate a high-quality marketing ad creative that focuses clearly on the main service. ${result.prompt} The composition should feel cinematic and professional, like a real service photoshoot or campaign ad. The service should be the center of attention, clearly visible and presented in a realistic environment that enhances its appeal. Include only one human subject, positioned symmetrically and visually connected to the service. The final image should look like a marketing-ready advertisement - elegant, persuasive, and visually focused on the service's story and audience. Include the tagline "${result.tagline}" and CTA button "${result.ctaText}" integrated elegantly into the design.${paletteInstruction}${toneInstruction}`;

    return {
      prompt: enhancedPrompt,
      recommendedStyle: result.recommendedStyle || 'photo',
      tagline: result.tagline || 'Discover More',
      ctaText: result.ctaText || 'Learn More',
    };
  } catch (err) {
    console.error('❌ Error generating image prompt from descriptions:', err);
    return {
      prompt:
        'Generate a high-quality marketing ad creative that focuses clearly on the main service. Include only one human subject, positioned symmetrically and visually connected to the service. The composition should feel cinematic and professional, like a real service photoshoot or campaign ad. The service should be the center of attention, clearly visible and presented in a realistic environment. The final image should look like a marketing-ready advertisement - elegant, persuasive, and visually focused. Include tagline "Discover More" and CTA button "Learn More" integrated elegantly into the design.',
      recommendedStyle: 'photo',
      tagline: 'Discover More',
      ctaText: 'Learn More',
    };
  }
}

/**
 * Download image from URL and convert to base64
 */
async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    console.log('📥 Downloading image from URL...');
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    console.log('✅ Image downloaded and converted to base64');
    return base64;
  } catch (error) {
    console.error('❌ Error downloading image:', error);
    return null;
  }
}

/**
 * Generate image with FLUX.2 using official Black Forest Labs API
 * 
 * Official Documentation: https://docs.bfl.ai/flux_2/flux2_text_to_image
 *
 * REQUIRED ENVIRONMENT VARIABLES:
 * - FLUX2_API_URL   - The API endpoint URL (defaults to BFL official API)
 * - FLUX2_API_KEY   - Your BFL API key (get from https://bfl.ai dashboard)
 * - FLUX2_MODEL     - (optional) Model variant: "flux-2-pro" or "flux-2-flex", defaults to "flux-2-pro"
 *
 * OFFICIAL BFL API SETUP:
 * - Base URL: https://api.bfl.ai
 * - Endpoints: /v1/flux-2-pro or /v1/flux-2-flex
 * - Authentication: x-key header (not Bearer token)
 * - Process: Submit job → Get task ID → Poll until ready → Get image URL
 *
 * EXAMPLE .env.local setup:
 * FLUX2_API_URL=https://api.bfl.ai/v1/flux-2-pro
 * FLUX2_API_KEY=your-bfl-api-key-here
 * FLUX2_MODEL=flux-2-pro
 *
 * API REQUEST FORMAT:
 * {
 *   "prompt": string (required),
 *   "width": integer (default 1024, multiple of 16),
 *   "height": integer (default 1024, multiple of 16),
 *   "seed": integer (optional, for reproducibility),
 *   "safety_tolerance": integer (0-6, default 2),
 *   "output_format": "jpeg" | "png" (default "jpeg")
 * }
 *
 * API RESPONSE FORMAT:
 * Initial response: { id, polling_url, cost, input_mp, output_mp }
 * Polling response: { status: "Ready" | "Processing", output: [{ url: string }] }
 */
/**
 * Poll the BFL API polling URL until the task is ready
 * Official Documentation: https://docs.bfl.ai/flux_2/flux2_text_to_image
 */
async function pollBFLResult(
  pollingUrl: string,
  apiKey: string,
  maxAttempts: number = 60,
  pollInterval: number = 2000
): Promise<any> {
  console.log('🔄 Polling BFL API for result...');
  console.log('📍 Polling URL:', pollingUrl);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(pollingUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-key': apiKey,
        },
      });

      console.log(`📡 Poll attempt ${attempt + 1}: Status ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ BFL polling error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`BFL polling error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();
      console.log(`📡 Poll attempt ${attempt + 1} raw response:`, responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse polling response:', parseError);
        throw new Error(`Invalid JSON in polling response: ${responseText.substring(0, 200)}`);
      }

      console.log(`📊 Poll attempt ${attempt + 1} parsed data:`, JSON.stringify(data, null, 2));
      
      // Check for Ready status (case-insensitive)
      const status = data.status?.toLowerCase();
      if (status === 'ready') {
        console.log('✅ BFL task completed!');
        return data;
      }
      
      // Check for failed/error status
      if (status === 'failed' || status === 'error') {
        console.error('❌ BFL task failed:', data);
        throw new Error(`BFL task failed: ${data.error || data.message || JSON.stringify(data)}`);
      }

      // Still processing - log status and wait
      if (attempt < maxAttempts - 1) {
        console.log(`⏳ Task status: ${data.status || 'Unknown'}, waiting ${pollInterval}ms... (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        // Last attempt - log full response for debugging
        console.error('❌ Polling timeout - last response:', JSON.stringify(data, null, 2));
      }
    } catch (error: any) {
      // If it's a fatal error (not just processing), throw immediately
      if (error.message?.includes('failed') || error.message?.includes('error')) {
        throw error;
      }
      // Otherwise log and continue
      console.error(`⚠️ Poll attempt ${attempt + 1} error:`, error.message);
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
  }

  throw new Error(`BFL task timed out after ${maxAttempts} attempts (${maxAttempts * pollInterval / 1000} seconds)`);
}

async function generateImageWithFlux2(
  prompt: string,
  projectId: string,
  referenceImages?: (string | null)[]
): Promise<string | null> {
  // Default to official BFL API if URL not specified
  const apiUrl = process.env.FLUX2_API_URL || 'https://api.bfl.ai/v1/flux-2-pro';
  const apiKey = process.env.FLUX2_API_KEY;
  const model = process.env.FLUX2_MODEL || 'flux-2-pro';

  if (!apiKey) {
    throw new Error('FLUX2_API_KEY is not configured');
  }

  try {
    console.log('🌐 Generating image with FLUX.2 (Black Forest Labs API)...');
    console.log('📝 Full Prompt:', prompt);

    // Strengthen prompt to explicitly use logo reference and ad-safe composition rules
    // Note: BFL API doesn't support reference images in request body, so we include it in the prompt
    const effectivePrompt =
      referenceImages && referenceImages.length > 0
        ? `${prompt}
CRITICAL: You are provided a reference image which is the brand logo.
Include the logo once, small and tasteful (e.g., a corner watermark), never duplicated.

Important composition rules:
- Only ONE person (subject) should appear in the final image — do NOT duplicate or mirror the same person.
- Fill the entire canvas fully (edge-to-edge, full-bleed composition).
- The service and person should be natural, cohesive, and clearly branded.
- Do not leave any white areas, borders, padding, or margins.
- Avoid framed, mockup, or poster-style layouts.

Do not include text duplication, extra logos, or repeated visual elements. Only one person, one service, and one logo should be shown in the final image.`
        : prompt;

    console.log('📝 Effective Prompt (sent to FLUX.2 API):', effectivePrompt);

    // Detect if this is the official BFL API
    const isBFLAPI = apiUrl.includes('bfl.ai') || apiUrl.includes('api.bfl.ai');

    // Use official BFL API format (per https://docs.bfl.ai/flux_2/flux2_text_to_image)
    if (isBFLAPI) {
      console.log('🔧 Using official Black Forest Labs FLUX.2 API');
      
      // BFL API uses x-key header (not Authorization Bearer)
      const headers: Record<string, string> = {
        'accept': 'application/json',
        'x-key': apiKey,
        'Content-Type': 'application/json',
      };

      // BFL API request body (square 1024x1024 for ads)
      const requestBody: any = {
        prompt: effectivePrompt,
        width: 1024,  // Square format for ads, must be multiple of 16
        height: 1024, // Square format for ads, must be multiple of 16
        safety_tolerance: 2, // 0 (strict) to 6 (permissive), default 2
        output_format: 'png', // "jpeg" or "png"
        // Optional: seed for reproducibility
        // seed: undefined,
      };

      // For flux-2-flex, add steps and guidance parameters
      if (model === 'flux-2-flex' || apiUrl.includes('flux-2-flex')) {
        requestBody.steps = 50; // Max 50, default 50
        requestBody.guidance = 4.5; // Min 1.5, max 10, default 4.5
      }

      console.log(
        '📋 BFL API request:',
        JSON.stringify(
          {
            url: apiUrl,
            model: model,
            width: requestBody.width,
            height: requestBody.height,
            promptPreview: effectivePrompt.substring(0, 100) + '...',
          },
          null,
          2
        )
      );

      // Step 1: Submit generation request
      console.log('📤 Submitting generation request to BFL API...');
      const submitResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      // Log response status and headers for debugging
      console.log('📡 BFL API response status:', submitResponse.status, submitResponse.statusText);
      console.log('📡 BFL API response headers:', Object.fromEntries(submitResponse.headers.entries()));

      const responseText = await submitResponse.text();
      console.log('📡 BFL API raw response:', responseText);

      if (!submitResponse.ok) {
        console.error('❌ BFL API submission error:', {
          status: submitResponse.status,
          statusText: submitResponse.statusText,
          body: responseText,
        });
        throw new Error(`BFL API error: ${submitResponse.status} ${submitResponse.statusText} - ${responseText}`);
      }

      let submitData;
      try {
        submitData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse BFL API response as JSON:', parseError);
        throw new Error(`Invalid JSON response from BFL API: ${responseText.substring(0, 500)}`);
      }

      console.log('📊 BFL API task submitted - full response:', JSON.stringify(submitData, null, 2));

      if (!submitData.id) {
        console.error('❌ BFL API response missing task id:', submitData);
        throw new Error('BFL API did not return task id');
      }

      if (!submitData.polling_url) {
        console.error('❌ BFL API response missing polling_url:', submitData);
        throw new Error('BFL API did not return polling_url');
      }

      console.log('✅ Task created successfully:', {
        id: submitData.id,
        polling_url: submitData.polling_url,
        cost: submitData.cost,
        output_mp: submitData.output_mp,
      });

      // Step 2: Poll until ready
      const result = await pollBFLResult(submitData.polling_url, apiKey);

      // Step 3: Extract image URL from result
      console.log('📊 Final result structure:', JSON.stringify(result, null, 2));
      
      // Handle different possible response structures
      let imageUrl: string | undefined;
      
      if (result.output && Array.isArray(result.output) && result.output.length > 0) {
        imageUrl = result.output[0].url;
      } else if (result.url) {
        // Direct URL in response
        imageUrl = result.url;
      } else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        imageUrl = result.data[0].url;
      } else if (result.images && Array.isArray(result.images) && result.images.length > 0) {
        imageUrl = result.images[0].url;
      }
      
      if (!imageUrl) {
        console.error('❌ Could not find image URL in result:', result);
        throw new Error('BFL API result did not contain image URL');
      }

      console.log('✅ BFL image URL received:', imageUrl);
      
      // Save to Supabase if projectId is provided
      if (projectId) {
        console.log('💾 Saving BFL image to Supabase...');
        // Download the image and save to Supabase
        try {
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = Buffer.from(imageBuffer).toString('base64');
          
          const savedUrl = await saveBase64ImageToSupabase(
            base64Image,
            projectId,
            `generated-flux2-${Date.now()}.png`
          );
          
          if (savedUrl) {
            console.log('✅ Image saved to Supabase:', savedUrl);
            return savedUrl;
          }
        } catch (saveError) {
          console.error('⚠️ Failed to save to Supabase, returning original URL:', saveError);
        }
      }
      
      return imageUrl;
    }
    
    // Fallback: Support other providers (CometAPI, fal.ai, etc.)
    const isCometAPI = apiUrl.includes('cometapi.com');
    const isFalAI = apiUrl.includes('fal.ai') || apiUrl.includes('queue.fal.ai');
    
    // Adjust request format based on provider
    let finalRequestBody: any;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (isCometAPI) {
      // CometAPI uses a specific format with model names like "black-forest-labs/flux-2-pro"
      console.log('🔧 Detected CometAPI - using CometAPI format');
      headers['Authorization'] = `Bearer ${apiKey}`;
      
      const cometModel = model?.includes('/') ? model : `black-forest-labs/${model || 'flux-2-pro'}`;
      
      finalRequestBody = {
        model: cometModel,
        input: {
          prompt: effectivePrompt,
          aspect_ratio: '1:1',
        },
      };
    } else if (isFalAI) {
      // fal.ai format
      console.log('🔧 Detected fal.ai - using fal.ai format');
      headers['Authorization'] = `Key ${apiKey}`;
      
      finalRequestBody = {
        prompt: effectivePrompt,
        aspect_ratio: '1:1',
        output_format: 'png',
        model: model || 'flux-pro',
      };
      
      const refs = (referenceImages || []).filter(Boolean) as string[];
      if (refs.length > 0) {
        finalRequestBody.image_url = refs[0];
      }
    } else {
      // Default format (generic Flux API)
      headers['Authorization'] = `Bearer ${apiKey}`;
      
      finalRequestBody = {
        prompt: effectivePrompt,
        aspect_ratio: '1:1',
        output_format: 'png',
        model: model || 'flux.2-pro',
      };
      
      const refs = (referenceImages || []).filter(Boolean) as string[];
      if (refs.length > 0) {
        finalRequestBody.image_url = refs[0];
        finalRequestBody.image_urls = refs;
      }
    }

    console.log(
      '📋 FLUX.2 request details:',
      JSON.stringify(
        {
          url: apiUrl,
          provider: isCometAPI ? 'CometAPI' : isFalAI ? 'fal.ai' : 'Generic',
          model: finalRequestBody.model || model,
          promptPreview: effectivePrompt.substring(0, 120) + '...',
          requestBodyKeys: Object.keys(finalRequestBody),
        },
        null,
        2
      ),
    );

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(finalRequestBody),
    });

    // Get response text first to check if it's JSON or HTML/error
    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    // Check if response is HTML (error page) instead of JSON
    if (!contentType.includes('application/json') && responseText.trim().startsWith('<!')) {
      console.error('❌ FLUX.2 API returned HTML instead of JSON:');
      console.error('Response status:', response.status, response.statusText);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      console.error('Response body (first 500 chars):', responseText.substring(0, 500));
      throw new Error(
        `FLUX.2 API returned HTML error page. Status: ${response.status}. Check API URL and request format.`
      );
    }

    if (!response.ok) {
      console.error('❌ FLUX.2 API error response:', responseText);
      throw new Error(`FLUX.2 API error: ${response.status} ${response.statusText}`);
    }

    // Parse JSON response
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
      console.log('📊 FLUX.2 API response received');
    } catch (parseError) {
      console.error('❌ Failed to parse FLUX.2 API response as JSON:');
      console.error('Response text (first 500 chars):', responseText.substring(0, 500));
      throw new Error(`Invalid JSON response from FLUX.2 API: ${parseError}`);
    }

    if (!responseData) {
      throw new Error('Empty FLUX.2 API response');
    }

    // Handle different response formats based on provider
    let imageUrl: string | undefined;
    let base64Image: string | undefined;

    if (isCometAPI) {
      // CometAPI response format: { data: [{ url: string }] } or { output: { url: string } }
      // Handle multiple possible response structures
      if (responseData.data && Array.isArray(responseData.data)) {
        const first = responseData.data[0];
        imageUrl = first?.url;
        base64Image = first?.b64_json;
      } else if (responseData.output) {
        // Some CometAPI endpoints return { output: { url: string } }
        imageUrl = responseData.output.url;
        base64Image = responseData.output.b64_json;
      } else if (responseData.url) {
        // Direct URL in response
        imageUrl = responseData.url;
      } else if (responseData.images && Array.isArray(responseData.images)) {
        // Fallback: check images array
        const first = responseData.images[0];
        imageUrl = first?.url;
        base64Image = first?.b64_json;
      }
      
      if (!imageUrl && !base64Image) {
        console.error('❌ CometAPI response structure:', JSON.stringify(responseData, null, 2));
      }
    } else {
      // Other providers: { images: [{ url: string }] } or { images: [{ b64_json: string }] }
      const images = responseData.images || responseData.data || [];
      if (images.length > 0) {
        const first = images[0];
        imageUrl = first.url;
        base64Image = first.b64_json || first.base64 || first.image_base64;
      }
    }

    // Case 1: provider returns a direct URL
    if (imageUrl && typeof imageUrl === 'string') {
      console.log('✅ FLUX.2 image URL received:', imageUrl);
      return imageUrl;
    }

    // Case 2: provider returns base64
    if (!base64Image) {
      console.error('❌ Response structure:', JSON.stringify(responseData, null, 2));
      throw new Error('No image URL or base64 image found in FLUX.2 response');
    }

    console.log('✅ FLUX.2 base64 image received, saving to Supabase...');

    if (projectId) {
      const savedUrl = await saveBase64ImageToSupabase(
        base64Image,
        projectId,
        `generated-${Date.now()}.png`,
      );
      if (savedUrl) {
        console.log('✅ Image saved to Supabase:', savedUrl);
        return savedUrl;
      }
    }

    // Fallback: return as data URL
    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error('❌ Error generating image with FLUX.2:', error);
    throw error;
  }
}

/**
 * Save base64 image to Supabase storage and return public URL
 */
async function saveBase64ImageToSupabase(
  base64Image: string,
  projectId: string,
  filename: string
): Promise<string | null> {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    const fileName = `${projectId}/images/${filename}`;

    const { error } = await supabase.storage
      .from('project-files')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('❌ Error uploading image to Supabase:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    console.error('❌ Error saving image to Supabase:', err);
    return null;
  }
}

/**
 * Main API route handler
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    console.log(
      `🚀 Starting service image generation for project: ${project_id}`
    );

    // Step 1: Fetch project data
    console.log('📊 Fetching project from Supabase...');
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('analysing_points')
      .eq('project_id', project_id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Project not found', details: fetchError },
        { status: 404 }
      );
    }

    // Step 2: Parse analysing_points
    let analysingPoints: any = null;
    try {
      analysingPoints =
        typeof project.analysing_points === 'string'
          ? JSON.parse(project.analysing_points)
          : project.analysing_points;
    } catch (error) {
      console.error('Error parsing analysing_points:', error);
      return NextResponse.json(
        { error: 'Invalid analysing_points data' },
        { status: 400 }
      );
    }

    if (!analysingPoints) {
      return NextResponse.json(
        { error: 'No analysing_points found. Please run analysis first.' },
        { status: 400 }
      );
    }

    // Step 3: Extract business information for prompt generation
    const sellingPoints =
      analysingPoints.sellingPoints?.description ||
      'Quality products and services';
    const adsGoalStrategy =
      analysingPoints.adsGoalStrategy?.description ||
      'Increase brand awareness and conversions';
    const productInformation =
      analysingPoints.productInformation?.description ||
      'Premium services for modern consumers';

    // Step 4: Generate image prompt
    console.log('🤖 Generating image prompt...');
    const promptData = await generateImagePromptFromDescriptions(
      sellingPoints,
      adsGoalStrategy,
      productInformation,
      analysingPoints.brandColors,
      analysingPoints.tone
    );

    // Console log the generated prompt
    console.log('📝 Generated Prompt:', promptData.prompt);

    // Step 5: Extract logo URL only (no OG image extraction)
    console.log('🖼️ Extracting logo URL...');
    const logoUrl = analysingPoints.logoUrl;

    // Step 6: Download logo only
    console.log('📥 Downloading logo...');
    let logoBase64: string | null = null;

    if (logoUrl) {
      logoBase64 = await downloadImageAsBase64(logoUrl);
    }

    // Step 7: Generate 1 image with FLUX.2 (using OpenAI prompt and logo reference)
    console.log('🌐 Generating image with FLUX.2 (BFL API)...');
    console.log('📝 Using OpenAI-generated prompt');
    console.log('🖼️ Logo reference:', logoBase64 ? 'Included' : 'Not available');
    
    // Generate image with OpenAI prompt and logo reference
    console.log('📸 Generating image...');
    const generatedImageUrl = await generateImageWithFlux2(
      promptData.prompt, // OpenAI-generated prompt
      project_id,
      logoBase64 ? [logoBase64] : undefined // Logo as reference image
    );

    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate image with FLUX.2' },
        { status: 500 }
      );
    }

    // Step 8: Update ai_images in database with the generated image
    const generatedImages = [generatedImageUrl].filter(Boolean) as string[];
    
    if (generatedImages.length > 0) {
      try {
        console.log('💾 Updating ai_images in database...');

        // Get existing ai_images
        const { data: projectData, error: fetchError } = await supabase
          .from('projects')
          .select('ai_images')
          .eq('project_id', project_id)
          .single();

        if (fetchError) {
          console.error('❌ Error fetching existing ai_images:', fetchError);
        } else {
          let existingAiImages: string[] = [];
          if (projectData?.ai_images) {
            existingAiImages = Array.isArray(projectData.ai_images)
              ? projectData.ai_images
              : typeof projectData.ai_images === 'string'
                ? JSON.parse(projectData.ai_images)
                : [];
          }

          // Add new image URLs (avoid duplicates)
          const newImages: string[] = [];
          generatedImages.forEach((imageUrl) => {
            if (imageUrl && !existingAiImages.includes(imageUrl)) {
              newImages.push(imageUrl);
            }
          });

          if (newImages.length > 0) {
            const updatedAiImages = [...existingAiImages, ...newImages];

            // Update the database
            const { error: updateError } = await supabase
              .from('projects')
              .update({ ai_images: updatedAiImages })
              .eq('project_id', project_id);

            if (updateError) {
              console.error('❌ Failed to update ai_images:', updateError);
            } else {
              console.log(
                `✅ ${newImages.length} AI image URL(s) saved to ai_images column:`,
                newImages
              );
            }
          }
        }
      } catch (error) {
        console.error('❌ Error updating ai_images:', error);
      }
    }

    const response: ImageGenResponse = {
      success: true,
      project_id,
      generatedImageUrl: generatedImageUrl || undefined,
      logoUrl: logoUrl || undefined,
      prompt: promptData.prompt,
    };

    console.log('🎉 Service image generation complete!');
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Error in service image generation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        project_id: 'unknown',
      },
      { status: 500 }
    );
  }
}
