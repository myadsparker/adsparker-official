import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI, { toFile } from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// CHATGPT SCREENSHOT ANALYSIS AND AD IMAGE PROMPT GENERATION
// ============================================================================
async function generateAdImagePromptWithChatGPT(
  screenshotUrl: string,
  adTitle: string,
  adCopy: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert visual marketing strategist and prompt engineer specializing in creating high-converting ad images. Your task is to analyze website screenshots and create optimized image generation prompts that perfectly align with ad copy and brand aesthetics.

CRITICAL REQUIREMENTS:
- Analyze the visual elements, colors, layout, and brand aesthetic from the screenshot
- Create a detailed image generation prompt that captures the brand's visual identity
- Translate the ad title and copy into compelling visual storytelling
- Focus on emotions, actions, and visual metaphors that support the ad messaging
- Ensure the prompt is optimized for AI image generation (DALL-E, Midjourney, etc.)
- Make the prompt specific, detailed, and actionable for creating high-converting ad images

PROMPT STRUCTURE TO FOLLOW:
1. Visual Style & Quality: Photography style, lighting, composition
2. Brand Elements: Colors, mood, aesthetic from the screenshot
3. Subject/Scene: What to show that relates to the ad copy
4. Emotional Tone: Feelings and atmosphere to convey
5. Technical Specs: Aspect ratio, quality, style modifiers

Return ONLY the final optimized image generation prompt, no explanations or additional text.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this website screenshot and create an optimized image generation prompt for this ad campaign:

AD TITLE: "${adTitle}"
AD COPY: "${adCopy}"

Create a prompt that:
- Captures the visual brand aesthetic from the screenshot
- Translates the ad messaging into compelling visual storytelling
- Uses colors, mood, and style elements from the website
- Focuses on emotions and actions that support the ad copy
- Is optimized for AI image generation models

Generate a detailed, specific prompt that will create a high-converting ad image.`,
          },
          {
            type: 'image_url',
            image_url: { url: screenshotUrl },
          },
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  const prompt = response.choices[0]?.message?.content?.trim();

  if (!prompt) {
    throw new Error('Failed to generate ad image prompt from ChatGPT analysis');
  }

  return prompt;
}

// ============================================================================
// SAVE IMAGE TO SUPABASE
// ============================================================================
async function saveImageToSupabase(
  base64Image: string,
  projectId: string,
  imageIndex: number = 0
): Promise<string | null> {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    const timestamp = Date.now();
    const fileName = `${projectId}/images/meta-ad-${imageIndex}-${timestamp}.png`;

    const { error } = await supabase.storage
      .from('project-files')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    return null;
  }
}

// ============================================================================
// OLD PROMPT MODIFICATION FUNCTION REMOVED - NOW USING CHATGPT SCREENSHOT ANALYSIS
// ============================================================================

// ============================================================================
// MAIN API ROUTE
// ============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 Generate Images API called');
  try {
    let { id: projectId } = await params;
    console.log('📋 Project ID:', projectId);
    // Read payload for ids, ad title/copy and prompt selection
    let adTitle = '';
    let adCopy = '';
    let promptName: string | undefined = undefined;
    let adSetId: string | undefined = undefined;
    try {
      const body = await request.json();
      adTitle = body?.ad_title || body?.title || '';
      adCopy = body?.ad_copy || body?.copy || '';
      promptName = body?.prompt_name || body?.ad_prompt_name;
      adSetId = body?.adset_id || body?.ad_set_id || body?.adSetId;
      const bodyProjectId = body?.project_id || body?.projectId;
      if (bodyProjectId) projectId = bodyProjectId;
    } catch {}

    // Fetch project data including ad_set_proposals and url_analysis
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('ad_set_proposals, analysing_points, url_analysis')
      .eq('project_id', projectId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
          details: fetchError.message,
        },
        { status: 404 }
      );
    }

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      );
    }

    // Get analysing_points data
    let analysingPoints: any = null;
    try {
      analysingPoints =
        typeof project?.analysing_points === 'string'
          ? JSON.parse(project.analysing_points)
          : project?.analysing_points;
    } catch (error) {}

    if (!analysingPoints) {
      return NextResponse.json(
        { success: false, error: 'Analysing points data not found' },
        { status: 400 }
      );
    }

    // Parse url_analysis once
    let websiteUrl: string | undefined;
    let urlAnalysis: any = undefined;
    try {
      urlAnalysis =
        typeof project?.url_analysis === 'string'
          ? JSON.parse(project.url_analysis)
          : project?.url_analysis;
      websiteUrl = urlAnalysis?.website_url;
    } catch (error) {}

    // Read ad_set_proposals and pick ad set by adSetId, deriving adTitle/adCopy if missing
    let adSets: any[] = [];
    try {
      const raw = project?.ad_set_proposals;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) adSets = parsed;
      else if (parsed?.adsets && Array.isArray(parsed.adsets))
        adSets = parsed.adsets;
    } catch (e) {}
    if (!adSetId) {
      return NextResponse.json(
        { success: false, error: 'adset_id is required in body' },
        { status: 400 }
      );
    }
    const wantedId = String(adSetId).trim().toLowerCase();
    const adSet = adSets.find(a => {
      const candidate = a?.ad_set_id || a?.adset_id || a?.adSetId || a?.id;
      if (!candidate) return false;
      return String(candidate).trim().toLowerCase() === wantedId;
    });
    if (!adSet) {
      const availableIds = adSets
        .map(a => a?.ad_set_id || a?.adset_id || a?.adSetId || a?.id)
        .filter(Boolean)
        .slice(0, 10);
      return NextResponse.json(
        {
          success: false,
          error: 'Ad set not found for provided adset_id',
          provided_adset_id: adSetId,
          available_adset_ids_preview: availableIds,
        },
        { status: 404 }
      );
    }
    if (!adTitle) adTitle = adSet?.ad_copywriting_title || '';
    if (!adCopy) adCopy = adSet?.ad_copywriting_body || '';

    // Prompt will be generated directly from screenshot analysis - no need for pre-existing prompts

    // Get screenshot URL from analysing_points
    const screenshotUrl = analysingPoints?.parsingUrl?.screenshot;

    if (!screenshotUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Screenshot not found in analysing_points data',
        },
        { status: 400 }
      );
    }

    // Use ChatGPT to analyze screenshot and generate optimized ad image prompt
    const modifiedPrompt = await generateAdImagePromptWithChatGPT(
      screenshotUrl,
      adTitle,
      adCopy
    );

    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: modifiedPrompt,
      size: '1024x1024',
      quality: 'medium',
      n: 1,
    });

    const data0 = imageResponse.data?.[0];
    if (!data0) {
      return NextResponse.json(
        { success: false, error: 'Image not generated' },
        { status: 500 }
      );
    }

    let base64Out: string | undefined;
    if (data0.b64_json) base64Out = data0.b64_json;
    else if (data0.url) {
      const resp = await fetch(data0.url);
      const buf = await resp.arrayBuffer();
      base64Out = Buffer.from(buf).toString('base64');
    }

    if (!base64Out) {
      return NextResponse.json(
        { success: false, error: 'No image data from OpenAI' },
        { status: 500 }
      );
    }

    // Save the generated ad image to Supabase (logo processing removed)
    const imageUrl = await saveImageToSupabase(base64Out, projectId, 0);

    if (!imageUrl) {
      throw new Error('Failed to save final ad image to Supabase');
    }

    return NextResponse.json({
      success: true,
      project_id: projectId,
      ad_set_id: adSetId,
      website_url: websiteUrl,
      analysingPoints: analysingPoints,
      ad_title: adTitle,
      ad_copy: adCopy,
      screenshot_url: screenshotUrl,
      ai_generated_prompt: modifiedPrompt,
      imageUrl: imageUrl,
      message: `Meta ad image generated from ChatGPT screenshot analysis and saved`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to generate Meta ad image',
      },
      { status: 500 }
    );
  }
}

// Simple GET method to test if route is accessible
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔍 Generate Images API GET method called');
  try {
    let { id: projectId } = await params;
    return NextResponse.json({
      success: true,
      message: 'Generate Images API is working',
      project_id: projectId,
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
