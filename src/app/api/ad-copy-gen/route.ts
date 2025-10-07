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

interface AdCopyResult {
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

interface AdCopyResponse {
  adCopies: AdCopyResult[];
}

// Helper functions to extract data from business intelligence
function extractIndustryFromBusinessIntelligence(
  businessIntelligence: any
): string {
  const businessName =
    businessIntelligence.identifyingProductInformation?.businessName?.toLowerCase() ||
    '';
  const description =
    businessIntelligence.identifyingProductInformation?.description?.toLowerCase() ||
    '';

  if (businessName.includes('festival') || description.includes('festival'))
    return 'Entertainment';
  if (businessName.includes('food') || description.includes('food'))
    return 'Food & Beverage';
  if (businessName.includes('tech') || description.includes('software'))
    return 'Technology';
  if (businessName.includes('health') || description.includes('health'))
    return 'Healthcare';
  if (businessName.includes('education') || description.includes('education'))
    return 'Education';
  if (businessName.includes('finance') || description.includes('finance'))
    return 'Finance';
  if (businessName.includes('travel') || description.includes('travel'))
    return 'Travel';
  if (businessName.includes('retail') || description.includes('retail'))
    return 'Retail';

  return 'General Business';
}

function extractProductsServices(businessIntelligence: any): string[] {
  const products = [];
  const description =
    businessIntelligence.identifyingProductInformation?.description || '';
  const additionalDetails =
    businessIntelligence.identifyingProductInformation?.additionalDetails || '';
  const moreDetails =
    businessIntelligence.identifyingProductInformation?.moreDetails || '';

  // Extract from description
  if (description.includes('music')) products.push('Music Events');
  if (description.includes('art')) products.push('Art Exhibits');
  if (description.includes('surf')) products.push('Surf Competitions');
  if (description.includes('food')) products.push('Food Services');
  if (description.includes('merchandise')) products.push('Merchandise');

  // Extract from additional details
  if (additionalDetails.includes('bands')) products.push('Live Music');
  if (additionalDetails.includes('stages')) products.push('Event Venues');
  if (additionalDetails.includes('competitions')) products.push('Competitions');

  return products.length > 0 ? products : ['Main Service'];
}

function extractKeyFeatures(businessIntelligence: any): string[] {
  const features = [];
  const uniqueValueProp =
    businessIntelligence.analyzingSellingPoints?.uniqueValueProposition || '';
  const additionalSellingPoints =
    businessIntelligence.analyzingSellingPoints?.additionalSellingPoints || '';
  const diverseOfferings =
    businessIntelligence.analyzingSellingPoints?.diverseOfferings || '';

  // Extract from unique value proposition
  if (uniqueValueProp.includes('multi-sensory'))
    features.push('Multi-sensory Experience');
  if (uniqueValueProp.includes('iconic')) features.push('Iconic Location');
  if (uniqueValueProp.includes('complete')) features.push('Complete Package');

  // Extract from additional selling points
  if (additionalSellingPoints.includes('exclusive'))
    features.push('Exclusive Merchandise');
  if (additionalSellingPoints.includes('online store'))
    features.push('Online Store');

  // Extract from diverse offerings
  if (diverseOfferings.includes('curated'))
    features.push('Curated Experiences');
  if (diverseOfferings.includes('boardwalk')) features.push('Local Cuisine');

  return features.length > 0 ? features : ['Key Features'];
}

function extractCompetitiveAdvantages(businessIntelligence: any): string[] {
  const advantages = [];
  const uniqueValueProp =
    businessIntelligence.analyzingSellingPoints?.uniqueValueProposition || '';
  const additionalSellingPoints =
    businessIntelligence.analyzingSellingPoints?.additionalSellingPoints || '';

  if (uniqueValueProp.includes('unique')) advantages.push('Unique Experience');
  if (uniqueValueProp.includes('iconic')) advantages.push('Iconic Location');
  if (additionalSellingPoints.includes('exclusive'))
    advantages.push('Exclusive Offerings');

  return advantages.length > 0 ? advantages : ['Competitive Advantages'];
}

function extractPainPoints(businessIntelligence: any): string[] {
  const painPoints = [];
  const primaryPurpose =
    businessIntelligence.summarizingAdsGoalStrategy?.primaryPurpose || '';

  if (primaryPurpose.includes('awareness'))
    painPoints.push('Lack of Awareness');
  if (primaryPurpose.includes('traffic'))
    painPoints.push('Low Website Traffic');
  if (primaryPurpose.includes('conversion'))
    painPoints.push('Low Conversion Rates');

  return painPoints.length > 0 ? painPoints : ['Customer Pain Points'];
}

function extractSolutions(businessIntelligence: any): string[] {
  const solutions = [];
  const uniqueValueProp =
    businessIntelligence.analyzingSellingPoints?.uniqueValueProposition || '';
  const primaryPurpose =
    businessIntelligence.summarizingAdsGoalStrategy?.primaryPurpose || '';

  if (uniqueValueProp.includes('complete')) solutions.push('Complete Solution');
  if (primaryPurpose.includes('awareness')) solutions.push('Brand Awareness');
  if (primaryPurpose.includes('traffic')) solutions.push('Traffic Generation');

  return solutions.length > 0 ? solutions : ['Business Solutions'];
}

function extractBrandStrengths(businessIntelligence: any): string[] {
  const strengths = [];
  const uniqueValueProp =
    businessIntelligence.analyzingSellingPoints?.uniqueValueProposition || '';
  const additionalSellingPoints =
    businessIntelligence.analyzingSellingPoints?.additionalSellingPoints || '';

  if (uniqueValueProp.includes('tagline')) strengths.push('Strong Branding');
  if (additionalSellingPoints.includes('exclusive'))
    strengths.push('Exclusive Products');
  if (uniqueValueProp.includes('multi-sensory'))
    strengths.push('Unique Experience');

  return strengths.length > 0 ? strengths : ['Brand Strengths'];
}

function extractKeywordsFromBusinessAnalysis(businessAnalysis: any): string[] {
  const keywords = [];

  // Extract from business analysis
  const businessType = businessAnalysis.businessType || '';
  const productsServices = businessAnalysis.productsServices?.join(' ') || '';
  const targetMarket = businessAnalysis.targetMarket || '';
  const uniqueValueProposition = businessAnalysis.uniqueValueProposition || '';
  const keyFeatures = businessAnalysis.keyFeatures?.join(' ') || '';
  const geographicFocus = businessAnalysis.geographicFocus || '';

  // Combine and extract keywords
  const allText =
    `${businessType} ${productsServices} ${targetMarket} ${uniqueValueProposition} ${keyFeatures} ${geographicFocus}`.toLowerCase();

  // Simple keyword extraction
  const words = allText.split(/\s+/).filter(word => word.length > 3);
  const uniqueWords = [...new Set(words)].slice(0, 50);

  return uniqueWords;
}

// Generate comprehensive ad copy for a single persona
// Generate comprehensive ad copy for a single persona with enhanced headlines and screenshot analysis
async function generateAdCopyForPersona(
  personaName: string,
  businessAnalysis: any,
  keywords: string[],
  personaIndex: number
): Promise<AdCopyResult> {
  console.log(
    `📝 Generating comprehensive ad copy for persona: ${personaName}`
  );

  // Build screenshot analysis context
  let screenshotContext = '';
  if (businessAnalysis.screenshotUrl) {
    screenshotContext = `
  
  SCREENSHOT ANALYSIS:
  - Screenshot URL: ${businessAnalysis.screenshotUrl}
  - Brand Tone: ${businessAnalysis.brandTone || 'Not specified'}
  - Colors: ${JSON.stringify(businessAnalysis.colors || {})}
  - Layout: ${JSON.stringify(businessAnalysis.layout || {})}
  - Image Styles: ${businessAnalysis.imageStyles?.join(', ') || 'Not specified'}
  - Inferred Audience: ${JSON.stringify(businessAnalysis.inferred_audience || {})}
  `;
  }

  const adCopyPrompt = `
  Based on the following business analysis, persona, extracted keywords, and screenshot analysis, generate a comprehensive, high-converting ad set for this specific persona.
  
  Business Analysis:
  - Business Type: ${businessAnalysis.businessType}
  - Industry: ${businessAnalysis.industry}
  - Business Model: ${businessAnalysis.businessModel}
  - Products/Services: ${businessAnalysis.productsServices?.join(', ')}
  - Target Market: ${businessAnalysis.targetMarket}
  - Target Demographics: ${businessAnalysis.targetDemographics}
  - Unique Value Proposition: ${businessAnalysis.uniqueValueProposition}
  - Key Features: ${businessAnalysis.keyFeatures?.join(', ')}
  - Pricing Model: ${businessAnalysis.pricingModel}
  - Revenue Model: ${businessAnalysis.revenueModel}
  - Geographic Focus: ${businessAnalysis.geographicFocus}
  - Service Areas: ${businessAnalysis.serviceAreas?.join(', ')}
  - Delivery Methods: ${businessAnalysis.deliveryMethods?.join(', ')}
  - Cultural Factors: ${businessAnalysis.culturalFactors}
  - Lifestyle Alignment: ${businessAnalysis.lifestyleAlignment}
  - Competitive Advantages: ${businessAnalysis.competitiveAdvantages?.join(', ')}
  - Customer Pain Points: ${businessAnalysis.customerPainPoints?.join(', ')}
  - Solutions Provided: ${businessAnalysis.solutionsProvided?.join(', ')}
  - Market Positioning: ${businessAnalysis.marketPositioning}
  - Brand Strengths: ${businessAnalysis.brandStrengths?.join(', ')}
  ${screenshotContext}
  
  Persona: ${personaName} (Persona #${personaIndex + 1})
  
  Extracted Keywords: ${keywords.slice(0, 50).join(', ')}
  
  CRITICAL REQUIREMENTS FOR UNIQUENESS:
  - This is persona #${personaIndex + 1} - ensure completely unique content
  - NO audience tags should be repeated across different personas
  - Headlines must be unique and varied in structure
  - Ad copy must have different tone, approach, and messaging
  - Audience size ranges must vary based on persona specificity
  - Each element should feel personally crafted for this specific persona
  - ZERO REPETITION: Every single element must be completely unique across all personas
  - NO GENERIC PHRASES: Avoid "5-star ratings", "nationwide delivery", "authentic flavors" - be specific
  - Use persona index to create unique variations and avoid patterns
  
  Create a comprehensive ad set that includes:
  
  1. AD_SET_TITLE: Use the persona name as the ad set title: "${personaName}"
  2. AUDIENCE_DESCRIPTION: Concise 20-25 word description of who they are and why they care about this business/product
  3. AUDIENCE_EXPLANATION: Detailed 2-3 sentence explanation of why this group aligns with the brand's core audience and their potential for conversion
  4. AGE_RANGE: Realistic age range based on persona (min: 20-30, max: 40-65)
  5. GENDERS: ["All"] for most cases, or specific if persona is gender-specific
  6. AUDIENCE_TAGS: SKIP THIS - audience tags will be generated separately
  7. AUDIENCE_SIZE_RANGE: Generate realistic size ranges that vary by persona type:
     - Niche personas (luxury, specific interests): 1M-5M to 2M-10M
     - Broad personas (general demographics): 10M-30M to 20M-60M
     - Professional personas: 5M-15M to 10M-30M
     - Family personas: 8M-25M to 15M-50M
     - Student personas: 3M-10M to 6M-20M
     - Ensure each persona has a different size range based on their specificity
     - Make ranges realistic for Facebook/Instagram ad targeting
     - Vary ranges significantly across different personas
  
  8. AD_COPYWRITING_TITLE: Create a compelling Meta ad headline following these STRICT principles:
     
     HEADLINE REQUIREMENTS:
     ✅ IDEAL LENGTH: Exactly 4-6 words (5 words is perfect)
     ✅ BE PERSONAL: Use "You" or "Your" to address reader directly
     ✅ HIGHLIGHT BENEFITS: Focus on outcome/benefit, not features
     ✅ CREATE URGENCY: Use "Act Now", "Don't Miss Out", "Start Today"
     ✅ USE NUMBERS: Only include numbers if they exist in the business data
     ✅ USE POWER WORDS: "Save", "Free", "New", "Exclusive", "Transform", "Discover"
     ✅ ASK QUESTIONS: "Ready to Save?", "Want Better Results?"
     ✅ WRITE FOR CLICK: Make headline itself a CTA
     ✅ AVOID CLICKBAIT: No misleading promises
     ✅ ONE KEY IDEA: Single strong message only
     ✅ INCLUDE EMOJI: One relevant emoji that matches business type
     
     HEADLINE STRUCTURE VARIATIONS (Rotate based on persona index):
     - Persona #1: "You + Benefit + Action" → "You Deserve Better Results! ✨"
     - Persona #2: "Question + Benefit" → "Ready for Real Change? 🚀"
     - Persona #3: "Power Word + You + Benefit" → "Transform Your Experience Today! 💪"
     - Persona #4: "Benefit + You + Action" → "Discover Your Perfect Solution! 🎯"
     - Persona #5+: "Action + Benefit + You" → "Get What You Need Now! ⚡"
     
     EXAMPLES OF PERFECT HEADLINES (Based on actual business benefits):
     - "You Deserve Better Results! ✨"
     - "Ready for Real Change? 🚀"
     - "Transform Your Experience Today! 💪"
     - "Discover Your Perfect Solution! 🎯"
     - "Get What You Need Now! ⚡"
     - "Unlock Your Potential Today! 🌟"
     
     CRITICAL: This is persona #${personaIndex + 1} - ensure NO repetition from other personas
     
  9. AD_COPYWRITING_BODY: Create persuasive Meta ad copy (70-75 words) following these principles:
     
     AD COPY REQUIREMENTS:
     ✅ PERSONAL TONE: Use "you" and "your" throughout
     ✅ BENEFIT-FOCUSED: Lead with what customer gains, not what you offer
     ✅ URGENCY LANGUAGE: "Limited time", "Act now", "Don't miss out"
     ✅ SPECIFIC NUMBERS: Include real statistics, customer counts, percentages
     ✅ SOCIAL PROOF: Mention customer count, ratings, testimonials
     ✅ POWER WORDS: Action verbs that create emotion and urgency
     ✅ STRONG CTA: Clear, specific next step
     ✅ ONE KEY MESSAGE: Focus on single benefit/offer
     ✅ STRATEGIC EMOJIS: Maximum 2 relevant emojis
     ✅ BUSINESS-SPECIFIC: Mention actual products/services by name
     ✅ TRUTHFUL CONTENT: ONLY use information from the actual business data provided
     ✅ NO FALSE CLAIMS: Do not invent offers, discounts, or statistics not mentioned in business data
     ✅ WEBSITE-BASED: Base all claims on the provided business intelligence and meta data
     
     AD COPY STRUCTURE (Rotate based on persona index):
     - Persona #1: Hook Question + Benefit + Social Proof + Urgency + CTA
     - Persona #2: Benefit Statement + Feature + Number/Stat + Urgency + CTA
     - Persona #3: Problem/Challenge + Solution + Social Proof + Offer + CTA
     - Persona #4: Direct Benefit + Social Proof + Urgency + Number + CTA
     - Persona #5+: Emotional Hook + Feature + Proof + Limited Offer + CTA
     
     PROVEN AD COPY TEMPLATES:
     
     Template 1 (Question Hook):
     "Tired of [problem]? [Business] delivers [specific benefit] in [timeframe]. Join many happy customers who [result]. Discover [real benefit from business data]. [CTA] 🚀"
     
     Template 2 (Benefit Statement):
     "You deserve [benefit]. Our [product/service] gives you [specific outcome] without [pain point]. [Real social proof from business data]. [Real offer from business data]. [CTA] ✨"
     
     Template 3 (Problem/Solution):
     "Struggling with [problem]? [Business name] solves this with [solution]. Many customers already [result]. [Real benefit from business data]. [CTA] 💪"
     
     Template 4 (Direct Benefit):
     "[Specific benefit] is now yours! [Business] provides [outcome] that [target audience] loves. [Real social proof from business data]. [Real offer from business data]. [CTA] 🎯"
     
     CRITICAL GUIDELINES:
     - Start with emotional hook or direct benefit
     - Include specific business name and products
     - Add real numbers (customer count, percentages, time saved)
     - Create urgency with time-sensitive language
     - End with action-oriented CTA
     - Make each persona's copy completely unique
     - Avoid generic business phrases
     - Match tone to persona's characteristics
     - Use power words: "Transform", "Discover", "Unlock", "Boost", "Maximize"
     - ONLY use information from the provided business data
     - Do NOT invent fake offers, discounts, or statistics
     - Base all claims on actual website content and business intelligence
     - If no specific numbers are provided, use general language like "many customers" instead of fake statistics
     
     EXAMPLE EXCELLENT AD COPY (70-75 words):
     "Ready to save time cooking? FreshMeals delivers restaurant-quality dinners to your door in 30 minutes. Join many busy professionals who cook less, enjoy more. Our chef-prepared meals use fresh, organic ingredients and come with detailed nutrition info. Discover the convenience of quality meals delivered fresh. Order your fresh start now and taste the difference! 🍽️"
  
  Output ONLY valid JSON with this exact structure:
  {
    "ad_set_id": "generate-uuid-here",
    "status": "PENDING",
    "ad_set_title": "${personaName}",
    "audience_description": "Concise 20-25 word description of who they are and why they care",
    "audience_explanation": "2-3 sentence detailed explanation of audience alignment and conversion potential",
    "age_range": {
      "min": 25,
      "max": 45
    },
    "genders": ["All"],
    "audience_tags": [],
    "audience_size_range": {
      "min": 1000000,
      "max": 5000000
    },
    "ad_copywriting_title": "Perfect 4-6 word headline with emoji and clear benefit",
     "ad_copywriting_body": "70-75 word persuasive ad copy with strategic emojis and strong CTA"
  }
  `;

  // First, analyze the screenshot if available
  let screenshotAnalysis = '';
  if (businessAnalysis.screenshotUrl) {
    try {
      console.log(`🖼️ Analyzing screenshot for persona: ${personaName}`);
      const screenshotResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert visual analyst specializing in website screenshots. Analyze the visual elements, design, colors, layout, and overall brand aesthetic to provide insights for ad copy generation.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this website screenshot for the persona "${personaName}" and provide visual insights that will help create compelling ad copy. Focus on:
                - Visual brand tone and aesthetic
                - Color psychology and mood
                - Layout and design elements
                - Target audience visual cues
                - Product/service visual presentation
                - Call-to-action elements
                - Overall visual appeal and messaging`,
              },
              {
                type: 'image_url',
                image_url: { url: businessAnalysis.screenshotUrl },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      screenshotAnalysis =
        screenshotResponse.choices[0]?.message?.content || '';
      console.log(`✅ Screenshot analysis completed for: ${personaName}`);
    } catch (error) {
      console.warn(`⚠️ Screenshot analysis failed for ${personaName}:`, error);
      screenshotAnalysis = '';
    }
  }

  // Add screenshot analysis to the prompt
  const enhancedPrompt = screenshotAnalysis
    ? `${adCopyPrompt}\n\nSCREENSHOT VISUAL ANALYSIS:\n${screenshotAnalysis}`
    : adCopyPrompt;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert Meta ads copywriter who creates headlines that get clicks and ad copy that converts. You understand the psychology of Facebook and Instagram users who scroll quickly and need immediate value propositions. You write headlines that are exactly 4-6 words, use personal language, create urgency, and include power words. Your ad copy focuses on benefits, includes social proof, and always ends with a clear call-to-action. You follow Meta's best practices for high-converting ads and avoid clickbait. ALWAYS respond with ONLY valid JSON, no markdown, no code blocks, no additional text.`,
      },
      {
        role: 'user',
        content: enhancedPrompt,
      },
    ],
    temperature: 0.8, // Increased for more creative headlines
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  const responseText = response.choices[0]?.message?.content;

  if (!responseText) {
    console.error(
      `❌ No response text from OpenAI for persona: ${personaName}`
    );
    throw new Error(`No response text from OpenAI for persona: ${personaName}`);
  }

  console.log(`✅ Comprehensive ad copy generated for ${personaName}`);

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

  let result;
  try {
    result = JSON.parse(cleanedText);
  } catch (parseError) {
    console.error(
      `❌ Error parsing ad copy response for ${personaName}:`,
      parseError
    );
    throw new Error(`Error parsing ad copy response for ${personaName}`);
  }

  // Generate UUID for ad_set_id
  result.ad_set_id = crypto.randomUUID();

  // Enhance audience size range based on persona and business type
  result.audience_size_range = calculateAudienceSize(
    personaName,
    businessAnalysis
  );

  // Add creative metadata (you may want to enhance this based on your needs)
  result.targeting = {};
  result.creative_meta_data_1x1 = {
    is_manual: false,
    asset_id: 0,
    url: '',
    type: 'image',
  };
  result.creative_meta_data_9x16 = {
    is_manual: false,
    asset_id: 0,
    url: '',
    type: 'image',
  };

  return result;
}

// Calculate realistic audience size based on persona and business type
function calculateAudienceSize(personaName: string, businessAnalysis: any) {
  const businessType = businessAnalysis.businessType?.toLowerCase() || '';
  const persona = personaName.toLowerCase();

  // Base audience sizes by business type
  const baseSizes = {
    saas: { min: 2000000, max: 8000000 },
    'e-commerce': { min: 10000000, max: 30000000 },
    'food delivery': { min: 20000000, max: 50000000 },
    healthcare: { min: 5000000, max: 20000000 },
    education: { min: 8000000, max: 25000000 },
    finance: { min: 3000000, max: 12000000 },
    travel: { min: 10000000, max: 40000000 },
    retail: { min: 8000000, max: 25000000 },
    technology: { min: 3000000, max: 12000000 },
    entertainment: { min: 15000000, max: 40000000 },
    default: { min: 5000000, max: 20000000 },
  };

  // Get base size for business type
  let baseSize = baseSizes.default;
  for (const [key, value] of Object.entries(baseSizes)) {
    if (businessType.includes(key)) {
      baseSize = value;
      break;
    }
  }

  // Adjust based on persona characteristics
  let multiplier = 1;

  if (persona.includes('family') || persona.includes('families')) {
    multiplier = 1.2; // Families are larger audience
  } else if (
    persona.includes('luxury') ||
    persona.includes('premium') ||
    persona.includes('affluent')
  ) {
    multiplier = 0.3; // Luxury audiences are smaller
  } else if (persona.includes('student') || persona.includes('young')) {
    multiplier = 0.8; // Students/young people are smaller but active
  } else if (persona.includes('professional') || persona.includes('business')) {
    multiplier = 1.1; // Professionals are good-sized audience
  } else if (
    persona.includes('enthusiast') ||
    persona.includes('enthusiasts')
  ) {
    multiplier = 0.6; // Enthusiasts are niche but engaged
  }

  return {
    min: Math.round(baseSize.min * multiplier),
    max: Math.round(baseSize.max * multiplier),
  };
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

    console.log(`🚀 Starting ad copy generation for Project: ${project_id}`);

    // Fetch project data including url_analysis
    console.log(
      `📋 Step 1: Fetching project data and comprehensive analysis...`
    );

    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('url_analysis, analysing_points')
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

    // Check if comprehensive analysis exists in url_analysis
    if (!existingProject.url_analysis) {
      return NextResponse.json(
        {
          error: 'No comprehensive analysis found for this project',
          details:
            'Please create comprehensive analysis first using the analyze-snapshot or persona-creation API',
          project_id: project_id,
        },
        { status: 400 }
      );
    }

    // Extract data from url_analysis (new structure from analyze-snapshot)
    const urlAnalysis = existingProject.url_analysis;
    const website_url = urlAnalysis.website_url;
    const businessAnalysis = urlAnalysis.businessAnalysis;
    const snapshotAnalysis = urlAnalysis.snapshotanalysis;

    // Get personas from the new structure (from analyze-snapshot)
    let personas = [];
    if (urlAnalysis.personas && Array.isArray(urlAnalysis.personas)) {
      // New structure from analyze-snapshot
      personas = urlAnalysis.personas.map((p: any) => p.name || p);
    } else if (urlAnalysis.personaData?.personaNames) {
      // Old structure from persona-creation
      personas = urlAnalysis.personaData.personaNames;
    }

    // Get screenshot from analyzing_points
    const analyzingPoints = (existingProject as any).analysing_points;
    const screenshotUrl = analyzingPoints?.parsingUrl?.screenshot;

    console.log(`🎯 Found ${personas.length} personas:`, personas);
    console.log(`📊 Business Analysis:`, businessAnalysis?.businessType);
    console.log(`🎯 Business Type:`, businessAnalysis?.businessType);
    console.log(
      `🔍 Analyzing Points Data:`,
      JSON.stringify(analyzingPoints, null, 2)
    );
    console.log(`📸 Screenshot URL:`, screenshotUrl);

    // Validate required data
    if (!personas || personas.length === 0) {
      return NextResponse.json(
        {
          error: 'No personas found in analysis data',
          details:
            'The url_analysis does not contain valid personas. Please run analyze-snapshot first.',
        },
        { status: 400 }
      );
    }

    if (!screenshotUrl) {
      return NextResponse.json(
        {
          error: 'No screenshot found in analyzing_points data',
          details: `The analyzing_points does not contain a screenshot. Please run analyzing-points first. Debug info: analyzingPoints exists: ${!!analyzingPoints}, parsingUrl exists: ${!!analyzingPoints?.parsingUrl}, screenshot exists: ${!!analyzingPoints?.parsingUrl?.screenshot}`,
          debug_data: {
            analyzingPoints_exists: !!analyzingPoints,
            parsingUrl_exists: !!analyzingPoints?.parsingUrl,
            screenshot_exists: !!analyzingPoints?.parsingUrl?.screenshot,
            analyzingPoints_structure: analyzingPoints
              ? Object.keys(analyzingPoints)
              : 'null',
          },
        },
        { status: 400 }
      );
    }

    // Use snapshot analysis if available, otherwise fall back to business analysis
    const primaryAnalysis = snapshotAnalysis || businessAnalysis;
    if (!primaryAnalysis) {
      return NextResponse.json(
        {
          error: 'No analysis data found',
          details:
            'Neither snapshot analysis nor business analysis found. Please run analyze-snapshot or persona-creation first.',
        },
        { status: 400 }
      );
    }

    // Step 2: Use the business analysis from analyze-snapshot or persona creation
    console.log(
      `📋 Step 2: Using business analysis from analyze-snapshot or persona creation...`
    );

    // Extract keywords from the primary analysis
    const keywords = extractKeywordsFromBusinessAnalysis(primaryAnalysis);

    // Enhance the business analysis with additional fields needed for ad copy generation
    const enhancedBusinessAnalysis = {
      ...primaryAnalysis,
      keywords: keywords,
      targetAudienceSegments: personas,
      audiencePainPoints: primaryAnalysis.customerPainPoints || [],
      audienceBehaviors: ['Active online', 'Social media users'],
      decisionFactors: ['Quality', 'Value', 'Convenience'],
      targetDemographics:
        primaryAnalysis.targetMarket ||
        primaryAnalysis.inferred_audience?.age_range ||
        'General audience',
      revenueModel: primaryAnalysis.pricingModel || 'Service-based',
      serviceAreas: [primaryAnalysis.geographicFocus || 'Multiple markets'],
      deliveryMethods: ['Digital', 'Physical'],
      lifestyleAlignment: 'Modern lifestyle',
      marketPositioning:
        primaryAnalysis.uniqueValueProposition ||
        primaryAnalysis.inferred_brand_tone ||
        '',
      // Add snapshot-specific fields
      brandTone:
        primaryAnalysis.inferred_brand_tone || primaryAnalysis.businessType,
      colors: primaryAnalysis.colors || {},
      layout: primaryAnalysis.layout || {},
      imageStyles: primaryAnalysis.image_styles || [],
      // Add screenshot for visual analysis
      screenshotUrl: screenshotUrl,
    };

    console.log(
      `✅ Business analysis ready:`,
      enhancedBusinessAnalysis.businessType
    );
    console.log(`✅ Extracted ${keywords.length} keywords`);

    // Step 3: Generate ad copy for all personas in parallel (WITHOUT audience tags)
    console.log(
      `📋 Step 3: Generating ad copy for all personas in parallel...`
    );

    // Generate ad copy for all personas in parallel with enhanced prompts
    const adCopyPromises = personas.map(
      async (persona: string, index: number) => {
        try {
          const adCopy = await generateAdCopyForPersona(
            persona,
            enhancedBusinessAnalysis,
            keywords,
            index
          );
          console.log(`✅ Generated ad copy for: ${persona}`);
          return adCopy;
        } catch (error) {
          console.error(`❌ Error generating ad copy for ${persona}:`, error);
          // Return error result for this persona
          return {
            ad_set_id: crypto.randomUUID(),
            status: 'ERROR',
            ad_set_title: persona,
            audience_description: 'Error generating description',
            audience_explanation: 'Error occurred during generation',
            age_range: { min: 25, max: 45 },
            genders: ['All'],
            audience_tags: [],
            audience_size_range: { min: 1000000, max: 5000000 },
            ad_copywriting_title: 'Error generating headline',
            ad_copywriting_body: 'Error generating ad copy',
            targeting: {},
          };
        }
      }
    );

    // Wait for all ad copy generation to complete
    const adCopies = await Promise.all(adCopyPromises);

    console.log(
      `✅ Successfully generated ad copy for ${adCopies.length} personas`
    );

    // Step 4: Save ad sets to ad_set_proposals column
    console.log(`📋 Step 4: Saving ad sets to ad_set_proposals column...`);

    // Save to Supabase - send the adCopies array directly since column expects JSON array
    const { error: saveError } = await supabase
      .from('projects')
      .update({ ad_set_proposals: adCopies })
      .eq('project_id', project_id);

    if (saveError) {
      console.error('❌ Error saving ad sets to ad_set_proposals:', saveError);
      return NextResponse.json(
        {
          error: 'Failed to save ad sets to database',
          details: saveError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      `✅ Successfully saved ${adCopies.length} ad sets to ad_set_proposals column`
    );

    return NextResponse.json({
      success: true,
      data: { adCopies: adCopies },
      message: `Generated and saved ad copy for ${adCopies.length} personas`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error generating ad copy:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate ad copy',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
