// app/api/website-image-gen/route.ts
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

type ScreenshotAnalysis = {
  visualElements: string;
  colorScheme: string;
  layout: string;
  keyFeatures: string[];
  brandingElements: string;
  userInterface: string;
  pageType?:
    | 'product_page'
    | 'home_page'
    | 'landing_page'
    | 'service_page'
    | 'blog_page'
    | 'portfolio_page';
  isProductPage?: boolean;
  is_product_page: boolean;
  hasMainProduct?: boolean;
  mainProductDescription?: string;
  inferredAudience?: string;
  // Enhanced analysis fields
  textContent?: {
    headings: string[];
    taglines: string[];
    productTitles: string[];
    extractedText: string;
  };
  sceneContext?: {
    environment:
      | 'indoor'
      | 'outdoor'
      | 'city'
      | 'studio'
      | 'nature'
      | 'office'
      | 'home'
      | 'unknown';
    backgroundType: string; // ideal background for ad image
    setting: string; // recommended scene setting for advertising
  };
  humanPresence?: {
    hasPeople: boolean;
    peopleCount: number;
    gender: 'male' | 'female' | 'mixed' | 'none';
    clothing: string[];
    expressions: string[];
    demographics: string;
  };
  contentType?: {
    type:
      | 'product_page'
      | 'service_page'
      | 'homepage'
      | 'blog_page'
      | 'portfolio_page'
      | 'landing_page';
    isService: boolean;
    isProduct: boolean;
    isHomepage: boolean;
    category: string;
  };
  visualStyle?: {
    style:
      | 'minimalist'
      | 'luxury'
      | 'bold'
      | 'vintage'
      | 'techy'
      | 'corporate'
      | 'playful'
      | 'elegant'
      | 'modern'
      | 'classic';
    mood: string;
    aesthetic: string;
  };
  category?: {
    domain:
      | 'fashion'
      | 'beauty'
      | 'saas'
      | 'travel'
      | 'fitness'
      | 'food'
      | 'tech'
      | 'finance'
      | 'education'
      | 'healthcare'
      | 'ecommerce'
      | 'other';
    industry: string;
    businessType: string;
  };
  // New fields for text in image
  tagline?: string;
  ctaText?: string;
  // Style recommendation from ChatGPT analysis
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
          content: `You are an expert AI ad creative director specialized in creating high-performing ads for Meta/Facebook marketing campaigns.

You will receive business descriptions including selling points, advertising strategy, and product information.

Your task is to:
1. Create a high-quality, descriptive AI image generation prompt for Facebook/Instagram ads
3. Extract a compelling tagline from the business descriptions
4. Suggest an appropriate CTA text based on the business type

The image prompt must:
- Clearly describe the main subject, product, or service
- Show people in relevant context (age, gender, clothing, posture, expression)
- Specify background/environment (indoor/outdoor, urban/nature/office, lifestyle context)
- Include lighting, camera/lens perspective, and depth of field
- Describe visual style and mood (cinematic, editorial, playful, luxury, energetic, cozy, etc.)
- Include brand colors if mentioned
- Emphasize composition for social media (square or vertical format, focus on subject)
- INCLUDE TEXT IN THE IMAGE: Add the tagline and CTA text as part of the image
- Make text prominent, readable, and integrated into the design
- CTA text should be on a button or call-out element
- Tagline should be a headline integrated into the image

Return your answer in JSON format with:
- "prompt": the detailed image generation prompt
- "recommendedStyle": one of the style options from the list above
- "tagline": a compelling tagline extracted from the descriptions
- "ctaText": appropriate CTA like "Shop Now", "Order Now", "Book Now", "Get Started", "Try Now", etc.`,
        },
        {
          role: 'user',
          content: `Generate an AI image generation prompt for a Facebook/Instagram ad with integrated text overlay.

SELLING POINTS: ${sellingPoints}

ADVERTISING STRATEGY: ${adsGoalStrategy}

PRODUCT/SERVICE INFORMATION: ${productInformation}

Create a compelling ad image prompt that:
1. Shows who the business is for (target audience)
2. Demonstrates the value proposition visually
3. Makes the business purpose clear
4. Creates emotional connection with the viewer
5. Includes the tagline and CTA text integrated into the image design`,
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

    return {
      prompt:
        result.prompt ||
        'High-quality marketing ad image with professional lighting and composition',
      recommendedStyle: result.recommendedStyle || 'photo',
      tagline: result.tagline || 'Discover More',
      ctaText: result.ctaText || 'Learn More',
    };
  } catch (err) {
    console.error('❌ Error generating image prompt from descriptions:', err);
    return {
      prompt:
        'High-quality marketing ad image with professional lighting and composition, featuring the tagline "Discover More" and CTA button "Learn More" integrated into the design',
      recommendedStyle: 'photo',
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
 * Save base64 image to Supabase storage and return public URL
 */
async function saveImageToSupabase(
  base64Image: string,
  projectId: string
): Promise<string | null> {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    const timestamp = Date.now();
    const fileName = `${projectId}/images/service-ad-${timestamp}.png`;

    const { error } = await supabase.storage
      .from('project-files')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
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
 * Enhance product image with Seedream 4 Edit using OG image as reference
 */
async function enhanceProductImageWithSeedream(
  baseImageUrl: string,
  originalPrompt: string,
  referenceImages: string[],
  projectId: string
): Promise<string | null> {
  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('Freepik API key is not configured');
  }

  try {
    console.log('✨ Enhancing product image with Seedream 4 Edit...');

    // Download the Flux pro v1.1-generated image and convert to base64
    const imageBase64 = await downloadImageAsBase64(baseImageUrl);
    if (!imageBase64) {
      console.error('❌ Failed to download image for enhancement');
      return baseImageUrl; // Return original if download fails
    }

    // Create enhancement prompt
    const enhancementPrompt = `Enhance this marketing image: improve product clarity and detail, enhance lighting and shadows for professional look, improve color vibrancy and contrast, ensure crisp and clear visuals, maintain the original composition and functionality. Original content: ${originalPrompt}`;

    const url = `https://api.freepik.com/v1/ai/text-to-image/seedream-v4-edit`;

    const requestBody: any = {
      prompt: enhancementPrompt,
      reference_images: [imageBase64, ...referenceImages.slice(0, 2)], // Include Flux pro v1.1 image + OG image
      aspect_ratio: 'square_1_1',
      guidance_scale: 7.5,
      seed: Math.floor(Math.random() * 2147483647),
    };

    console.log(
      `📷 Using ${requestBody.reference_images.length} reference images (Flux pro v1.1 + product)`
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
      console.error('❌ Seedream 4 Edit enhancement API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return baseImageUrl; // Return original if enhancement fails
    }

    const data = await response.json();
    console.log(
      '📊 Seedream 4 Edit enhancement response:',
      JSON.stringify(data, null, 2)
    );

    const taskId = data.data?.task_id;
    if (!taskId) {
      console.error(
        '❌ No task ID returned from Seedream 4 Edit enhancement API'
      );
      return baseImageUrl;
    }

    console.log('✅ Image enhancement started, task ID:', taskId);

    // Poll for completion
    const enhancedImageUrl = await pollSeedreamTaskStatus(taskId);

    if (enhancedImageUrl) {
      console.log('✅ Image enhancement completed!');

      // Download and save enhanced image to Supabase
      console.log('💾 Downloading and saving enhanced image to Supabase...');
      const imageBuffer = await downloadImageAsBase64(enhancedImageUrl);
      if (imageBuffer) {
        const savedUrl = await saveImageToSupabase(imageBuffer, projectId);
        if (savedUrl) {
          console.log('✅ Enhanced image saved to Supabase:', savedUrl);
          return savedUrl;
        }
      }

      // If save fails, return the enhanced image URL
      return enhancedImageUrl;
    }

    return baseImageUrl; // Return original if enhancement returns null
  } catch (error) {
    console.error('❌ Error enhancing image with Seedream 4 Edit:', error);
    // Return original image if enhancement fails
    return baseImageUrl;
  }
}

/**
 * Generate image with Flux pro v1.1 API (for all pages)
 */
async function generateServiceImageWithFluxPro(
  prompt: string,
  projectId: string,
  style: string = 'photo'
): Promise<string | null> {
  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('Freepik API key is not configured');
  }

  try {
    console.log('🌐 Generating image with Flux pro v1.1...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');

    const url = `https://api.freepik.com/v1/ai/text-to-image/flux-pro-v1-1`;

    const requestBody: any = {
      prompt: prompt,
      prompt_upsampling: false,
      seed: null,
      aspect_ratio: 'square_1_1',
      safety_tolerance: 2,
      output_format: 'png',
    };

    console.log(
      '📋 Request body:',
      JSON.stringify(
        {
          prompt: requestBody.prompt.substring(0, 100) + '...',
          prompt_upsampling: requestBody.prompt_upsampling,
          aspect_ratio: requestBody.aspect_ratio,
          safety_tolerance: requestBody.safety_tolerance,
          output_format: requestBody.output_format,
        },
        null,
        2
      )
    );
    console.log(`🎨 Using style: ${style}`);

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
      console.error('❌ Flux pro v1.1 API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Flux pro v1.1 API error ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    console.log(
      '📊 Flux pro v1.1 API response:',
      JSON.stringify(data, null, 2)
    );

    const taskId = data.data?.task_id;
    if (!taskId) {
      throw new Error('No task ID returned from Flux pro v1.1 API');
    }

    const status = data.data?.status;
    console.log(
      `✅ Image generation started, task ID: ${taskId}, status: ${status}`
    );

    // Poll for completion
    const generatedImageUrl = await pollFluxProTaskStatus(taskId, projectId);
    return generatedImageUrl;
  } catch (error) {
    console.error('❌ Error generating image with Flux pro v1.1:', error);
    throw error;
  }
}

/**
 * Poll Flux pro v1.1 task status until completion
 */
async function pollFluxProTaskStatus(
  taskId: string,
  projectId?: string,
  maxAttempts: number = 60
): Promise<string | null> {
  console.log('⏳ Polling Flux pro v1.1 task status...');

  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('FREEPIK_API_KEY is not configured');
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const pollUrl = `https://api.freepik.com/v1/ai/text-to-image/flux-pro-v1-1/${taskId}`;

      const response = await fetch(pollUrl, {
        headers: {
          'x-freepik-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Flux pro v1.1 polling error:', {
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

        // Download image and save to Supabase if projectId is provided
        if (projectId) {
          console.log('💾 Downloading and saving image to Supabase...');
          const imageBuffer = await downloadImageAsBase64(imageUrl);
          if (imageBuffer) {
            const savedUrl = await saveImageToSupabase(imageBuffer, projectId);
            if (savedUrl) {
              console.log('✅ Image saved to Supabase:', savedUrl);
              return savedUrl;
            }
          }
        }

        // Return original URL if no projectId or save failed
        return imageUrl;
      }

      if (data.data?.status === 'FAILED') {
        throw new Error(
          `Flux pro v1.1 image generation failed: ${data.data?.message || 'Unknown error'}`
        );
      }

      // Wait 3 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('❌ Error polling task status:', error);
      throw error;
    }
  }

  throw new Error('Flux pro v1.1 image generation timeout');
}

/**
 * Poll Seedream 4 Edit task status until completion
 */
async function pollSeedreamTaskStatus(
  taskId: string,
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
        throw new Error(
          `Seedream 4 Edit API error ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();
      console.log(`📊 Poll attempt ${i + 1}: Status = ${data.data?.status}`);

      if (data.data?.status === 'COMPLETED') {
        console.log('✅ Image generation completed!');
        return data.data.generated?.[0] || null;
      }

      if (data.data?.status === 'FAILED') {
        throw new Error(
          `Seedream 4 Edit image generation failed: ${data.data?.message || 'Unknown error'}`
        );
      }

      // Wait 3 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('❌ Error polling Seedream task status:', error);
      throw error;
    }
  }

  throw new Error('Seedream 4 Edit image generation timeout');
}

/**
 * Main API route - Analyze screenshots and generate images
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

    console.log('🚀 Starting image generation for project:', project_id);

    // Step 1: Fetch project from Supabase
    console.log('📊 Fetching project from Supabase...');
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('url_analysis, analysing_points')
      .eq('project_id', project_id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Project not found', details: fetchError },
        { status: 404 }
      );
    }

    const websiteUrl = project.url_analysis?.website_url;
    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'No website URL found. Please run analyzing-points first.' },
        { status: 400 }
      );
    }

    // Step 2: Get business descriptions from analysing_points
    let analysingPoints: any = null;
    try {
      analysingPoints =
        typeof project?.analysing_points === 'string'
          ? JSON.parse(project.analysing_points)
          : project?.analysing_points;
    } catch (error) {
      console.error('Error parsing analysing_points:', error);
    }

    if (!analysingPoints) {
      return NextResponse.json(
        {
          error:
            'No analysing_points found. Please run analyzing-points first.',
        },
        { status: 400 }
      );
    }

    // Extract business descriptions
    const sellingPoints = analysingPoints?.sellingPoints?.description || '';
    const adsGoalStrategy = analysingPoints?.adsGoalStrategy?.description || '';
    const productInformation =
      analysingPoints?.productInformation?.description || '';

    if (!sellingPoints && !adsGoalStrategy && !productInformation) {
      return NextResponse.json(
        {
          error:
            'No business descriptions found in analysing_points. Please run analyzing-points first.',
        },
        { status: 400 }
      );
    }

    console.log('📝 Business descriptions extracted');

    // Step 3: Generate image prompt from business descriptions
    console.log(
      '🤖 Generating image prompt from business descriptions with ChatGPT...'
    );
    const promptData = await generateImagePromptFromDescriptions(
      sellingPoints,
      adsGoalStrategy,
      productInformation
    );

    const imagePrompt = promptData.prompt;
    const tagline = promptData.tagline;
    const ctaText = promptData.ctaText;
    const recommendedStyle = promptData.recommendedStyle;

    console.log('📝 Text elements:', { tagline, ctaText });
    console.log('🎨 Recommended style:', recommendedStyle);

    // Step 4: Try to extract OG image for potential enhancement
    console.log('🖼️ Attempting to extract OG image from website...');
    const ogImage = await extractOGImage(websiteUrl);
    let referenceImages: string[] = [];

    if (ogImage) {
      console.log('📥 Downloading OG image...');
      const ogImageBase64 = await downloadImageAsBase64(ogImage);
      if (ogImageBase64) {
        referenceImages.push(ogImageBase64);
        console.log('✅ OG image added as reference for potential enhancement');
      }
    }

    // Step 5: Generate image with Flux pro v1.1 API
    console.log('🌐 Generating image with Flux pro v1.1 API...');
    const initialImageUrl = await generateServiceImageWithFluxPro(
      imagePrompt,
      project_id,
      recommendedStyle
    );

    // Step 6: Optionally enhance with Seedream if we have reference images
    let finalImageUrl = initialImageUrl;
    if (initialImageUrl && referenceImages && referenceImages.length > 0) {
      console.log(
        '✨ Attempting to enhance image with Seedream 4 Edit using OG image reference...'
      );
      const enhancedImageUrl = await enhanceProductImageWithSeedream(
        initialImageUrl,
        imagePrompt,
        referenceImages,
        project_id
      );
      if (enhancedImageUrl) {
        finalImageUrl = enhancedImageUrl;
      }
    }

    // Step 7: Update ai_images in database
    if (finalImageUrl) {
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

          // Add new image URL (avoid duplicates)
          if (!existingAiImages.includes(finalImageUrl)) {
            const updatedAiImages = [...existingAiImages, finalImageUrl];

            // Update the database
            const { error: updateError } = await supabase
              .from('projects')
              .update({ ai_images: updatedAiImages })
              .eq('project_id', project_id);

            if (updateError) {
              console.error('❌ Failed to update ai_images:', updateError);
            } else {
              console.log(
                '✅ AI image URL saved to ai_images column:',
                finalImageUrl
              );
            }
          }
        }
      } catch (error) {
        console.error('❌ Error updating ai_images:', error);
      }
    }

    // Step 8: Return results
    const response = {
      success: true,
      project_id,
      website_url: websiteUrl,
      image_prompt: imagePrompt,
      generated_image_url: finalImageUrl,
      tagline: tagline,
      cta_text: ctaText,
      recommended_style: recommendedStyle,
      business_descriptions: {
        selling_points: sellingPoints,
        ads_goal_strategy: adsGoalStrategy,
        product_information: productInformation,
      },
    };

    console.log('✅ Image generation complete!');
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('❌ Error in website-image-gen:', err);
    return NextResponse.json(
      { error: err.message || String(err), stack: err.stack },
      { status: 500 }
    );
  }
}
