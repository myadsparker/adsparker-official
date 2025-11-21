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

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;

type ImageGenResponse = {
  success: boolean;
  project_id: string;
  generatedImageUrl?: string;
  logoUrl?: string;
  ogImageUrl?: string;
  error?: string;
};

/**
 * Generate image prompt from business descriptions using ChatGPT
 */
async function generateImagePromptFromDescriptions(
  sellingPoints: string,
  adsGoalStrategy: string,
  productInformation: string
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
          content: `You are a senior AI art director and Meta ad strategist who creates compelling advertising creatives for social media campaigns.
        
        You will receive three business data points:
        - sellingPoints
        - adsGoalStrategy
        - productInformation
        
        From these, your task is to:
        1. Create a **professional advertising creative prompt** that balances product focus with ad design elements
        2. Extract a compelling, punchy **tagline**
        3. Suggest a **CTA** (call-to-action) relevant to the business
        
        ### CRITICAL AD CREATIVE RULES
        
        **ADVERTISING AESTHETIC (NOT PHOTOSHOOT):**
        - Should look like a DESIGNED AD CREATIVE - blend of photography and graphic design
        - Has that "polished advertising" feel - not just raw photography
        - Strategic use of colors, overlays, and visual hierarchy
        - Modern, eye-catching, and scroll-stopping on social feeds
        
        **PRODUCT FOCUS:**
        - Product should be prominently featured but integrated into ad design
        - Clear visibility with professional presentation
        - Natural integration with visual elements and text
        
        **HUMAN SUBJECT:**
        - Include ONE human subject when relevant to product/service
        - Should feel like they're part of the ad story, not just posing
        - Gender and styling naturally match target audience
        - Positioned to complement product and text placement
        
        **TEXT INTEGRATION:**
        - Tagline: positioned cleanly without obscuring product
        - CTA button: clear and professional placement
        
        **COMPOSITION ELEMENTS:**
        - Layout: consider asymmetric design with clear zones for product, person, and text
        - Color scheme: bold and brand-appropriate, creates visual impact
        - Visual flow: guides eye from hook → product → offer → CTA
        - Background: can be environmental OR designed (gradients, patterns, color blocks)
        - Lighting: professional but with advertising polish (not just raw natural light)
        - Depth and layers: create visual interest through overlapping elements
        
        **AD CREATIVE FEATURES:**
        - Strategic color overlays or gradients for text sections
        - Professional graphic design elements (shapes, lines, patterns) where appropriate
        - Dynamic composition that feels intentionally designed
        - Balance between photographic and graphic design elements
        
        ### OUTPUT FORMAT (JSON)
        {
          "prompt": "Detailed ad creative prompt with clear visual zones, text placement strategy, and advertising aesthetic",
          "recommendedStyle": "advertising creative / social media ad / campaign design / lifestyle advertising",
          "tagline": "punchy headline that hooks attention",
          "ctaText": "Shop Now / Get Started / Claim Offer / etc."
        }`,
        },
        {
          role: 'user',
          content: `Generate a professional advertising creative prompt for a Facebook/Instagram ad.

SELLING POINTS: ${sellingPoints}

ADVERTISING STRATEGY: ${adsGoalStrategy}

PRODUCT/SERVICE INFORMATION: ${productInformation}

IMPORTANT: Create a prompt that generates an advertising creative (NOT just a photoshoot) that:
1. Looks like a DESIGNED AD - polished, intentional, scroll-stopping
2. Product is prominently featured but part of cohesive ad design
3. ONE human subject when relevant, naturally integrated
4. Looks like a REAL product photoshoot or campaign ad, not an AI-generated collage
5. Product is the center of attention, clearly visible and hero of the shot
6. Professional, cinematic quality like ads from major brands
7. Includes tagline and CTA text elegantly integrated into the design`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1200,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    console.log('✅ Image prompt generated from descriptions');
    console.log(
      `🎨 Recommended style: ${result.recommendedStyle || 'advertising creative'}`
    );
    console.log(`📝 Tagline: "${result.tagline}"`);
    console.log(`📝 CTA: "${result.ctaText}"`);

    // Enhance the prompt with advertising creative structure
    const enhancedPrompt = `Create a modern advertising creative (not a photoshoot) for social media. ${result.prompt} 

The creative should look like a professionally designed ad with intentional visual zones - product area, text sections, and CTA placement. The composition should feel polished and designed, not just captured.

Include the tagline "${result.tagline}" and CTA button "${result.ctaText}" integrated elegantly into the design.

Modern advertising aesthetic - balance photography with graphic design elements. The final result should be scroll-stopping, eye-catching, and clearly look like a designed advertisement, not raw photography.`;

    return {
      prompt: enhancedPrompt,
      recommendedStyle: result.recommendedStyle || 'advertising creative',
      tagline: result.tagline || 'Discover More',
      ctaText: result.ctaText || 'Learn More',
    };
  } catch (err) {
    console.error('❌ Error generating image prompt from descriptions:', err);
    return {
      prompt:
        'Create a modern advertising creative for social media. Feature the product prominently with one human subject when relevant. The composition should feel cinematic and professional, like a real product photoshoot or campaign ad. Include tagline "Discover More" and CTA button "Learn More" integrated elegantly into the design. Should look like a professionally designed ad with modern advertising aesthetic.',
      recommendedStyle: 'advertising creative',
      tagline: 'Discover More',
      ctaText: 'Learn More',
    };
  }
}

