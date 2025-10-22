import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI, { toFile } from 'openai';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// LOGO EXTRACTION FUNCTIONS
// ============================================================================
function extractDomain(url: string): string {
  try {
    let domain = url.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.split('/')[0];
    domain = domain.split(':')[0];
    return domain;
  } catch (error) {
    console.error('Error extracting domain:', error);
    return url;
  }
}

async function fetchAndSaveLogo(
  websiteUrl: string,
  projectId: string
): Promise<string | null> {
  try {
    const domain = extractDomain(websiteUrl);
    console.log(`🎨 Fetching logo for domain: ${domain}`);

    // Fetch from PushOwl API
    const apiUrl = `https://getlogo.pushowl.com/api/${domain}`;
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      validateStatus: status => status < 500,
    });

    if (!response.data?.url && !response.data?.svg) {
      console.log(`⚠️ No logo found for ${domain}`);
      return null;
    }

    let logoBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    if (response.data.url) {
      console.log(`📥 Downloading logo from: ${response.data.url}`);
      const logoResponse = await axios.get(response.data.url, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      logoBuffer = Buffer.from(logoResponse.data);
      contentType = logoResponse.headers['content-type'] || 'image/png';

      if (response.data.url.endsWith('.svg')) {
        fileExtension = 'svg';
        contentType = 'image/svg+xml';
      } else if (response.data.url.endsWith('.png')) {
        fileExtension = 'png';
      } else if (
        response.data.url.endsWith('.jpg') ||
        response.data.url.endsWith('.jpeg')
      ) {
        fileExtension = 'jpg';
      } else {
        fileExtension = 'png';
      }
    } else if (response.data.svg) {
      console.log(`📥 Processing SVG logo`);
      logoBuffer = Buffer.from(response.data.svg, 'utf-8');
      contentType = 'image/svg+xml';
      fileExtension = 'svg';
    } else {
      return null;
    }

    // Save to Supabase
    const timestamp = Date.now();
    const fileName = `${projectId}/logos/${domain}-logo-${timestamp}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(fileName, logoBuffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(fileName);

    console.log(`✅ Logo saved: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error: any) {
    console.error('❌ Error fetching/saving logo:', error.message);
    return null;
  }
}

// ============================================================================
// CHATGPT SCREENSHOT ANALYSIS AND AD IMAGE PROMPT GENERATION
// ============================================================================
async function generateAdImagePromptWithChatGPT(
  screenshotUrl: string,
  adTitle: string,
  adCopy: string,
  logoUrl?: string
): Promise<string> {
  const logoInstruction = logoUrl
    ? `\n\nIMPORTANT: The company logo is available at this URL: ${logoUrl}. Ensure the ad creative prominently features this brand logo in an appropriate location (top corner, center, or integrated naturally into the design). The logo should be clearly visible and maintain brand consistency.`
    : '';

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
- If a logo is provided, ensure it's prominently featured in the ad creative

PROMPT STRUCTURE TO FOLLOW:
1. Visual Style & Quality: Photography style, lighting, composition
2. Brand Elements: Colors, mood, aesthetic from the screenshot, and LOGO placement
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
AD COPY: "${adCopy}"${logoInstruction}

Create a prompt that:
- Captures the visual brand aesthetic from the screenshot
- Translates the ad messaging into compelling visual storytelling
- Uses colors, mood, and style elements from the website
- Focuses on emotions and actions that support the ad copy
- Is optimized for AI image generation models
${logoUrl ? '- Prominently features the company logo in an appropriate location' : ''}

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

    // Extract and save logo from website
    let logoUrl: string | null = null;
    if (websiteUrl) {
      console.log('🎨 Extracting logo from website...');
      logoUrl = await fetchAndSaveLogo(websiteUrl, projectId);

      if (logoUrl) {
        console.log(`✅ Logo extracted and saved: ${logoUrl}`);

        // Update url_analysis with logo URL
        const updatedUrlAnalysis = {
          ...urlAnalysis,
          extracted_logo_url: logoUrl,
          logo_extraction_timestamp: new Date().toISOString(),
        };

        await supabase
          .from('projects')
          .update({ url_analysis: updatedUrlAnalysis })
          .eq('project_id', projectId);
      } else {
        console.log('⚠️ Logo extraction failed or no logo found');
      }
    }

    // Use ChatGPT to analyze screenshot and generate optimized ad image prompt
    const modifiedPrompt = await generateAdImagePromptWithChatGPT(
      screenshotUrl,
      adTitle,
      adCopy,
      logoUrl || undefined
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
      logo_url: logoUrl,
      ai_generated_prompt: modifiedPrompt,
      imageUrl: imageUrl,
      message: `Meta ad image generated from ChatGPT screenshot analysis${logoUrl ? ' with logo integration' : ''} and saved`,
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
