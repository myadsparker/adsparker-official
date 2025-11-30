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
 * Extract OG image (product image) from website URL
 */
async function extractOGImage(websiteUrl: string): Promise<string | null> {
  try {
    console.log('🌐 Extracting OG image from website...');
    const axios = (await import('axios')).default;
    const { load } = await import('cheerio');

    const { data: html } = await axios.get(websiteUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = load(html);

    // Try multiple meta tags for product images
    const ogImage =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[property="og:image:secure_url"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[property="product:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      null;

    if (ogImage) {
      // Make URL absolute if it's relative
      if (ogImage.startsWith('/')) {
        const urlObj = new URL(websiteUrl);
        const absoluteUrl = `${urlObj.protocol}//${urlObj.host}${ogImage}`;
        console.log('✅ OG Image extracted:', absoluteUrl);
        return absoluteUrl;
      }
      console.log('✅ OG Image extracted:', ogImage);
      return ogImage;
    }

    console.log('⚠️ No OG image found');
    return null;
  } catch (error) {
    console.error('❌ Error extracting OG image:', error);
    return null;
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

/**
 * Main API route handler
 * 
 * Flow:
 * 1. Fetch project data from Supabase
 * 2. Extract business info (selling points, strategy, product, brand colors, tone)
 * 3. Generate prompt with OpenAI GPT-4o
 * 4. Download logo from logoUrl
 * 5. Enhance prompt with logo instructions
 * 6. Send to BFL API with enhanced prompt
 * 7. Poll until ready
 * 8. Save to Supabase
 * 9. Return image URL
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
      `🚀 Starting FLUX.2 image generation for project: ${project_id}`
    );

    // Step 1: Fetch project data from Supabase
    console.log('📊 Fetching project from Supabase...');
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('analysing_points, url_analysis')
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

    // Step 4: Generate image prompt with OpenAI GPT-4o
    console.log('🤖 Generating image prompt with OpenAI...');
    const promptData = await generateImagePromptFromDescriptions(
      sellingPoints,
      adsGoalStrategy,
      productInformation,
      analysingPoints.brandColors,
      analysingPoints.tone
    );

    // Console log the generated prompt
    console.log('📝 Generated Prompt:', promptData.prompt);

    // Step 5: Extract logo URL and product image (OG image)
    console.log('🖼️ Extracting logo URL and product image...');
    const logoUrl = analysingPoints.logoUrl;

    // Get OG image as product image reference
    let ogImageUrl: string | null = null;
    try {
      const urlAnalysis =
        typeof project.url_analysis === 'string'
          ? JSON.parse(project.url_analysis)
          : project.url_analysis;

      const websiteUrl = urlAnalysis?.website_url;
      if (websiteUrl) {
        ogImageUrl = await extractOGImage(websiteUrl);
      }
    } catch (error) {
      console.error('Error extracting OG image:', error);
    }

    // Step 6: Download logo and product image
    console.log('📥 Downloading logo and product image...');
    const downloadPromises = [];

    // Reference 1: Logo
    if (logoUrl) {
      downloadPromises.push(downloadImageAsBase64(logoUrl));
    } else {
      downloadPromises.push(Promise.resolve(null));
    }

    // Reference 2: OG image (product image from website)
    if (ogImageUrl) {
      downloadPromises.push(downloadImageAsBase64(ogImageUrl));
    } else {
      downloadPromises.push(Promise.resolve(null));
    }

    const [logoBase64, productImageBase64] = await Promise.all(downloadPromises);

    console.log('✅ Reference images downloaded:');
    console.log(`   - Logo: ${logoBase64 ? 'Yes' : 'No'}`);
    console.log(`   - Product Image (OG): ${productImageBase64 ? 'Yes' : 'No'}`);

    // Step 7: Prepare prompt for image editing
    // For image editing, we'll pass product image and logo as reference images
    // The prompt describes what to create, and FLUX.2 will use the references
    let effectivePrompt = promptData.prompt;
    
    // Add instructions to include references from input images
    if (productImageBase64 || logoBase64) {
      const referenceInstructions = [];
      if (productImageBase64) {
        referenceInstructions.push('Use the product from the input image as the visual/product reference so the generated ad clearly matches this product.');
      }
      if (logoBase64) {
        referenceInstructions.push('Include the brand logo from the reference image once, small and tasteful (e.g., a corner watermark), never duplicated.');
      }
      effectivePrompt = `${effectivePrompt} ${referenceInstructions.join(' ')}`;
    }

    console.log('📝 Prompt for image editing:', effectivePrompt);

    // Step 8: Generate image with BFL API
    const apiKey = process.env.FLUX2_API_KEY;
    const model = process.env.FLUX2_MODEL || 'flux-2-pro';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'FLUX2_API_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log('🌐 Generating image with FLUX.2 (Black Forest Labs API)...');
    console.log('📝 Using OpenAI-generated prompt');
    console.log('🖼️ Logo reference:', logoBase64 ? 'Included' : 'Not available');
    console.log('🖼️ Product image reference:', productImageBase64 ? 'Included' : 'Not available');

    // BFL API endpoint (same endpoint for image editing)
    const apiUrl = `https://api.bfl.ai/v1/${model}`;

    // BFL API request body for IMAGE EDITING
    // Image editing requires both prompt and input_image
    // Reference: https://docs.bfl.ai/flux_2/flux2_image_editing
    const requestBody: any = {
      prompt: effectivePrompt,
      width: 1024,  // Square format for ads, must be multiple of 16
      height: 1024, // Square format for ads, must be multiple of 16
      safety_tolerance: 2, // 0 (strict) to 6 (permissive), default 2
      output_format: 'png', // "jpeg" or "png"
    };

    // Add product image and logo as reference images for multi-reference editing
    // FLUX.2 image editing supports multi-reference: input_image, input_image_2, input_image_3, etc.
    // Reference: https://docs.bfl.ai/flux_2/flux2_image_editing
    // [pro] supports up to 8 reference images via API, [flex] supports up to 10
    // input_image accepts URL or base64 string
    
    // Use product image as primary input_image (the main product to feature)
    if (productImageBase64) {
      requestBody.input_image = productImageBase64;
      console.log('🖼️ Product image added as input_image (base64)');
    } else if (logoBase64) {
      // Fallback: use logo as input_image if no product image
      requestBody.input_image = logoBase64;
      console.log('🖼️ Logo added as input_image reference (base64)');
    }

    // Add logo as additional reference (input_image_2) if we have product image
    if (productImageBase64 && logoBase64) {
      requestBody.input_image_2 = logoBase64;
      console.log('🖼️ Logo added as input_image_2 reference (base64)');
    }

    // For flux-2-flex, add steps and guidance parameters
    if (model === 'flux-2-flex') {
      requestBody.steps = 50; // Max 50, default 50
      requestBody.guidance = 4.5; // Min 1.5, max 10, default 4.5
    }

    console.log('📤 Submitting generation request to BFL API...');
    console.log('📋 Request:', JSON.stringify({
      url: apiUrl,
      model: model,
      width: requestBody.width,
      height: requestBody.height,
      promptPreview: effectivePrompt.substring(0, 100) + '...',
    }, null, 2));

    // Submit generation request
    const submitResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'x-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Log response status and headers for debugging
    console.log('📡 BFL API response status:', submitResponse.status, submitResponse.statusText);

    const responseText = await submitResponse.text();
    console.log('📡 BFL API raw response:', responseText);

    if (!submitResponse.ok) {
      console.error('❌ BFL API submission error:', {
        status: submitResponse.status,
        statusText: submitResponse.statusText,
        body: responseText,
      });
      return NextResponse.json(
        { 
          error: 'BFL API submission failed',
          details: responseText,
          status: submitResponse.status 
        },
        { status: submitResponse.status }
      );
    }

    let submitData;
    try {
      submitData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse BFL API response as JSON:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid JSON response from BFL API',
          details: responseText.substring(0, 500)
        },
        { status: 500 }
      );
    }

    console.log('📊 BFL API task submitted - full response:', JSON.stringify(submitData, null, 2));

    if (!submitData.id) {
      console.error('❌ BFL API response missing task id:', submitData);
      return NextResponse.json(
        { 
          error: 'BFL API did not return task id',
          response: submitData
        },
        { status: 500 }
      );
    }

    if (!submitData.polling_url) {
      console.error('❌ BFL API response missing polling_url:', submitData);
      return NextResponse.json(
        { 
          error: 'BFL API did not return polling_url',
          response: submitData
        },
        { status: 500 }
      );
    }

    console.log('✅ Task created successfully:', {
      id: submitData.id,
      polling_url: submitData.polling_url,
      cost: submitData.cost,
      output_mp: submitData.output_mp,
    });

    // Step 9: Poll until ready
    const result = await pollBFLResult(submitData.polling_url, apiKey);

    // Step 10: Extract image URL from result
    console.log('📊 Final result structure:', JSON.stringify(result, null, 2));
    
    // Handle different possible response structures
    let imageUrl: string | undefined;
    
    // Check various possible locations for the image URL
    // BFL API can return the URL in different structures
    if (result.result?.sample) {
      // Most common: result.result.sample contains the URL
      imageUrl = result.result.sample;
    } else if (result.sample) {
      // Direct sample field
      imageUrl = result.sample;
    } else if (result.output && Array.isArray(result.output) && result.output.length > 0) {
      // Array of outputs with url property
      imageUrl = result.output[0].url || result.output[0].sample;
    } else if (result.url) {
      // Direct url field
      imageUrl = result.url;
    } else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      // Array of data with url property
      imageUrl = result.data[0].url || result.data[0].sample;
    } else if (result.images && Array.isArray(result.images) && result.images.length > 0) {
      // Array of images with url property
      imageUrl = result.images[0].url || result.images[0].sample;
    } else if (result.result?.output && Array.isArray(result.result.output) && result.result.output.length > 0) {
      // Nested result.output array
      imageUrl = result.result.output[0].url || result.result.output[0].sample;
    }
    
    if (!imageUrl) {
      console.error('❌ Could not find image URL in result:', JSON.stringify(result, null, 2));
      return NextResponse.json(
        { 
          error: 'BFL API result did not contain image URL',
          result: result
        },
        { status: 500 }
      );
    }

    console.log('✅ BFL image URL received:', imageUrl);

    // Step 11: Download and save to Supabase
    console.log('💾 Saving image to Supabase...');
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    const savedUrl = await saveBase64ImageToSupabase(
      base64Image,
      project_id,
      `generated-flux2-${Date.now()}.png`
    );

    if (!savedUrl) {
      console.error('⚠️ Failed to save to Supabase, returning original URL');
      // Return original URL if Supabase save fails
      imageUrl = imageUrl;
    } else {
      console.log('✅ Image saved to Supabase:', savedUrl);
      imageUrl = savedUrl;
    }

    // Step 12: Update ai_images in database
    const generatedImages = [imageUrl].filter(Boolean) as string[];
    
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

    // Step 13: Return response
    const response: ImageGenResponse = {
      success: true,
      project_id,
      generatedImageUrl: imageUrl || undefined,
      logoUrl: logoUrl || undefined,
      prompt: promptData.prompt,
    };

    console.log('🎉 FLUX.2 image generation complete!');
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Error in FLUX.2 image generation:', error);
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
