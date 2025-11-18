import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  console.log('🚀 Analyze-snapshot API called');
  try {
    const body = await req.json().catch(() => ({}));
    const projectId: string | undefined = body.project_id || body.projectId;
    console.log('📋 Project ID:', projectId);

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch analysing_points and existing url_analysis
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('analysing_points, url_analysis')
      .eq('project_id', projectId)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let analysingPoints: any = project.analysing_points;
    if (typeof analysingPoints === 'string') {
      try {
        analysingPoints = JSON.parse(analysingPoints);
      } catch {
        return NextResponse.json(
          { error: 'Invalid analysing_points JSON format' },
          { status: 500 }
        );
      }
    }

    const screenshotUrl: string | undefined =
      analysingPoints?.parsingUrl?.screenshot;
    if (!screenshotUrl || typeof screenshotUrl !== 'string') {
      return NextResponse.json(
        {
          error:
            'Screenshot URL not found in analysing_points.parsingUrl.screenshot',
        },
        { status: 400 }
      );
    }

    // 🔹 First call: analyze snapshot into structured JSON with comprehensive business analysis
    const analysisPrompt: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You are a senior brand designer + creative strategist + business analyst. Analyze landing page screenshots carefully and provide comprehensive business insights.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this landing page screenshot and return strict JSON with comprehensive business analysis:

{
  "source_image": "<url>",
  "colors": { "dominant": [hex], "accent": [hex] },
  "logo": { "found": true/false, "bounding_box": [x,y,w,h] },
  "ocr_text": { "hero_headline": "...", "cta": "...", "promo": "...", "product_names": ["..."], "pricing_info": "..." },
  "layout": { "hero": {"y0":..,"y1":..}, "product_grid": {"y0":..,"y1":..} },
  "image_styles": ["..."],
  "inferred_brand_tone": "...",
  "inferred_audience": { "gender": "...", "age_range": [..,..], "interests": ["..."] },
  "business_analysis": {
    "businessType": "specific business type based on visual content",
    "productsServices": ["specific product 1", "specific service 2"],
    "targetMarket": "specific target market description",
    "uniqueValueProposition": "what makes this business unique",
    "businessModel": "how this business operates",
    "keyFeatures": ["feature 1", "feature 2"],
    "pricingModel": "how they charge customers",
    "geographicFocus": "where they operate",
    "culturalFactors": "any cultural or demographic factors"
  }
}

Focus on being SPECIFIC and ACCURATE based on the actual visual content.`,
          },
          { type: 'image_url', image_url: { url: screenshotUrl } },
        ],
      },
    ];

    const analysis = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: analysisPrompt,
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    let content = analysis.choices[0]?.message?.content || '{}';
    if (content.includes('```')) {
      content = content.replace(/```json\s*|```/g, '').trim();
    }
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    // Extract business analysis and brand tone from analysis JSON
    const businessAnalysis = parsed?.business_analysis || {};
    const brandTone = parsed?.inferred_brand_tone;

    // 🔹 Parallel calls: generate ad prompts and persona names
    const [promptGen, personaGen] = await Promise.all([
      // Ad prompts generation
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You are a creative ad strategist. Generate one Facebook feed ad image prompt that is photorealistic and aligned to the provided brand tone and analysis JSON.',
          },
          {
            role: 'user',
            content: `Brand analysis:\n${JSON.stringify(parsed, null, 2)}\n
        Brand tone hint: ${brandTone}
        
        Return JSON:
        {
         "ad_prompt": {
           "name": "Photorealistic Hero Ad",
           "prompt": "...",
           "recommended_copy": {
             "headline": "...",
             "subhead": "...",
             "cta": "...",
             "proof": "...",
             "disclaimer": "..."
           }
         }
        }`,
          },
        ],
        response_format: { type: 'json_object' },
      }),

      // Persona names generation with comprehensive business analysis
      openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a customer persona analysis expert specializing in creating HIGHLY SPECIFIC personas for any type of business. You must create personas that are unique to the specific business type, products, services, and target market based on the provided analysis. NEVER create generic personas that could apply to multiple businesses. Do not use examples from other businesses or industries. IMPORTANT: All persona names must be PLURAL since they represent target audiences for marketing campaigns, not individual customers. Focus on business-specific, demographic, and behavioral specificity. ALWAYS respond with ONLY valid JSON, no markdown, no code blocks, no additional text.`,
          },
          {
            role: 'user',
            content: `Based on the following detailed business analysis from screenshot analysis, generate exactly 10 customer personas that are a very strong match (each must score at least 9/10 in relevance to this specific business).

