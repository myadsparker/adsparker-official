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

    // Strengthen prompt to explicitly use logo reference
    const effectivePrompt =
      refs.length > 0
        ? `${prompt}
        CRITICAL: You are provided a reference image which is the brand logo. 
        Include the logo once, small and tasteful (e.g., a corner watermark), never duplicated. 
        
        Important composition rules:
        - Only ONE person (subject) should appear in the final image — do NOT duplicate or mirror the same person.
        - Fill the entire canvas 1024*1024 fully (edge-to-edge, full-bleed composition).
        - The service and person should be natural, cohesive, and clearly branded.
        - Do not leave any white areas, borders, padding, or margins.
        - Avoid framed, mockup, or poster-style layouts.
        
        Do not include text duplication, extra logos, or repeated visual elements. Only one person, one service, and one logo should be shown in the final image.
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

    // Step 5: Extract logo URL only (no OG image extraction)
    console.log('🖼️ Extracting logo URL...');
    const logoUrl = analysingPoints.logoUrl;

    // Step 6: Download logo only
    console.log('📥 Downloading logo...');
    let logoBase64: string | null = null;

    if (logoUrl) {
      logoBase64 = await downloadImageAsBase64(logoUrl);
    }

    // Step 7: Generate image with Gemini 2.5 Flash (using logo only as reference)
    console.log('🌐 Generating image with Gemini 2.5 Flash...');
    const generatedImageUrl = await generateImageWithGeminiFlash(
      promptData.prompt,
      project_id,
      [logoBase64 || null]
    );

    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate image with Gemini 2.5 Flash' },
        { status: 500 }
      );
    }

    // Step 8: Update ai_images in database
    if (generatedImageUrl) {
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
          const newImages: string[] = [];
          if (
            generatedImageUrl &&
            !existingAiImages.includes(generatedImageUrl)
          ) {
            newImages.push(generatedImageUrl);
          }

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
                '✅ AI image URL saved to ai_images column:',
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