/**
 * Extract OG image from website URL
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
 * Generate image with Gemini 2.5 Flash Image Preview API
 * Docs: https://docs.freepik.com/api-reference/text-to-image/google/post-gemini-2-5-flash-image-preview
 */
async function generateImageWithGeminiFlash(
  prompt: string,
  projectId: string,
  referenceImages?: (string | null)[]
): Promise<string | null> {
  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('Freepik API key is not configured');
  }

  try {
    console.log('🌐 Generating image with Gemini 2.5 Flash...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');

    const url = `https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview`;

    const refs = (referenceImages || []).filter(Boolean) as string[];

    // Strengthen prompt to explicitly use references
    const effectivePrompt =
      refs.length > 0
        ? `${prompt}
        CRITICAL: You are provided reference images. 
The first reference is the brand logo – include it once, small and tasteful (e.g., a corner watermark), never duplicated. 
The second reference is the product/OG image – use it as the visual/product reference so the generated ad clearly matches this product. 
The third reference is a blank white canvas; use it to ensure a clean, full-bleed composition without unintended borders.

Important composition rules:
- Fill the entire canvas 1024*1024 fully (edge-to-edge, full-bleed composition).
- Do not leave any white areas, borders, padding, or margins.
- Avoid framed, mockup, or poster-style layouts.
        `
        : prompt;

    const requestBody: any = {
      prompt: effectivePrompt,
    };

    if (refs.length > 0) {
      requestBody.reference_images = refs.slice(0, 3);
    }

    console.log(
      '📋 Request body:',
      JSON.stringify(
        {
          prompt: requestBody.prompt.substring(0, 100) + '...',
          reference_images: requestBody.reference_images
            ? `count=${requestBody.reference_images.length}`
            : 'none',
        },
        null,
        2
      )
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-freepik-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini 2.5 Flash API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Gemini 2.5 Flash API error ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    console.log(
      '📊 Gemini 2.5 Flash API response:',
      JSON.stringify(data, null, 2)
    );

    const taskId = data.data?.task_id;
    if (!taskId) {
      throw new Error('No task ID returned from Gemini 2.5 Flash API');
    }

    const status = data.data?.status;
    console.log(
      `✅ Image generation started, task ID: ${taskId}, status: ${status}`
    );

    // Poll for completion
    const generatedImageUrl = await pollGeminiFlashTaskStatus(
      taskId,
      projectId
    );
    return generatedImageUrl;
  } catch (error) {
    console.error('❌ Error generating image with Gemini 2.5 Flash:', error);
    throw error;
  }
}

/**
 * Poll Gemini 2.5 Flash task status until completion
 */
