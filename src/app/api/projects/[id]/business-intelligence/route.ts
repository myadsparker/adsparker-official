import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`🧠 Business Intelligence extraction for project ${id}`);

    // 1️⃣ Get website URL from Supabase
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('url_analysis')
      .eq('project_id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2️⃣ Get website URL
    let websiteUrl: string;
    try {
      const urlAnalysis =
        typeof project?.url_analysis === 'string'
          ? JSON.parse(project.url_analysis)
          : project?.url_analysis;

      websiteUrl = urlAnalysis?.website_url;

      if (!websiteUrl) {
        return NextResponse.json(
          {
            error: 'No website URL found. Please run the analyze route first.',
          },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error('⚠️ Failed to parse URL analysis data', err);
      return NextResponse.json(
        {
          error:
            'Failed to parse website URL. Please run the analyze route first.',
        },
        { status: 400 }
      );
    }

    // 3️⃣ Fetch website HTML
    console.log(`🌍 Fetching website: ${websiteUrl}`);
    const htmlResponse = await fetch(websiteUrl);

    if (!htmlResponse.ok) {
      console.error(
        `❌ Failed to fetch website: ${htmlResponse.status} ${htmlResponse.statusText}`
      );
      return NextResponse.json(
        {
          error: `Failed to fetch website: ${htmlResponse.status} ${htmlResponse.statusText}`,
        },
        { status: 400 }
      );
    }

    const rawHtml = await htmlResponse.text();
    console.log(`✅ Website content fetched. Length: ${rawHtml.length}`);

    // 4️⃣ Extract comprehensive business intelligence
    console.log(`🤖 Calling OpenAI for business intelligence extraction...`);
    const businessIntelligenceResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2, // Lower temperature for more consistent, factual extraction
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: `
You are an advanced business intelligence analyst. Extract comprehensive business information from the website HTML to create a complete business profile.

Respond with ONLY a JSON object in this exact format:

{
  "project_introduction": "Comprehensive business overview including: company name, primary service/product, geographic coverage (list specific cities/regions mentioned), key statistics (customer numbers, sales figures, years in business), unique features, and value propositions. Make this 4-6 sentences with specific details.",
  "project_goal_description": "Based on the business type and website content, infer what the business owner would want to achieve with advertising (e.g., 'increase brand awareness and drive more customers', 'generate leads for our services', 'boost online sales'). Make it sound like a business owner's goal.",
  "project_goal": "Infer primary campaign objective based on business type: 'leads' for service businesses, 'sales' for e-commerce, 'awareness' for brands, 'traffic' for content sites",
  "daily_budget": "Recommend daily ad budget based on business size and type: Small local business (20-50), Medium business (50-100), Large business (100-300). Use integer only.",
  "website_url": "${websiteUrl}",
  "target_countries": "Extract primary country/countries from content, or null if not specified",
  "geo_locations": [
    {
      "country": "Primary country code (e.g., 'US', 'UK', 'CA')",
      "region": "State/region if mentioned, otherwise empty string",
      "city": "Primary city if mentioned, otherwise empty string", 
      "country_label": "Full country name",
      "location": {
        "lat": "Geographic center latitude for primary market",
        "lng": "Geographic center longitude for primary market"
      }
    }
  ],
  "sell_point": "Detailed selling points including: specific services/products offered, unique differentiators, competitive advantages, customer benefits, social proof (ratings, testimonials, customer numbers), quality promises, and any special features. Should be comprehensive and compelling. Same content as project_introduction but can be more detailed.",
  "project_goal_model": "Business model type: 'sales' for direct purchases, 'leads' for lead generation, 'subscription' for recurring services",
  "call_to_action": "Recommend optimal CTA based on business type: 'SHOP_NOW', 'ORDER_NOW', 'GET_QUOTE', 'LEARN_MORE', 'SIGN_UP', 'CONTACT_US', 'BOOK_NOW'",
  "show_cta": true,
  "is_meta_url": false
}

CRITICAL INSTRUCTIONS:
- Extract ONLY factual information from the website
- For geographic data, include specific cities/regions mentioned on the site
- For metrics, use exact numbers found on the website (customers served, years in business, etc.)
- For recommendations (budget, CTA, goals), base them on business type and apparent size
- Use appropriate geographic coordinates for the primary market area
- Make project_introduction and sell_point comprehensive and compelling
- Ensure all fields are filled appropriately
          `,
        },
        {
          role: 'user',
          content: rawHtml,
        },
      ],
    });

    const businessIntelligenceRaw =
      businessIntelligenceResponse.choices[0].message?.content;
    console.log(
      `🔍 Raw OpenAI response length: ${businessIntelligenceRaw?.length || 0}`
    );

    let businessIntelligence;

    try {
      if (!businessIntelligenceRaw) {
        throw new Error('Empty response from OpenAI');
      }

      const cleanedBI = businessIntelligenceRaw
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .trim();

      if (!cleanedBI || cleanedBI === '{}') {
        throw new Error('No valid JSON content in response');
      }

      businessIntelligence = JSON.parse(cleanedBI);
      console.log(`✅ Business intelligence extracted successfully`);
    } catch (err) {
      console.error('❌ Failed to parse business intelligence response', err);
      console.error(
        '❌ Raw response:',
        businessIntelligenceRaw?.substring(0, 500) + '...'
      );
      return NextResponse.json(
        {
          error: 'Failed to extract business intelligence',
          details: err instanceof Error ? err.message : 'Unknown parsing error',
          rawResult: businessIntelligenceRaw?.substring(0, 500) + '...',
        },
        { status: 500 }
      );
    }

    // 5️⃣ Return business intelligence
    return NextResponse.json(
      {
        success: true,
        businessIntelligence,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error in business intelligence extraction:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract business intelligence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