Comprehensive Business Analysis:
- Business Type: ${businessAnalysis.businessType || 'Not specified'}
- Products/Services: ${businessAnalysis.productsServices?.join(', ') || 'Not specified'}
- Target Market: ${businessAnalysis.targetMarket || 'Not specified'}
- Unique Value Proposition: ${businessAnalysis.uniqueValueProposition || 'Not specified'}
- Business Model: ${businessAnalysis.businessModel || 'Not specified'}
- Key Features: ${businessAnalysis.keyFeatures?.join(', ') || 'Not specified'}
- Pricing Model: ${businessAnalysis.pricingModel || 'Not specified'}
- Geographic Focus: ${businessAnalysis.geographicFocus || 'Not specified'}
- Cultural Factors: ${businessAnalysis.culturalFactors || 'Not specified'}

Visual Analysis:
- Brand Tone: ${brandTone || 'Not specified'}
- OCR Text: ${JSON.stringify(parsed?.ocr_text || {}, null, 2)}
- Inferred Audience: ${JSON.stringify(parsed?.inferred_audience || {}, null, 2)}
- Colors: ${JSON.stringify(parsed?.colors || {}, null, 2)}

CRITICAL REQUIREMENTS:
- Create personas that are SPECIFIC to this exact business type and model shown in the screenshot
- Each persona must be UNIQUE and not applicable to competitors
- Focus on the ACTUAL products/services this business offers based on the screenshot analysis
- Consider the SPECIFIC business model and inferred audience from the screenshot
- Be culturally and demographically specific where relevant
- IMPORTANT: All persona names must be PLURAL (representing target audiences, not individual customers)
- Base personas on the actual visual elements, colors, layout, and text found in the screenshot
- Each persona should represent a different segment of the target market with clear differentiation
- Consider psychographic, demographic, and behavioral factors specific to this business
- Ensure personas are actionable for marketing campaigns and ad targeting
- Use the comprehensive business analysis data to create highly targeted personas

