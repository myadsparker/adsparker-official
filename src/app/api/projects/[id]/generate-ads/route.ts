import { NextResponse } from 'next/server';

// Helper: call OpenAI Chat completions with system + user messages
async function openaiChat(
  messages: any[],
  temperature = 0.7,
  max_tokens = 900
) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature,
      max_tokens,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  return choice?.message?.content;
}

// Helper: search Facebook interest API for a keyword
async function metaSearchInterest(keyword: string) {
  const url = `https://graph.facebook.com/v16.0/search?type=adinterest&q=${encodeURIComponent(
    keyword
  )}&access_token=${encodeURIComponent(process.env.META_ACCESS_TOKEN!)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.warn('Meta interest search failed:', res.status, text);
    return [];
  }
  const json = await res.json();
  return json.data || [];
}

// Utility: dedupe interest list and keep top N
function buildInterestSpec(interests: any[], keep = 30) {
  const map = new Map<string, any>();
  for (const it of interests) {
    if (!it?.id) continue;
    if (!map.has(it.id)) map.set(it.id, it);
  }
  return Array.from(map.values()).slice(0, keep);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`🚀 OpenAI Ad Generation started for project ${id}`);

    // 1️⃣ Get website URL from request body
    const body = await request.json();
    const { websiteUrl } = body;

    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Website URL is required in request body.' },
        { status: 400 }
      );
    }

    console.log(`🌍 Website URL: ${websiteUrl}`);

    // 2️⃣ Scrape website with Firecrawl
    console.log(`🔍 Step 1: Scraping website...`);
    const firecrawlRes = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer fc-f4fd3cf13b184b42a9e699abcd93d6c8`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: websiteUrl }),
    });

    if (!firecrawlRes.ok) {
      throw new Error(
        `Website scraping failed: ${firecrawlRes.status} ${firecrawlRes.statusText}`
      );
    }

    const scrapedData = await firecrawlRes.json();
    const scraped = {
      title: scrapedData.title || scrapedData.meta?.title || '',
      metaDescription: scrapedData.meta?.description || '',
      headings: (scrapedData.headings || []).slice(0, 20),
      mainText: (scrapedData.mainText || scrapedData.bodyText || '').slice(
        0,
        20000
      ),
      contactInfo: scrapedData.contactInfo || null,
    };

    console.log('📊 Website scraped successfully');

    // 3️⃣ Use OpenAI to create business profile
    console.log(`🔍 Step 2: Creating business profile with OpenAI...`);
    const analysisPrompt = [
      {
        role: 'system',
        content:
          'You are an expert marketing analyst. Given website content, produce a concise structured JSON business profile.',
      },
      {
        role: 'user',
        content: `Website content:\nTitle: ${scraped.title}\nMeta: ${scraped.metaDescription}\nHeadings: ${JSON.stringify(
          scraped.headings
        )}\nMainText:\n${scraped.mainText}\n\nReturn ONLY valid JSON with keys: business_summary (3-4 sentences), products_services (array), target_audience (text), unique_value_proposition (1-2 sentences), tone_of_voice (one phrase), pain_points_solved (array).`,
      },
    ];

    const analysisRaw = await openaiChat(analysisPrompt, 0.2, 700);
    let businessProfile: any;
    try {
      businessProfile = JSON.parse(analysisRaw);
    } catch (e) {
      const fixPrompt = [
        {
          role: 'system',
          content:
            'You are a JSON formatter. Re-emit the user content as JSON.',
        },
        {
          role: 'user',
          content: `Input text:\n${analysisRaw}\n\nOutput valid JSON.`,
        },
      ];
      const fixed = await openaiChat(fixPrompt, 0.0, 500);
      businessProfile = JSON.parse(fixed);
    }

    console.log(
      '📊 Business Profile Complete:',
      JSON.stringify(businessProfile, null, 2)
    );

    // 4️⃣ Generate personas (high-quality)
    console.log(`🔍 Step 3: Generating personas...`);
    const personaPrompt = [
      {
        role: 'system',
        content:
          'You are a senior marketing strategist. Create realistic customer personas tied to the business. For each persona produce: persona_name, demographics (age range, gender, location), psychographics (interests, behaviors), key_needs, buying_triggers, sample_keywords_for_targeting (10 keywords). Return a JSON array `personas`.',
      },
      {
        role: 'user',
        content: `Business Profile:\n${JSON.stringify(businessProfile, null, 2)}\n\nCreate 10 personas with detailed fields described above. Return ONLY JSON.`,
      },
    ];

    const personasRaw = await openaiChat(personaPrompt, 0.3, 900);
    let personaData: any;
    try {
      personaData = JSON.parse(personasRaw);
    } catch (e) {
      personaData = JSON.parse(personasRaw.slice(personasRaw.indexOf('{')));
    }
    const personas: any[] = personaData.personas || personaData || [];

    console.log(`📊 Generated ${personas.length} personas`);

    // 5️⃣ For each persona: collect interest IDs from Meta
    console.log(`🔍 Step 4: Collecting Meta interest IDs...`);
    const personaTargetingPromises = personas.map(async p => {
      const keywords: string[] =
        p.sample_keywords_for_targeting?.slice(0, 12) || [];
      const interestResults = [];
      for (const kw of keywords) {
        try {
          const res = await metaSearchInterest(kw);
          if (Array.isArray(res) && res.length) interestResults.push(...res);
        } catch (err) {
          console.warn('meta search error for', kw, err);
        }
        await new Promise(r => setTimeout(r, 150));
      }
      const deduped = buildInterestSpec(interestResults, 40);
      const audienceSizes = deduped.map(
        (d: any) => d?.audience_size || d?.audience_size_min || 0
      );
      const totalEst = audienceSizes.reduce(
        (a: number, b: number) => a + (b || 0),
        0
      );
      return {
        persona: p,
        interests: deduped,
        audience_estimate_total: totalEst,
        audience_size_range: {
          min: Math.round(totalEst * 0.6),
          max: Math.round(totalEst * 1.1),
        },
      };
    });

    const personaTargeting = await Promise.all(personaTargetingPromises);
    console.log(
      `📊 Collected targeting data for ${personaTargeting.length} personas`
    );

    // 6️⃣ For each persona generate high-quality ad copies using OpenAI
    console.log(`🔍 Step 5: Generating ad copies...`);
    const adSets = await Promise.all(
      personaTargeting.map(async (pt, idx) => {
        const persona = pt.persona;
        const personaName = persona.persona_name || `Persona ${idx + 1}`;
        const adPrompt = [
          {
            role: 'system',
            content:
              'You are an award-winning ad copywriter specializing in social media ads (Facebook, Instagram, TikTok). Produce high-converting, persona-targeted ad variations. Use short punchy hooks, benefits, social proof ideas, and a clear CTA. Each ad must feel like it is written directly for the persona; no placeholders like {product}. Provide ad variants in JSON.',
          },
          {
            role: 'user',
            content: `Business Profile:\n${JSON.stringify(businessProfile, null, 2)}\n\nPersona:\n${JSON.stringify(
              persona,
              null,
              2
            )}\n\nTargeting Interest IDs (sample):\n${JSON.stringify(
              pt.interests.map((i: any) => ({
                id: i.id,
                name: i.name,
                audience_size: i.audience_size,
              })),
              null,
              2
            )}\n\nRequirements:\n- Generate 2 ad variants for this persona.\n- Each ad: persona_name, hook (<=10 words), body (1-3 sentences), CTA (one short imperative), suggested format (image, video, carousel), tone, suggested primary metric to optimize (e.g., link_clicks, landing_page_views).\n- Output MUST be valid JSON like: { "ads": [ { ... }, ... ] }\n\nMake the copy very high-quality, specific, and evocative. Avoid generic phrases. If possible, include a short social proof line (e.g., 'Join 3,000 satisfied customers').`,
          },
        ];

        const adsRaw = await openaiChat(adPrompt, 0.8, 900);
        let adsJson: any;
        try {
          adsJson = JSON.parse(adsRaw);
        } catch (e) {
          const start = adsRaw.indexOf('{');
          adsJson = JSON.parse(adsRaw.slice(start));
        }

        // Build the ad set JSON similar to your example
        return {
          ad_set_id: `${Date.now().toString(36)}-${idx}`,
          status: 'ACTIVE',
          ad_set_title: personaName,
          audience_description:
            persona.short_description || persona.description || personaName,
          audience_explanation: persona.rationale || '',
          age_range: persona.demographics?.age_range || {
            min: persona.demographics?.age_min || 18,
            max: persona.demographics?.age_max || 45,
          },
          genders: ['All'],
          audience_tags: pt.interests.map((i: any) => i.name),
          audience_size_range: pt.audience_size_range,
          ad_copywriting_title:
            adsJson.ads?.[0]?.title || `Top ad for ${personaName}`,
          ad_copywriting_body:
            adsJson.ads?.[0]?.body || adsJson.ads?.[0]?.copy || '',
          targeting: {
            GeoLocations: { Countries: ['US'] },
            PublisherPlatforms: null,
            DevicePlatforms: null,
            Locales: null,
            AgeMin: persona.demographics?.age_min || 18,
            AgeMax: persona.demographics?.age_max || 45,
            Genders: [0],
            FlexibleSpec: [
              {
                interests: pt.interests.map((i: any) => ({
                  id: i.id,
                  name: i.name,
                })),
                behaviors: null,
                relationship_statuses: null,
                family_statuses: null,
                life_events: null,
                industries: null,
                income: null,
              },
            ],
          },
          ads_variants: adsJson.ads || [],
          creative_meta_data_1x1: {
            is_manual: false,
            asset_id: 0,
            url: '',
            type: '',
          },
          creative_meta_data_9x16: {
            is_manual: false,
            asset_id: 0,
            url: '',
            type: 'images',
          },
        };
      })
    );

    console.log(`✅ Successfully generated ${adSets.length} ad sets`);

    // 7️⃣ Return result
    return NextResponse.json(
      {
        success: true,
        websiteUrl,
        adsets: adSets,
        message: `Generated ${adSets.length} ad sets`,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ OpenAI Ad Generation failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate ad sets with OpenAI',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
