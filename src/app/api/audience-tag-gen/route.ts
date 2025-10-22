import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AdSetWithTags {
  ad_set_id: string;
  status: string;
  ad_set_title: string;
  audience_description: string;
  audience_explanation: string;
  age_range: {
    min: number;
    max: number;
  };
  genders: string[];
  audience_tags: string[];
  audience_size_range: {
    min: number;
    max: number;
  };
  ad_copywriting_title: string;
  ad_copywriting_body: string;
  targeting: any;
  creative_meta_data_1x1: {
    is_manual: boolean;
    asset_id: number;
    url: string;
    type: string;
  };
  creative_meta_data_9x16: {
    is_manual: boolean;
    asset_id: number;
    url: string;
    type: string;
  };
}

// Generate high-quality audience tags for a single ad set
// Updated generateAudienceTagsForAdSet function with improved prompt
async function generateAudienceTagsForAdSet(
  adSet: AdSetWithTags,
  index: number,
  personaData: any = null,
  businessAnalysis: any = null,
  snapshotAnalysis: any = null,
  retryCount = 0
): Promise<AdSetWithTags> {
  console.log(
    `🏷️ Generating audience tags for ad set: ${adSet.ad_set_title} (${index + 1}) - Attempt ${retryCount + 1}`
  );

  // Build enhanced context from persona and business analysis
  let enhancedContext = '';
  if (personaData && businessAnalysis) {
    enhancedContext = `
ADDITIONAL CONTEXT FROM PERSONA ANALYSIS:
- Business Type: ${businessAnalysis.businessType || snapshotAnalysis?.inferred_brand_tone || 'Not specified'}
- Target Market: ${businessAnalysis.targetMarket || 'Not specified'}
- Products/Services: ${businessAnalysis.productsServices?.join(', ') || 'Not specified'}
- Unique Value Proposition: ${businessAnalysis.uniqueValueProposition || snapshotAnalysis?.inferred_brand_tone || 'Not specified'}
- Brand Tone: ${snapshotAnalysis?.inferred_brand_tone || businessAnalysis.businessType || 'Not specified'}
- Inferred Audience: ${JSON.stringify(snapshotAnalysis?.inferred_audience || {})}
- Visual Elements: Colors: ${JSON.stringify(snapshotAnalysis?.colors || {})}, Layout: ${JSON.stringify(snapshotAnalysis?.layout || {})}
`;
  }

  const tagPrompt = `
Act as a Meta Ads targeting expert with deep knowledge of Facebook and Instagram's advertising platform. Generate exactly 20-25 highly specific, actionable audience targeting tags for this ad set using Meta's actual targeting capabilities.

AD SET DETAILS:
- Ad Set Title: ${adSet.ad_set_title}
- Audience Description: ${adSet.audience_description}
- Audience Explanation: ${adSet.audience_explanation}
- Age Range: ${adSet.age_range.min}-${adSet.age_range.max}
- Ad Copy Title: ${adSet.ad_copywriting_title}
- Ad Copy Body: ${adSet.ad_copywriting_body}
${enhancedContext}

TARGETING STRATEGY - Use a Three-Layer Approach:

LAYER 1 (8-9 tags): DIRECT INTERESTS/BEHAVIORS
- Exact keywords and phrases people would use when searching for this product/service
- Direct competitors and alternative brands
- Specific product categories and features
- Industry-specific terminology that your target audience uses
- Direct problem-solving interests

LAYER 2 (7-8 tags): CLOSELY RELATED INTERESTS/BEHAVIORS  
- Adjacent lifestyle interests that correlate with your audience
- Related hobbies and activities your audience likely engages in
- Complementary products/services they might also purchase
- Professional interests and career-related behaviors
- Related life stages and personal circumstances

LAYER 3 (5-7 tags): BROADER CONTEXTUAL INTERESTS
- Broader lifestyle and values that align with your audience
- General entertainment and media consumption patterns
- Broader demographic and psychographic characteristics
- Seasonal or trending interests relevant to the timing
- Geographic or cultural interests if relevant

META-SPECIFIC REQUIREMENTS:
✅ Each tag MUST be targetable in Meta's Ads Manager (real interests, behaviors, demographics)
✅ Use Meta's actual interest categories: think "Coffee", "Entrepreneurship", "Online shopping", "Business software"  
✅ Include specific brands, publications, and influencers your audience follows
✅ Consider Meta's behavior targeting: "Frequent travelers", "Small business owners", "Online shoppers"
✅ Think device usage: "Mobile game players", "iOS users", "Desktop users" if relevant
✅ Include life events: "Recently moved", "New parents", "Recent college graduates" if applicable

QUALITY STANDARDS:
- Each tag should be 1-4 words maximum and Meta-targetable
- Avoid generic terms - be hyper-specific to this exact audience
- Match the tone and sophistication level of the ad copy
- Focus on high-intent, high-value audience segments
- Include a mix of interests, behaviors, and demographics
- Consider purchase intent and buying readiness

AVOID:
❌ Vague terms like "health-conscious" or "tech-savvy"
❌ Made-up interests that don't exist in Meta's targeting
❌ Overly broad categories like "women" or "business"
❌ Generic demographic terms without specificity

Think like you're actually setting up targeting in Meta Ads Manager. What specific interests, pages, behaviors, and characteristics would you select to reach this exact audience?

Return ONLY a valid JSON array of exactly 20-25 strings:
["specific interest 1", "specific interest 2", "specific behavior 1", ...]
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          "You are a Meta Ads targeting specialist with expert knowledge of Facebook and Instagram's advertising platform. Generate highly specific, actionable audience targeting tags that exist in Meta's actual targeting options. Use the three-layer targeting strategy (direct, closely related, broader contextual) to create comprehensive audience profiles. ALWAYS respond with ONLY a valid JSON array, no markdown, no code blocks, no additional text.",
      },
      {
        role: 'user',
        content: tagPrompt,
      },
    ],
    temperature: 0.6, // Slightly lower for more consistent, precise outputs
    max_tokens: 2000,
  });

  const responseText = response.choices[0]?.message?.content;
  console.log(`🏷️ Generated audience tags for: ${adSet.ad_set_title}`);
  console.log(`🔍 Response text length: ${responseText?.length || 0}`);
  console.log(
    `🔍 Response text preview: ${responseText?.substring(0, 100) || 'null'}`
  );

  // Check if responseText is null or empty
  if (!responseText || responseText.trim() === '') {
    console.error(
      '❌ No response text from OpenAI for audience tags generation'
    );
    console.error(
      '❌ Full response object:',
      JSON.stringify(response, null, 2)
    );

    // Retry up to 2 times
    if (retryCount < 2) {
      console.log(
        `🔄 Retrying audience tag generation for ${adSet.ad_set_title} in 2 seconds...`
      );
      await new Promise(resolve => setTimeout(resolve, 2000));
      return generateAudienceTagsForAdSet(
        adSet,
        index,
        personaData,
        businessAnalysis,
        snapshotAnalysis,
        retryCount + 1
      );
    }

    return {
      ...adSet,
      audience_tags: [],
    };
  }

  // Clean the response text
  let cleanedText = responseText;
  if (cleanedText.includes('```json')) {
    cleanedText = cleanedText
      .replace(/```json\s*/g, '')
      .replace(/```\s*$/g, '');
  }
  if (cleanedText.includes('```')) {
    cleanedText = cleanedText.replace(/```\s*/g, '');
  }
  cleanedText = cleanedText.trim();

  try {
    const result = JSON.parse(cleanedText);
    const tags = result.tags || result.audience_tags || result;

    // Ensure we return an array
    let audienceTags = [];
    if (Array.isArray(tags)) {
      audienceTags = tags;
    } else if (typeof tags === 'object' && tags !== null) {
      // If it's an object, try to extract array values
      const values = Object.values(tags);
      if (values.length > 0 && Array.isArray(values[0])) {
        audienceTags = values[0];
      }
    }

    // Validate we got the right number of tags
    if (audienceTags.length < 20 || audienceTags.length > 25) {
      console.warn(
        `⚠️ Generated ${audienceTags.length} tags for ${adSet.ad_set_title}, expected 20-25`
      );
    }

    console.log(
      `✅ Generated ${audienceTags.length} audience tags for: ${adSet.ad_set_title}`
    );

    return {
      ...adSet,
      audience_tags: audienceTags,
    };
  } catch (parseError) {
    console.error('❌ Error parsing audience tags response:', parseError);
    console.error('❌ Raw response text:', responseText);

    // Retry up to 2 times on parsing errors
    if (retryCount < 2) {
      console.log(
        `🔄 Retrying audience tag generation due to parsing error for ${adSet.ad_set_title} in 2 seconds...`
      );
      await new Promise(resolve => setTimeout(resolve, 2000));
      return generateAudienceTagsForAdSet(
        adSet,
        index,
        personaData,
        businessAnalysis,
        snapshotAnalysis,
        retryCount + 1
      );
    }

    return {
      ...adSet,
      audience_tags: [],
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('📥 Received request body:', body);

    // Get project_id from request
    const project_id = body.project_id;

    if (!project_id) {
      return NextResponse.json(
        {
          error: 'project_id is required',
          received: body,
          usage: "Send JSON with 'project_id' field containing the project ID",
        },
        { status: 400 }
      );
    }

    console.log(
      `🚀 Starting audience tag generation for Project: ${project_id}`
    );

    // Step 1: Fetch ad sets from ad_set_proposals column and url_analysis for persona context
    console.log(
      `📋 Step 1: Fetching ad sets from ad_set_proposals column and url_analysis...`
    );

    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('ad_set_proposals, url_analysis')
      .eq('project_id', project_id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching project:', fetchError);
      return NextResponse.json(
        {
          error: 'Project not found',
          details: fetchError.message,
          project_id: project_id,
          error_code: fetchError.code,
        },
        { status: 404 }
      );
    }

    console.log(`✅ Project found:`, existingProject);

    // Check if ad sets exist in ad_set_proposals
    if (
      !existingProject.ad_set_proposals ||
      !Array.isArray(existingProject.ad_set_proposals)
    ) {
      return NextResponse.json(
        {
          error: 'No ad sets found for this project',
          details: 'Please create ad sets first using the ad-copy-gen API',
          project_id: project_id,
        },
        { status: 400 }
      );
    }

    const adSets = existingProject.ad_set_proposals as AdSetWithTags[];
    console.log(`🎯 Found ${adSets.length} ad sets to process`);

    // Extract persona and business analysis data for enhanced context
    const urlAnalysis = existingProject.url_analysis;
    let personaData = null;
    let businessAnalysis = null;
    let snapshotAnalysis = null;

    if (urlAnalysis) {
      // Get personas from the new structure (from analyze-snapshot)
      if (urlAnalysis.personas && Array.isArray(urlAnalysis.personas)) {
        personaData = urlAnalysis.personas;
      } else if (urlAnalysis.personaData?.personaNames) {
        // Old structure from persona-creation
        personaData = urlAnalysis.personaData.personaNames.map(
          (name: string) => ({ name })
        );
      }

      // Get business analysis data
      businessAnalysis = urlAnalysis.businessAnalysis;
      snapshotAnalysis = urlAnalysis.snapshotanalysis;

      console.log(
        `📊 Found persona data: ${personaData?.length || 0} personas`
      );
      console.log(`📊 Business analysis available: ${!!businessAnalysis}`);
      console.log(`📊 Snapshot analysis available: ${!!snapshotAnalysis}`);
    }

    // Step 2: Generate audience tags for all ad sets in parallel
    console.log(
      `📋 Step 2: Generating audience tags for all ad sets in parallel...`
    );

    const adSetPromises = adSets.map(
      async (adSet: AdSetWithTags, index: number) => {
        try {
          const adSetWithTags = await generateAudienceTagsForAdSet(
            adSet,
            index,
            personaData,
            businessAnalysis,
            snapshotAnalysis
          );
          console.log(`✅ Generated audience tags for: ${adSet.ad_set_title}`);
          return adSetWithTags;
        } catch (error) {
          console.error(
            `❌ Error generating audience tags for ${adSet.ad_set_title}:`,
            error
          );
          // Return original ad set with empty tags if generation fails
          return {
            ...adSet,
            audience_tags: [],
          };
        }
      }
    );

    // Wait for all audience tag generation to complete
    const adSetsWithTags = await Promise.all(adSetPromises);

    console.log(
      `✅ Successfully generated audience tags for ${adSetsWithTags.length} ad sets`
    );

    // Step 3: Save updated ad sets back to ad_set_proposals column
    console.log(
      `📋 Step 3: Saving updated ad sets to ad_set_proposals column...`
    );

    const { error: saveError } = await supabase
      .from('projects')
      .update({ ad_set_proposals: adSetsWithTags })
      .eq('project_id', project_id);

    if (saveError) {
      console.error(
        '❌ Error saving updated ad sets to ad_set_proposals:',
        saveError
      );
      return NextResponse.json(
        {
          error: 'Failed to save updated ad sets to database',
          details: saveError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      `✅ Successfully saved ${adSetsWithTags.length} updated ad sets to ad_set_proposals column`
    );

    // Calculate total audience tags generated
    const totalTags = adSetsWithTags.reduce(
      (sum, adSet) => sum + adSet.audience_tags.length,
      0
    );
    const averageTagsPerAd = Math.round(totalTags / adSetsWithTags.length);

    return NextResponse.json({
      success: true,
      data: {
        adSets: adSetsWithTags,
        totalAdSets: adSetsWithTags.length,
        totalAudienceTags: totalTags,
        averageTagsPerAd: averageTagsPerAd,
      },
      message: `Generated and saved audience tags for ${adSetsWithTags.length} ad sets (${totalTags} total tags, ${averageTagsPerAd} avg per ad)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error generating audience tags:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate audience tags',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
