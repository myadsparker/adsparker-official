// app/api/generate-ad/route.ts
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

type FirecrawlResult = {
  logoUrl?: string;
  mainImageUrl?: string;
  logoDescription?: string;
  productDescription?: string;
  businessDescription?: string;
};

type ScreenshotAnalysis = {
  visualElements: string;
  colorScheme: string;
  layout: string;
  keyFeatures: string[];
  brandingElements: string;
  userInterface: string;
};

/**
 * Analyze screenshot using GPT-4 Vision
 */
async function analyzeScreenshot(
  screenshotUrl: string
): Promise<ScreenshotAnalysis> {
  console.log('📸 Analyzing screenshot with GPT-4 Vision...');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this website screenshot in detail. Focus on:
1. Visual elements and design style (modern, minimal, corporate, playful, etc.)
2. Color scheme and branding (primary colors, secondary colors, overall mood)
3. Layout and structure (hero section, navigation, content organization)
4. Key features visible (forms, CTAs, product images, testimonials, etc.)
5. Branding elements (logo style, typography, visual identity)
6. User interface patterns (buttons, cards, modals, etc.)

Provide a detailed analysis that will help create compelling ad visuals that match this brand's identity.

Return as JSON with fields: visualElements, colorScheme, layout, keyFeatures (array), brandingElements, userInterface`,
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
      max_tokens: 1500,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    console.log('✅ Screenshot analysis complete:', analysis);
    return analysis;
  } catch (err) {
    console.error('❌ Error analyzing screenshot:', err);
    return {
      visualElements: 'Unable to analyze',
      colorScheme: 'Unknown',
      layout: 'Unknown',
      keyFeatures: [],
      brandingElements: 'Unknown',
      userInterface: 'Unknown',
    };
  }
}

/**
 * Extract images and content from URL using Firecrawl
 */
async function extractContentFromUrl(url: string): Promise<FirecrawlResult> {
  console.log(`🔍 Extracting content from URL: ${url}`);

  try {
    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('❌ Firecrawl API error:', resp.status, errorText);
      throw new Error(`Firecrawl API error: ${resp.status}`);
    }

    const json = await resp.json();
    const markdown = json.data?.markdown || '';

    // Use GPT to analyze the scraped content
    const analysisPrompt = `Analyze this website content and extract:
1. Logo URL (look for main logo in header/metadata)
2. Main product/hero image URL
3. Brief description of what the logo looks like (colors, style, text)
4. Brief description of the main product/image (what it shows)
5. Brief business description (what they sell/offer)

Website URL: ${url}

Content:
${markdown.slice(0, 4000)}

Return as JSON with fields: logoUrl, mainImageUrl, logoDescription, productDescription, businessDescription`;

    const analysis = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: analysisPrompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(analysis.choices[0].message.content || '{}');
    console.log('📊 Extracted content:', result);

    return {
      logoUrl: result.logoUrl,
      mainImageUrl: result.mainImageUrl,
      logoDescription: result.logoDescription,
      productDescription: result.productDescription,
      businessDescription: result.businessDescription,
    };
  } catch (err) {
    console.error('❌ Error extracting content:', err);
    return {};
  }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToSupabase(
  imageData: string, // base64 string or data URL
  projectId: string,
  attemptNumber: number
): Promise<string | null> {
  try {
    let base64Data: string;

    // Handle both data URLs and raw base64
    if (imageData.startsWith('data:')) {
      base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    } else {
      base64Data = imageData;
    }

    const buffer = Buffer.from(base64Data, 'base64');

    const timestamp = Date.now();
    const fileName = `${projectId}/images/firecrawl-ad-${attemptNumber}-${timestamp}.png`;

    const { data, error } = await supabase.storage
      .from('project-files')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(data.path);

    console.log('✅ Image uploaded to Supabase:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('❌ Error uploading to Supabase:', err);
    return null;
  }
}

/**
 * Generate an image with GPT-Image-1 using the correct API
 */
async function generateImageFromPrompt(
  prompt: string
): Promise<{ dataUrl: string; b64: string }> {
  console.log('🎨 Generating image with GPT-Image-1...');
  console.log('📝 Prompt:', prompt.substring(0, 100) + '...');

  try {
    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: prompt,
      size: '1024x1024',
      quality: 'medium',
      n: 1,
    });

    const data0 = imageResponse.data?.[0];
    if (!data0) {
      throw new Error('Image not generated by OpenAI');
    }

    let base64Out: string | undefined;

    if (data0.b64_json) {
      base64Out = data0.b64_json;
      console.log('✅ Image generated with base64 data');
    } else if (data0.url) {
      console.log('📥 Downloading image from URL...');
      const resp = await fetch(data0.url);
      const buf = await resp.arrayBuffer();
      base64Out = Buffer.from(buf).toString('base64');
      console.log('✅ Image downloaded and converted to base64');
    }

    if (!base64Out) {
      throw new Error('No image data received from OpenAI');
    }

    const dataUrl = `data:image/png;base64,${base64Out}`;
    console.log(
      '✅ Image generation complete, size:',
      base64Out.length,
      'bytes'
    );

    return { dataUrl, b64: base64Out };
  } catch (error: any) {
    console.error('❌ Error generating image with GPT-Image-1:', error);

    // If GPT-Image-1 is not available, fall back to DALL-E
    if (error.code === 'model_not_found' || error.status === 404) {
      console.log('🔄 GPT-Image-1 not available, falling back to DALL-E-3...');

      const dallEResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      });

      const dallEData = dallEResponse.data?.[0];
      if (!dallEData?.url) {
        throw new Error('DALL-E also failed to generate image');
      }

      console.log('📥 Downloading DALL-E image from URL...');
      const resp = await fetch(dallEData.url);
      const buf = await resp.arrayBuffer();
      const base64Out = Buffer.from(buf).toString('base64');

      const dataUrl = `data:image/png;base64,${base64Out}`;
      console.log('✅ DALL-E image generation complete');

      return { dataUrl, b64: base64Out };
    }

    throw error;
  }
}

/**
 * Save image to Supabase with proper project context
 */
async function saveImageToSupabase(
  base64Data: string,
  projectId: string,
  attemptNumber: number
): Promise<string | null> {
  return await uploadToSupabase(base64Data, projectId, attemptNumber);
}

/**
 * Create or reuse an assistant
 */
async function ensureAssistant() {
  if (process.env.OPENAI_ASSISTANT_ID) {
    return process.env.OPENAI_ASSISTANT_ID;
  }

  console.log('📝 Creating AdCreative Assistant...');
  const assistant = await openai.beta.assistants.create({
    name: 'AdCreativeAgent',
    instructions: `You are an expert Facebook Ad creative strategist and director.

Your responsibilities:
1. Analyze businesses from their website data (description, images, logo, screenshot analysis)
2. Identify target audience, value propositions, and messaging angles
3. Create 3 compelling Facebook ad concepts with:
   - Attention-grabbing headline (5-8 words)
   - Engaging primary text (1-2 sentences)
   - Strong call-to-action
   - Detailed visual direction for image generation

4. For image generation prompts, be EXTREMELY detailed:
   - Describe the exact layout and composition
   - Specify colors that match the brand (from screenshot analysis)
   - Include lighting style and mood (photorealistic, illustrated, modern, etc.)
   - Describe text placement if any
   - Describe how to represent the product/service visually
   - Match the visual style from the screenshot analysis
   - Use the color scheme and branding elements identified

5. Evaluate generated images on a 1-10 scale based on:
   - Visual appeal and professionalism (2 points)
   - Brand alignment and color consistency (2 points)
   - Clear value proposition (2 points)
   - Attention-grabbing quality (2 points)
   - Mobile-friendliness and text readability (2 points)

Be critical - only give 10/10 for truly exceptional ads.

Always respond in valid JSON format when requested.`,
    model: 'gpt-4o',
    tools: [],
  });

  console.log('✅ Assistant created:', assistant.id);
  return assistant.id;
}

/**
 * Main API route
 */
export async function POST(req: NextRequest) {
  try {
    // Clone the request to read the body as text first for debugging
    const clonedReq = req.clone();
    let rawBody = '';

    try {
      rawBody = await clonedReq.text();
      console.log('📥 Raw request body:', rawBody);
    } catch (e) {
      console.error('Could not read raw body:', e);
    }

    // Parse request body with better error handling
    let body;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('❌ Raw body that failed to parse:', rawBody);
      console.error('❌ Character at position 62:', rawBody.charAt(62));
      console.error(
        '❌ Context around position 62:',
        rawBody.substring(50, 75)
      );
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          details: parseError.message,
          hint: 'Ensure you are sending valid JSON with properly quoted property names',
          rawBodyReceived: rawBody,
          problemArea: rawBody.substring(
            Math.max(0, 62 - 20),
            Math.min(rawBody.length, 62 + 20)
          ),
        },
        { status: 400 }
      );
    }

    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting ad generation for project:', project_id);

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

    // Step 3: Analyze screenshot with GPT-4 Vision
    const screenshotAnalysis = await analyzeScreenshot(screenshotUrl);

    // Step 4: Extract content from URL using Firecrawl
    const extracted = await extractContentFromUrl(websiteUrl);

    // Step 5: Ensure assistant exists
    const assistantId = await ensureAssistant();

    // Step 6: Create thread and analyze business with screenshot context
    const thread = await openai.beta.threads.create();
    const threadId = thread.id;

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: `Analyze this business and create 3 Facebook ad concepts optimized for conversion.

Website: ${websiteUrl}
Project ID: ${project_id}

SCREENSHOT ANALYSIS (CRITICAL - USE THIS FOR BRAND CONSISTENCY):
- Visual Style: ${screenshotAnalysis.visualElements}
- Color Scheme: ${screenshotAnalysis.colorScheme}
- Layout: ${screenshotAnalysis.layout}
- Key Features: ${screenshotAnalysis.keyFeatures.join(', ')}
- Branding: ${screenshotAnalysis.brandingElements}
- UI Patterns: ${screenshotAnalysis.userInterface}

CONTENT EXTRACTED:
- Business: ${extracted.businessDescription || 'Service/Product business'}
- Logo: ${extracted.logoDescription || 'Not provided'}
- Product/Hero Image: ${extracted.productDescription || 'Not provided'}

TASKS:
1. Analyze the business, target audience, and value proposition
2. Create 3 ad concepts that MATCH THE SCREENSHOT'S VISUAL STYLE AND COLORS
3. Each image_prompt must be extremely detailed (250+ words) and include:
   - The exact color scheme from the screenshot
   - The visual style that matches their brand
   - Layout composition (product placement, text areas, CTA button placement)
   - Lighting and mood
   - Specific elements visible in their website

Return strict JSON format:
{
  "analysis": {
    "business_type": "...",
    "target_audience": "...",
    "key_value_props": ["..."],
    "tone": "...",
    "brand_colors": "from screenshot analysis",
    "visual_style": "from screenshot analysis"
  },
  "concepts": [
    {
      "headline": "...",
      "primary_text": "...",
      "cta": "...",
      "image_prompt": "DETAILED 250+ word description matching their brand..."
    }
  ]
}`,
    });

    // Step 7: Run assistant to get concepts
    let run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,
    });

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0];
    const responseText =
      lastMessage.content[0].type === 'text'
        ? lastMessage.content[0].text.value
        : '';

    let conceptsData: any;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      conceptsData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      // Ask assistant to reformat
      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: 'Please provide your response as valid JSON only.',
      });

      run = await openai.beta.threads.runs.createAndPoll(threadId, {
        assistant_id: assistantId,
      });

      const msgs2 = await openai.beta.threads.messages.list(threadId);
      const msg2 = msgs2.data[0];
      const text2 =
        msg2.content[0].type === 'text' ? msg2.content[0].text.value : '{}';
      conceptsData = JSON.parse(text2);
    }

    if (!conceptsData?.concepts?.[0]) {
      return NextResponse.json(
        { error: 'Failed to generate ad concepts', data: conceptsData },
        { status: 500 }
      );
    }

    // Step 8: Select best concept and generate image with feedback loop
    const chosenConcept = conceptsData.concepts[0];
    let imagePrompt = chosenConcept.image_prompt;
    let currentRating = 0;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    let finalImageData: { dataUrl: string; b64: string } | null = null;
    let finalImageUrl: string | null = null;
    const evaluationHistory: any[] = [];

    console.log('🎯 Starting image generation loop...');

    while (currentRating < 10 && attempts < MAX_ATTEMPTS) {
      attempts++;
      console.log(`\n🔄 Attempt ${attempts}/${MAX_ATTEMPTS}`);

      // Generate image using the corrected function
      const generatedImage = await generateImageFromPrompt(imagePrompt);

      // Save image to Supabase with proper naming
      const tempUrl = await saveImageToSupabase(
        generatedImage.b64,
        project_id,
        attempts
      );

      if (!tempUrl) {
        console.error('❌ Failed to save image to Supabase');
        continue;
      }

      // Ask assistant to evaluate WITH screenshot context
      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: `I generated an image (attempt ${attempts}). 

ORIGINAL WEBSITE SCREENSHOT ANALYSIS:
${JSON.stringify(screenshotAnalysis, null, 2)}

ORIGINAL AD CONCEPT:
${JSON.stringify(chosenConcept, null, 2)}

GENERATED IMAGE URL: ${tempUrl}

Evaluate this image critically:
1. Rate it 1-10 (be harsh, only give 10/10 if truly perfect and matches brand)
2. Check if colors match the website's color scheme: ${screenshotAnalysis.colorScheme}
3. Check if visual style matches: ${screenshotAnalysis.visualElements}
4. Check if it looks professional and conversion-optimized
5. If rating < 10, provide SPECIFIC improvements and a NEW detailed image_prompt

Scoring breakdown:
- Brand alignment (colors, style): 0-2 points
- Visual appeal: 0-2 points  
- Clear value prop: 0-2 points
- Attention-grabbing: 0-2 points
- Professional/mobile-friendly: 0-2 points

Respond ONLY with JSON:
{
  "rating": <1-10>,
  "score_breakdown": {
    "brand_alignment": <0-2>,
    "visual_appeal": <0-2>,
    "value_prop": <0-2>,
    "attention": <0-2>,
    "professional": <0-2>
  },
  "feedback": "specific critical feedback...",
  "revised_image_prompt": "new detailed 250+ word prompt if rating < 10, else null"
}`,
      });

      run = await openai.beta.threads.runs.createAndPoll(threadId, {
        assistant_id: assistantId,
      });

      // Get evaluation
      const evalMsgs = await openai.beta.threads.messages.list(threadId);
      const evalMsg = evalMsgs.data[0];
      const evalText =
        evalMsg.content[0].type === 'text'
          ? evalMsg.content[0].text.value
          : '{}';

      let evaluation: any;
      try {
        const jsonMatch = evalText.match(/\{[\s\S]*\}/);
        evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch (e) {
        console.warn('Failed to parse evaluation, retrying...');
        continue;
      }

      currentRating = evaluation.rating || 0;
      evaluationHistory.push({
        attempt: attempts,
        rating: currentRating,
        feedback: evaluation.feedback,
        imageUrl: tempUrl,
      });

      console.log(`📊 Rating: ${currentRating}/10`);
      console.log(`💬 Feedback: ${evaluation.feedback}`);

      if (currentRating >= 10) {
        // Perfect! Save final image
        finalImageData = generatedImage;
        finalImageUrl = tempUrl;
        console.log('✅ Image approved! Rating: 10/10');
        break;
      } else if (currentRating >= 9 && attempts >= 3) {
        // Good enough after several attempts
        finalImageData = generatedImage;
        finalImageUrl = tempUrl;
        console.log('✅ Image accepted (9/10 after multiple attempts)');
        break;
      }

      // Use revised prompt if provided
      if (evaluation.revised_image_prompt) {
        imagePrompt = evaluation.revised_image_prompt;
        console.log('🔄 Using revised prompt for next attempt');
      } else {
        console.log('⚠️ No revised prompt provided, stopping loop');
        finalImageData = generatedImage;
        finalImageUrl = tempUrl;
        break;
      }
    }

    // Step 9: Ensure we have a final image
    if (!finalImageData) {
      // Generate one final image as fallback
      console.log('🔄 Generating final fallback image...');
      finalImageData = await generateImageFromPrompt(imagePrompt);
      finalImageUrl = await saveImageToSupabase(
        finalImageData.b64,
        project_id,
        attempts + 1
      );
    }

    // Step 10: Return comprehensive response
    const response = {
      success: true,
      project_id,
      url: websiteUrl,
      screenshotUrl,
      screenshotAnalysis,
      extracted: {
        logoUrl: extracted.logoUrl,
        mainImageUrl: extracted.mainImageUrl,
        logoDescription: extracted.logoDescription,
        productDescription: extracted.productDescription,
        businessDescription: extracted.businessDescription,
      },
      analysis: conceptsData.analysis,
      chosenConcept,
      generation: {
        attempts,
        finalRating: currentRating,
        finalImageUrl: finalImageUrl,
        evaluationHistory,
      },
      allConcepts: conceptsData.concepts,
    };

    console.log('🎉 Ad generation complete!');
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('❌ Error in generate-ad:', err);
    return NextResponse.json(
      { error: err.message || String(err), stack: err.stack },
      { status: 500 }
    );
  }
}