Output only valid JSON with this structure:
{
  "personas": [
    {"name": "Specific 3-4 word description (MUST be specific to this business and PLURAL)"},
    {"name": "Another specific persona name (PLURAL)"},
    {"name": "Third specific persona name (PLURAL)"},
    {"name": "Fourth specific persona name (PLURAL)"},
    {"name": "Fifth specific persona name (PLURAL)"},
    {"name": "Sixth specific persona name (PLURAL)"},
    {"name": "Seventh specific persona name (PLURAL)"},
    {"name": "Eighth specific persona name (PLURAL)"},
    {"name": "Ninth specific persona name (PLURAL)"},
    {"name": "Tenth specific persona name (PLURAL)"}
  ]
}`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    ]);

    let promptContent = promptGen.choices[0]?.message?.content || '{}';
    if (promptContent.includes('```')) {
      promptContent = promptContent.replace(/```json\s*|```/g, '').trim();
    }
    let promptParsed: any = {};
    try {
      promptParsed = JSON.parse(promptContent);
    } catch {
      promptParsed = { ad_prompt: {} };
    }

    // Parse persona generation response
    let personaContent = personaGen.choices[0]?.message?.content || '{}';
    if (personaContent.includes('```')) {
      personaContent = personaContent.replace(/```json\s*|```/g, '').trim();
    }
    let personaParsed: any = {};
    try {
      personaParsed = JSON.parse(personaContent);
    } catch {
      personaParsed = { personas: [] };
    }

    // 🔹 Normalize ad prompts from model output
    let adPrompts: any[] = [];
    if (Array.isArray(promptParsed.prompts)) {
      adPrompts = promptParsed.prompts;
    } else if (Array.isArray(promptParsed.ad_prompts)) {
      adPrompts = promptParsed.ad_prompts;
    } else if (
      promptParsed.ad_prompt &&
      typeof promptParsed.ad_prompt === 'object'
    ) {
      adPrompts = [promptParsed.ad_prompt];
    }

    // If no prompts found, create a default one
    if (adPrompts.length === 0) {
      adPrompts = [
        {
          name: 'Default AI Ad Image',
          prompt:
            'High-quality marketing ad image for ' +
            (businessAnalysis.businessType || 'business'),
          recommended_copy: {
            headline: 'Discover Our Solution',
            subhead: 'Transform your business today',
            cta: 'Learn More',
            proof: 'Trusted by thousands',
            disclaimer: 'Results may vary',
          },
        },
      ];
    }

    // 🔹 AI images will be generated manually by user via Generate Image button
    // No automatic image generation - images are only created when user clicks "Generate Image"
    let generatedImageUrls: string[] = [];
    console.log(
      'ℹ️ Images will be generated manually by user - no automatic generation'
    );

    // 🔹 Merge and save to Supabase
    let existingUrlAnalysis: any = project.url_analysis ?? {};
    if (typeof existingUrlAnalysis === 'string') {
      try {
        existingUrlAnalysis = JSON.parse(existingUrlAnalysis);
      } catch {
        existingUrlAnalysis = {};
      }
    }

    const updatedUrlAnalysis = {
      ...existingUrlAnalysis,
      snapshotanalysis: parsed,
      ad_prompts: adPrompts,
      personas: personaParsed.personas || [],
    };

    // Get existing ai_images and append new ones
    let existingAiImages: string[] = [];
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('ai_images')
        .eq('project_id', projectId)
        .single();

      if (projectData?.ai_images) {
        existingAiImages =
          typeof projectData.ai_images === 'string'
            ? JSON.parse(projectData.ai_images)
            : projectData.ai_images;
      }
    } catch (error) {
      console.error('Error fetching existing ai_images:', error);
    }

    const updatedAiImages = [...existingAiImages, ...generatedImageUrls];

    // Set the first generated AI image as thumbnail if no thumbnail exists
    // Check if we need to set a default thumbnail (only if no thumbnails exist)
    // Note: We won't automatically set thumbnails per adset here since we don't have adset context
    // This is just for backward compatibility
    let hasThumbnails = false;
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('adset_thumbnail_image')
        .eq('project_id', projectId)
        .single();

      if (projectData?.adset_thumbnail_image) {
        try {
          const thumbnails = typeof projectData.adset_thumbnail_image === 'string'
            ? JSON.parse(projectData.adset_thumbnail_image)
            : projectData.adset_thumbnail_image;
          
          if (typeof thumbnails === 'object' && thumbnails !== null && !Array.isArray(thumbnails)) {
            hasThumbnails = Object.keys(thumbnails).length > 0;
          } else if (typeof thumbnails === 'string') {
            hasThumbnails = true;
          }
        } catch (e) {
          // If parsing fails, check if it's a string
          if (typeof projectData.adset_thumbnail_image === 'string') {
            hasThumbnails = true;
          }
        }
      }

      // Only set default thumbnail if no thumbnails exist and we have generated images
      // This maintains backward compatibility but doesn't interfere with per-adset thumbnails
      if (!hasThumbnails && generatedImageUrls.length > 0) {
        console.log(
          `🖼️ No thumbnails found, but not auto-setting (per-adset thumbnails should be set manually)`
        );
      }
    } catch (error) {
      console.error('Error checking existing thumbnail:', error);
    }

    const updateData: any = {
      url_analysis: updatedUrlAnalysis,
      ai_images: updatedAiImages,
    };

    // Don't automatically set thumbnail here - let users set per-adset thumbnails manually

    console.log(
      '🔍 Debug - Updating database with:',
      JSON.stringify(updateData, null, 2)
    );

    const { error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('project_id', projectId);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update url_analysis and ai_images' },
        { status: 500 }
      );
    }

    console.log(
      '✅ Database updated successfully with ai_images:',
      updateData.ai_images
    );

    return NextResponse.json({
      success: true,
      project_id: projectId,
      screenshot_url: screenshotUrl,
      snapshotanalysis: parsed,
      business_analysis: businessAnalysis,
      ad_prompts: adPrompts,
      personas: personaParsed.personas || [],
      generated_ai_images: generatedImageUrls,
      ai_images_count: generatedImageUrls.length,
      thumbnail_set: hasThumbnails,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('analyze-snapshot error', error);
    return NextResponse.json(
      { error: 'Failed to analyze snapshot' },
      { status: 500 }
    );
  }
}