async function pollGeminiFlashTaskStatus(
  taskId: string,
  projectId?: string,
  maxAttempts: number = 60
): Promise<string | null> {
  console.log('⏳ Polling Gemini 2.5 Flash task status...');

  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('FREEPIK_API_KEY is not configured');
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const pollUrl = `https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview/${taskId}`;

      const response = await fetch(pollUrl, {
        headers: {
          'x-freepik-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini 2.5 Flash polling error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`Freepik API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`📊 Poll attempt ${i + 1}: Status = ${data.data?.status}`);

      if (data.data?.status === 'COMPLETED') {
        console.log('✅ Image generation completed!');

        const imageUrl = data.data.generated?.[0];
        if (!imageUrl) {
          throw new Error('No image URL in completed task');
        }

        if (projectId) {
          console.log('💾 Downloading and saving image to Supabase...');
          const imageBuffer = await downloadImageAsBase64(imageUrl);
          if (imageBuffer) {
            const savedUrl = await saveBase64ImageToSupabase(
              imageBuffer,
              projectId,
              `generated-${Date.now()}.png`
            );
            if (savedUrl) {
              console.log('✅ Image saved to Supabase:', savedUrl);
              return savedUrl;
            }
          }
        }

        return imageUrl;
      }

      if (data.data?.status === 'FAILED') {
        throw new Error(
          `Gemini 2.5 Flash image generation failed: ${data.data?.message || 'Unknown error'}`
        );
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('❌ Error polling task status:', error);
      throw error;
    }
  }

  throw new Error('Gemini 2.5 Flash image generation timeout');
}

/**
 * Generate image with Seedream 4 Edit API
 * Docs: https://docs.freepik.com/api-reference/text-to-image/seedream-4-edit/post-seedream-v4-edit
 */
async function generateImageWithSeedreamV4Edit(
  prompt: string,
  projectId: string,
  referenceImages?: (string | null)[]
): Promise<string | null> {
  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('Freepik API key is not configured');
  }

  try {
    console.log('🌐 Generating image with Seedream 4 Edit...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');

    const url = `https://api.freepik.com/v1/ai/text-to-image/seedream-v4-edit`;

    const refs = (referenceImages || []).filter(Boolean) as string[];

    // Strengthen prompt to explicitly use references
    const effectivePrompt =
      refs.length > 0
        ? `${prompt}
        CRITICAL: You are provided reference images. 
The first reference is the brand logo – include it once, small and tasteful (e.g., a corner watermark), never duplicated. 
The second reference is the product/OG image – use it as the visual/product reference so the generated ad clearly matches this product. 

Important composition rules:
- Fill the entire canvas fully (edge-to-edge, full-bleed composition).
- Do not leave any white areas, borders, padding, or margins.
- Avoid framed, mockup, or poster-style layouts.
        `
        : prompt;

    const requestBody: any = {
      prompt: effectivePrompt,
      aspect_ratio: 'square_1_1',
    };

    if (refs.length > 0) {
      requestBody.reference_images = refs.slice(0, 5); // Max 5 reference images allowed
    }

    console.log(
      '📋 Request body:',
      JSON.stringify(
        {
          prompt: requestBody.prompt.substring(0, 100) + '...',
          aspect_ratio: requestBody.aspect_ratio,
          reference_images: requestBody.reference_images
            ? `count=${requestBody.reference_images.length}`
            : 'none',
        },
        null,
        2
      )
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-freepik-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Seedream 4 Edit API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Seedream 4 Edit API error ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    console.log(
      '📊 Seedream 4 Edit API response:',
      JSON.stringify(data, null, 2)
    );

    const taskId = data.data?.task_id;
    if (!taskId) {
      throw new Error('No task ID returned from Seedream 4 Edit API');
    }

    const status = data.data?.status;
    console.log(
      `✅ Image generation started, task ID: ${taskId}, status: ${status}`
    );

    // Poll for completion
    const generatedImageUrl = await pollSeedreamV4EditTaskStatus(
      taskId,
      projectId
    );
    return generatedImageUrl;
  } catch (error) {
    console.error('❌ Error generating image with Seedream 4 Edit:', error);
    throw error;
  }
}

/**
 * Poll Seedream 4 Edit task status until completion
 */
async function pollSeedreamV4EditTaskStatus(
  taskId: string,
  projectId?: string,
  maxAttempts: number = 60
): Promise<string | null> {
  console.log('⏳ Polling Seedream 4 Edit task status...');

  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('FREEPIK_API_KEY is not configured');
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const pollUrl = `https://api.freepik.com/v1/ai/text-to-image/seedream-v4-edit/${taskId}`;

      const response = await fetch(pollUrl, {
        headers: {
          'x-freepik-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Seedream 4 Edit polling error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`Freepik API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`📊 Poll attempt ${i + 1}: Status = ${data.data?.status}`);

      if (data.data?.status === 'COMPLETED') {
        console.log('✅ Image generation completed!');

        const imageUrl = data.data.generated?.[0];
        if (!imageUrl) {
          throw new Error('No image URL in completed task');
        }

        if (projectId) {
          console.log('💾 Downloading and saving image to Supabase...');
          const imageBuffer = await downloadImageAsBase64(imageUrl);
          if (imageBuffer) {
            const savedUrl = await saveBase64ImageToSupabase(
              imageBuffer,
              projectId,
              `generated-${Date.now()}.png`
            );
            if (savedUrl) {
              console.log('✅ Image saved to Supabase:', savedUrl);
              return savedUrl;
            }
          }
        }

        return imageUrl;
      }

      if (data.data?.status === 'FAILED') {
        throw new Error(
          `Seedream 4 Edit image generation failed: ${data.data?.message || 'Unknown error'}`
        );
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('❌ Error polling task status:', error);
      throw error;
    }
  }

  throw new Error('Seedream 4 Edit image generation timeout');
}

// Seedream post-editing removed from this flow

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
      `🚀 Starting product image generation for project: ${project_id}`
    );

    // Step 1: Fetch project data
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
      'Premium products for modern consumers';

    // Step 4: Generate image prompt
    console.log('🤖 Generating image prompt...');
    const promptData = await generateImagePromptFromDescriptions(
      sellingPoints,
      adsGoalStrategy,
      productInformation
    );

    // Step 5: Extract logo and OG image URLs in parallel
    console.log('🖼️ Extracting logo and OG image URLs...');
    const logoUrl = analysingPoints.logoUrl;

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

    // Step 6: Download logo and OG image in parallel
    console.log('📥 Downloading logo, OG image, and white canvas in parallel...');
    const downloadPromises = [];

    if (logoUrl) {
      downloadPromises.push(downloadImageAsBase64(logoUrl));
    } else {
      downloadPromises.push(Promise.resolve(null));
    }

    if (ogImageUrl) {
      downloadPromises.push(downloadImageAsBase64(ogImageUrl));
    } else {
      downloadPromises.push(Promise.resolve(null));
    }

    // Download white canvas image as third reference
    const whiteCanvasUrl =
      'https://ghsgnjzkgygiqmhjvtpi.supabase.co/storage/v1/object/public/project-files/white-canvas-1024_1024.png';
    downloadPromises.push(downloadImageAsBase64(whiteCanvasUrl));

    const [logoBase64, ogImageBase64, whiteCanvasBase64] = await Promise.all(downloadPromises);

    // Step 7: Generate 2 images with Gemini 2.5 Flash (using available references)
    console.log('🌐 Generating 2 images with Gemini 2.5 Flash...');
    
    // Generate first image
    console.log('📸 Generating first image...');
    const generatedImageUrl1 = await generateImageWithGeminiFlash(
      promptData.prompt,
      project_id,
      [logoBase64 || null, ogImageBase64 || null, whiteCanvasBase64 || null]
    );

    // Generate second image
    console.log('📸 Generating second image...');
    const generatedImageUrl2 = await generateImageWithGeminiFlash(
      promptData.prompt,
      project_id,
      [logoBase64 || null, ogImageBase64 || null, whiteCanvasBase64 || null]
    );

    if (!generatedImageUrl1 && !generatedImageUrl2) {
      return NextResponse.json(
        { error: 'Failed to generate images with Gemini 2.5 Flash' },
        { status: 500 }
      );
    }

    // Step 8: Reference images already used in generation above
    const referenceImages: string[] = [];
    if (logoBase64) referenceImages.push(logoBase64);
    if (ogImageBase64) referenceImages.push(ogImageBase64);
    if (whiteCanvasBase64) referenceImages.push(whiteCanvasBase64);

    // Step 10: Save images to Supabase storage and update database
    console.log(
      '💾 Saving images to Supabase storage and updating database...'
    );
    const timestamp = Date.now();

    // Images are already saved to Supabase by the generation functions
    const generatedImages = [generatedImageUrl1, generatedImageUrl2].filter(Boolean) as string[];

    // Step 11: Update ai_images in database with both images
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
      generatedImageUrl: generatedImageUrl1 || generatedImageUrl2 || undefined,
      // No enhanced image in this flow
      logoUrl: logoUrl || undefined,
      ogImageUrl: ogImageUrl || undefined,
    };

    console.log('🎉 Product image generation complete!');
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Error in product image generation:', error);
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
