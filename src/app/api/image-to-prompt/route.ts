// app/api/image-to-prompt/route.ts
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

type FreepikImageToPromptResult = {
  taskId: string;
  status: string;
  generated?: string[];
};

/**
 * Generate AI prompt from image using Freepik Image-to-Prompt API
 */
async function generatePromptFromImage(
  imageUrl: string
): Promise<FreepikImageToPromptResult> {
  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('Freepik API key is not configured');
  }

  try {
    console.log('🎨 Generating prompt from image with Freepik...');
    console.log('📷 Image URL:', imageUrl);

    const url = 'https://api.freepik.com/v1/ai/image-to-prompt';

    const requestBody = {
      image: imageUrl,
    };

    const options = {
      method: 'POST',
      headers: {
        'x-freepik-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    };

    console.log('📤 Sending request to Freepik Image-to-Prompt API...');

    const response = await fetch(url, options);

    console.log(
      `📡 Response status: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Freepik Image-to-Prompt API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Freepik API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log(
      '📊 Freepik Image-to-Prompt Response:',
      JSON.stringify(data, null, 2)
    );

    if (!data.data?.task_id) {
      throw new Error('No task ID returned from Freepik Image-to-Prompt API');
    }

    console.log('✅ Image-to-prompt task created:', data.data.task_id);

    return {
      taskId: data.data.task_id,
      status: data.data.status,
      generated: data.data.generated,
    };
  } catch (error: any) {
    console.error('❌ Error generating prompt from image:', error);
    throw error;
  }
}

/**
 * Poll Freepik Image-to-Prompt task status until completion
 */
async function pollImageToPromptStatus(
  taskId: string,
  maxAttempts: number = 30
): Promise<string[]> {
  console.log('⏳ Polling Freepik Image-to-Prompt task status...');

  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('FREEPIK_API_KEY is not configured');
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const pollUrl = `https://api.freepik.com/v1/ai/image-to-prompt/${taskId}`;
      console.log(`🔍 Polling URL (attempt ${i + 1}): ${pollUrl}`);

      const response = await fetch(pollUrl, {
        headers: {
          'x-freepik-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log(
        `📡 Response status: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        const responseText = await response.text();
        console.error('❌ Non-OK response:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText.substring(0, 500),
        });
        throw new Error(
          `Freepik API error ${response.status}: ${responseText.substring(0, 200)}`
        );
      }

      const data = await response.json();
      console.log(`📊 Poll attempt ${i + 1}: Status = ${data.data?.status}`);

      if (data.data?.status === 'COMPLETED') {
        console.log('✅ Image-to-prompt analysis completed!');
        return data.data.generated || [];
      }

      if (data.data?.status === 'FAILED') {
        console.error(
          '❌ Image-to-prompt failed:',
          JSON.stringify(data, null, 2)
        );
        throw new Error(
          `Freepik image-to-prompt failed: ${data.data?.message || 'Unknown error'}`
        );
      }

      // Wait 3 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('❌ Error polling image-to-prompt status:', error);
      throw error;
    }
  }

  throw new Error('Freepik image-to-prompt analysis timeout');
}

/**
 * Generate high-quality Facebook ad visual prompt using ChatGPT
 */
async function generateFacebookAdPrompt(
  imageAnalysis: string,
  businessContext: any
): Promise<string> {
  console.log('📝 Generating Facebook ad visual prompt with ChatGPT...');

  const prompt = `You are an expert Facebook ad creative strategist. Based on the image analysis and business context, create a detailed prompt for generating a high-converting Facebook ad visual.

**IMAGE ANALYSIS:**
${imageAnalysis}

**BUSINESS CONTEXT:**
- Business Type: ${businessContext.businessDescription || 'Professional service'}
- Page Type: ${businessContext.pageType || 'business page'}
- Service Type: ${businessContext.serviceType || 'general service'}
- Product Category: ${businessContext.productCategory || 'general'}
- Target Audience: ${businessContext.inferredAudience || 'general consumers'}
- Brand Colors: ${businessContext.colorScheme || 'professional blue and white'}
- Visual Style: ${businessContext.visualElements || 'clean and modern'}

**REQUIREMENTS:**
Create a comprehensive prompt for generating a 1080x1080 square PRODUCT-FOCUSED Facebook ad image that:

1. **PRODUCT-CENTRIC COMPOSITION:**
   - Make the product the HERO of the image (70% of visual focus)
   - Describe the ideal scene/setting that showcases the product
   - Include specific environmental details that complement the product
   - Define the focal point as the product itself
   - Minimal human presence (max 20% of frame, hands only if needed)

2. **PRODUCT STORYTELLING:**
   - Show the product in action or being used
   - Tell a story through the product's benefits and value
   - Demonstrate the product's key features visually
   - Create emotional connection through product quality
   - Show the transformation or outcome the product provides

3. **PRODUCT INTEGRATION:**
   - Specific placement and positioning of the product
   - Show the value or benefit in action
   - Include relevant props that enhance the product story
   - Professional environment that complements the product
   - Clean background with space for text overlays

4. **TECHNICAL SPECIFICATIONS:**
   - Camera angle that highlights the product
   - Lighting setup that makes the product shine
   - Depth of field focusing on product details
   - Post-processing style that enhances product appeal

5. **CONVERSION ELEMENTS:**
   - Visual cues that encourage product purchase
   - Trust and authority indicators through product quality
   - Professional credibility elements
   - Quality and value visual hints

6. **BRAND CONSISTENCY:**
   - Match the analyzed brand colors and style
   - Maintain professional appearance
   - Include space for headline and CTA text overlays
   - Ensure brand recognition through logo placement

**PROFESSIONAL QUALITY MANDATES:**
- MUST be exactly 1080x1080 square format
- NO badges, stars, ratings, or review elements
- NO text overlays, callouts, or promotional stickers
- NO price tags, discount badges, or sale indicators
- NO social media icons or platform-specific elements
- NO cluttered or busy compositions
- Clean, minimalist, editorial-quality aesthetic
- Professional studio or lifestyle photography style
- Ultra-high resolution and sharp focus
- Sophisticated color grading and premium finish

**OUTPUT FORMAT:**
Provide a detailed, cinematic description (300-400 words) that can be used directly with AI image generation tools. Make it specific, actionable, and optimized for Facebook ad performance.

Focus on creating a clean, professional scene that will stop users from scrolling and encourage them to engage with the ad.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const generatedPrompt = response.choices[0].message.content || '';
    console.log('✅ Facebook ad visual prompt generated');
    return generatedPrompt;
  } catch (error) {
    console.error('❌ Error generating Facebook ad prompt:', error);
    throw error;
  }
}

/**
 * Main API route
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
      '🚀 Starting image-to-prompt analysis for project:',
      project_id
    );

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

    // Step 2: Get screenshot from analysing_points
    let analysingPoints: any = null;
    try {
      analysingPoints =
        typeof project?.analysing_points === 'string'
          ? JSON.parse(project.analysing_points)
          : project?.analysing_points;
    } catch (error) {
      console.error('Error parsing analysing_points:', error);
    }

    const screenshotUrl = analysingPoints?.parsingUrl?.screenshot;
    if (!screenshotUrl) {
      return NextResponse.json(
        { error: 'No screenshot found. Please run analyzing-points first.' },
        { status: 400 }
      );
    }

    console.log('📸 Screenshot URL:', screenshotUrl);

    // Step 3: Analyze screenshot with GPT-4 Vision for business context
    console.log('🔍 Analyzing screenshot for business context...');
    const screenshotAnalysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this website screenshot and extract business information for ad creation:

1. Business Type: What does this business do?
2. Page Type: Is this a product page, service page, home page, or landing page?
3. Service Type: If it's a service, what type of service?
4. Product Category: If it's a product, what category?
5. Target Audience: Who is the likely target audience?
6. Brand Colors: What are the primary brand colors?
7. Visual Style: What's the overall design aesthetic?
8. Key Features: What are the main selling points or features?

Return as JSON with these fields.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: screenshotUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const businessContext = JSON.parse(
      screenshotAnalysisResponse.choices[0].message.content || '{}'
    );

    console.log('✅ Business context extracted:', businessContext);

    // Step 4: Generate prompt from image using Freepik
    console.log('🎨 Generating prompt from image with Freepik...');
    const imageToPromptResult = await generatePromptFromImage(screenshotUrl);

    // Step 5: Poll for completion
    console.log('⏳ Waiting for image analysis to complete...');
    const generatedPrompts = await pollImageToPromptStatus(
      imageToPromptResult.taskId
    );

    if (!generatedPrompts || generatedPrompts.length === 0) {
      throw new Error('No prompts generated from image analysis');
    }

    const imageAnalysis = generatedPrompts[0];
    console.log(
      '✅ Image analysis completed:',
      imageAnalysis.substring(0, 100) + '...'
    );

    // Step 6: Generate Facebook ad visual prompt with ChatGPT
    console.log('📝 Generating Facebook ad visual prompt...');
    const facebookAdPrompt = await generateFacebookAdPrompt(
      imageAnalysis,
      businessContext
    );

    // Step 7: Return comprehensive response
    const response = {
      success: true,
      project_id,
      screenshot_url: screenshotUrl,
      business_context: businessContext,
      image_analysis: {
        freepik_task_id: imageToPromptResult.taskId,
        generated_prompts: generatedPrompts,
        primary_analysis: imageAnalysis,
      },
      facebook_ad_prompt: facebookAdPrompt,
      metadata: {
        analysis_method: 'freepik-image-to-prompt + chatgpt-enhancement',
        timestamp: new Date().toISOString(),
        prompt_length: facebookAdPrompt.length,
      },
    };

    console.log('🎉 Image-to-prompt analysis complete!');
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('❌ Error in image-to-prompt:', err);
    return NextResponse.json(
      { error: err.message || String(err), stack: err.stack },
      { status: 500 }
    );
  }
}

// Simple GET method to test if route is accessible
export async function GET(request: NextRequest) {
  console.log('🔍 Image-to-Prompt API GET method called');
  try {
    return NextResponse.json({
      success: true,
      message: 'Image-to-Prompt API is working',
      method: 'GET',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
