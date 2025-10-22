// app/api/generateAdsets/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { openai } from '@/lib/opanai';
import { v4 as uuidv4 } from 'uuid';

// Setup Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// META API configuration
const META_ACCESS_TOKEN = process.env.META_AD_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = '1823539441588943';
const META_API_URL = 'https://graph.facebook.com/v21.0';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const RATE_LIMIT_DELAY = 500;

// Enhanced interfaces matching LexiLexi structure
interface MetaAdInterest {
  id: string;
  name: string;
  audience_size_lower_bound: number;
  audience_size_upper_bound: number;
  path: string[];
  description?: string;
  topic?: string;
}

interface LexiLexiAdSet {
  ad_set_id: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED';
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
  targeting: null | any;
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

interface AudiencePersona {
  name: string;
  title: string;
  description: string;
  demographics: {
    age_min: number;
    age_max: number;
    genders: string[];
    locations: string[];
  };
  interests: string[];
  behaviors: string[];
  pain_points: string[];
  motivations: string[];
  budget_range: string;
}

interface MetaAd {
  id: string;
  ad_creation_time: string;
  ad_delivery_start_time: string;
  ad_delivery_stop_time: string;
  ad_creative_bodies: string[];
  ad_creative_link_titles: string[];
  ad_creative_link_captions: string[];
  ad_snapshot_url: string;
  eu_total_reach: number;
  impressions?: {
    lower_bound: number;
    upper_bound: number;
  };
  spend?: {
    lower_bound: number;
    upper_bound: number;
  };
  publisher_platforms?: string[];
  languages?: string[];
  page_name?: string;
  performance_score?: number;
}

// Enhanced retry mechanism
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.status >= 500)) {
      console.log(`Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Compute relevance of an interest to the business context
function computeInterestRelevanceScore(
  businessType: string,
  businessSummary: string,
  interest: MetaAdInterest
): number {
  const text = `${businessType} ${businessSummary}`.toLowerCase();
  const fields = [
    interest.name,
    interest.description || '',
    interest.topic || '',
    ...(interest.path || []),
  ]
    .join(' ')
    .toLowerCase();

  // Tokenize and compute simple overlap score
  const toTokens = (s: string) =>
    s
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

  const contextTokens = new Set(toTokens(text));
  const fieldTokens = toTokens(fields);

  let overlap = 0;
  for (const token of fieldTokens) {
    if (token.length <= 2) continue;
    if (contextTokens.has(token)) overlap += 1;
  }

  // Favor larger audiences slightly while prioritizing relevance
  const audienceMid =
    ((interest.audience_size_lower_bound || 0) +
      (interest.audience_size_upper_bound || 0)) /
    2;
  const audienceBoost = Math.log10(Math.max(audienceMid, 1) + 1); // 0..~9 scaled

  return overlap * 2 + audienceBoost * 0.5;
}

// Relevance score against arbitrary context text
function computeInterestRelevanceScoreForText(
  contextText: string,
  interest: MetaAdInterest
): number {
  const fields = [
    interest.name,
    interest.description || '',
    interest.topic || '',
    ...(interest.path || []),
  ]
    .join(' ')
    .toLowerCase();

  const toTokens = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

  const contextTokens = new Set(toTokens(contextText || ''));
  const fieldTokens = toTokens(fields);

  let overlap = 0;
  for (const token of fieldTokens) {
    if (token.length <= 2) continue;
    if (contextTokens.has(token)) overlap += 1;
  }

  const audienceMid =
    ((interest.audience_size_lower_bound || 0) +
      (interest.audience_size_upper_bound || 0)) /
    2;
  const audienceBoost = Math.log10(Math.max(audienceMid, 1) + 1);

  return overlap * 2 + audienceBoost * 0.5;
}

// --- Adset uniqueness helpers ---
function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set((a || []).map(s => s.toLowerCase()));
  const setB = new Set((b || []).map(s => s.toLowerCase()));
  let intersection = 0;
  for (const v of setA) if (setB.has(v)) intersection += 1;
  const union = new Set([...setA, ...setB]).size || 1;
  return intersection / union;
}

function areAdsetsTooSimilar(a: any, b: any): boolean {
  const titleA = (a?.ad_set_title || '').toLowerCase().trim();
  const titleB = (b?.ad_set_title || '').toLowerCase().trim();
  if (titleA && titleB) {
    if (titleA === titleB) return true;
    if (titleA.includes(titleB) || titleB.includes(titleA)) return true;
  }
  const sim = jaccardSimilarity(a?.audience_tags || [], b?.audience_tags || []);
  return sim >= 0.6;
}

function dedupeAdsets(adsets: any[]): any[] {
  const unique: any[] = [];
  for (const ad of adsets || []) {
    if (!unique.some(u => areAdsetsTooSimilar(u, ad))) unique.push(ad);
  }
  return unique;
}

function isLikelyGenderSpecific(context: string, tags: string[]): boolean {
  const text = `${context} ${(tags || []).join(' ')}`.toLowerCase();
  const genderHints = [
    /\bmen\b/,
    /\bman\b/,
    /\bmale\b/,
    /\bboys\b/,
    /\bgentlemen\b/,
    /\bwomen\b/,
    /\bwoman\b/,
    /\bfemale\b/,
    /\bgirls\b/,
    /\bladies\b/,
    /\bmoms?\b/,
    /\bdads?\b/,
    /\bbrides?\b/,
    /\bgrooms?\b/,
  ];
  return genderHints.some(re => re.test(text));
}

// Fetch Meta Ad Interests for precise audience sizing
async function fetchMetaAdInterests(
  businessType: string,
  businessSummary: string
): Promise<MetaAdInterest[]> {
  console.log(`🎯 Fetching Meta ad interests for: ${businessType}`);

  const searchQueries = await generateAdInterestSearchQueries(
    businessType,
    businessSummary
  );
  console.log('Generated search queries:', searchQueries);

  const allInterests: MetaAdInterest[] = [];

  for (const query of searchQueries) {
    try {
      const url = `${META_API_URL}/search?type=adinterest&q=${encodeURIComponent(
        query
      )}&locale=en_US&limit=1000&access_token=${META_ACCESS_TOKEN}`;

      const response = await withRetry(async () => {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            `Meta Targeting API Error: ${res.status} - ${
              data?.error?.message || res.statusText
            }`
          );
        }

        if (data.error) {
          throw new Error(`Meta Targeting API Error: ${data.error.message}`);
        }

        return data?.data || [];
      });

      console.log(`Found ${response.length} interests for query: ${query}`);
      allInterests.push(...response);
    } catch (error: any) {
      console.error(
        `Error fetching interests for query "${query}":`,
        error.message
      );
    }
  }

  // Remove duplicates, compute relevance, and select best matches
  const deduped = allInterests.filter(
    (interest, index, arr) => arr.findIndex(i => i.id === interest.id) === index
  );

  const scored = deduped
    .filter(interest => (interest.audience_size_lower_bound || 0) > 0)
    .map(interest => ({
      interest,
      score: computeInterestRelevanceScore(
        businessType,
        businessSummary,
        interest
      ),
    }));

  const uniqueInterests = scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.interest.audience_size_upper_bound -
          a.interest.audience_size_upper_bound
    )
    .slice(0, 30)
    .map(x => x.interest);

  console.log(`📊 Selected ${uniqueInterests.length} unique ad interests`);
  return uniqueInterests;
}

// Generate smart search queries for ad interests
async function generateAdInterestSearchQueries(
  businessType: string,
  businessSummary: string
): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a Meta ads targeting expert. Generate 8-12 specific search queries to find relevant ad interests for Meta's targeting API.

Rules:
- Each query should be 1-3 words maximum
- Focus on core business categories and user behaviors
- Include both broad and niche terms
- Think about what your target audience would be interested in
- Avoid brand names, focus on categories
- Return only a comma-separated list of terms

Examples:
- E-commerce Fashion → "fashion, clothing, online shopping, style, trends, apparel"
- SaaS Marketing → "marketing, business software, automation, analytics, CRM, lead generation"
- Food Delivery → "food delivery, restaurants, cooking, dining, takeout, meal planning"`,
      },
      {
        role: 'user',
        content: `Business Type: ${businessType}
Business Summary: ${businessSummary}

Generate 8-12 search queries to find the most relevant Meta ad interests. Return only comma-separated terms.`,
      },
    ],
  });

  const content = response.choices[0].message?.content || '';
  return content
    .split(',')
    .map(term => term.trim())
    .filter(term => term.length > 0)
    .slice(0, 12);
}

// Generate strategic audience personas (like LexiLexi's approach)
async function generateStrategicPersonas(
  businessType: string,
  businessSummary: string,
  targetAudience: any,
  adInterests: MetaAdInterest[]
): Promise<AudiencePersona[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert audience strategist. Create 4-6 distinct audience personas based on real user behaviors and motivations.

Each persona should represent a different segment of the target market with:
- Descriptive name and professional title
- Clear demographic profile
- Specific interests (use provided Meta interests)
- Behavioral patterns
- Pain points and motivations
- Realistic budget ranges

Focus on creating personas that represent real market segments, not fictional characters.

Return as JSON object with "personas" array.`,
      },
      {
        role: 'user',
        content: `Business Type: ${businessType}
Business Summary: ${businessSummary}
Target Audience: ${JSON.stringify(targetAudience)}

Available Meta Interests:
${adInterests
  .slice(0, 20)
  .map(interest => interest.name)
  .join(', ')}

Create 4-6 strategic audience personas for this business.`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  try {
    const result = JSON.parse(response.choices[0].message?.content || '{}');
    return result.personas || [];
  } catch (e) {
    console.error('Failed to parse personas JSON', e);
    return [];
  }
}

// Get audience size estimation using Meta's delivery estimation API
async function getAudienceSizeEstimation(
  interests: string[],
  demographics: any,
  adInterests: MetaAdInterest[]
): Promise<{ min: number; max: number }> {
  try {
    const targetingSpec = {
      age_min: demographics.age_min || 18,
      age_max: demographics.age_max || 65,
      genders: demographics.genders?.includes('All')
        ? [0, 1, 2]
        : demographics.genders?.includes('Male') &&
            demographics.genders?.includes('Female')
          ? [1, 2]
          : demographics.genders?.includes('Male')
            ? [1]
            : demographics.genders?.includes('Female')
              ? [2]
              : [0, 1, 2],
      geo_locations: {
        countries: ['US', 'CA', 'GB', 'AU'],
      },
      interests: interests.slice(0, 10).map(interest => ({ name: interest })),
    };

    const url = `${META_API_URL}/${META_AD_ACCOUNT_ID}/delivery_estimate?access_token=${META_ACCESS_TOKEN}`;

    const response = await withRetry(async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targeting_spec: targetingSpec,
          optimization_goal: 'REACH',
        }),
      });

      if (!res.ok) {
        throw new Error(`Delivery estimation failed: ${res.status}`);
      }

      return res.json();
    });

    if (response.data && response.data[0]) {
      const estimate = response.data[0];
      return {
        min: estimate.estimate_dau_lower_bound || 50000,
        max: estimate.estimate_dau_upper_bound || 500000,
      };
    }
  } catch (error) {
    console.error('Audience size estimation failed:', error);
  }

  // Fallback calculation based on interest audience sizes
  const totalInterests = interests.length || 1;
  const avgAudienceSize =
    adInterests
      .filter(interest => interests.includes(interest.name))
      .reduce(
        (sum, interest) =>
          sum +
          (interest.audience_size_lower_bound +
            interest.audience_size_upper_bound) /
            2,
        0
      ) / Math.max(totalInterests, 1);

  // Apply demographic and overlap filters
  const demographicReduction = 0.3; // Typical demographic filtering
  const overlapReduction = Math.min(0.8, 1 - totalInterests * 0.1); // Interest overlap

  const estimatedSize =
    avgAudienceSize * demographicReduction * overlapReduction;

  return {
    min: Math.max(Math.round(estimatedSize * 0.7), 10000),
    max: Math.max(Math.round(estimatedSize * 1.3), 50000),
  };
}

// Competitive analysis for insights (without using competitor names in ads)
async function analyzeCompetitiveMarket(
  businessType: string,
  businessSummary: string
): Promise<{
  market_insights: string[];
  content_patterns: string[];
  targeting_patterns: string[];
}> {
  // Generate generic search terms for market analysis
  const searchTerms = await generateMarketResearchTerms(
    businessType,
    businessSummary
  );

  const allAds: MetaAd[] = [];

  // Fetch competitive ads for analysis only
  for (const term of searchTerms.slice(0, 5)) {
    try {
      const ads = await fetchMetaAds(term);
      allAds.push(...ads.slice(0, 20));
    } catch (error) {
      console.error(`Failed to fetch ads for ${term}:`, error);
    }
  }

  // Analyze patterns without exposing competitor names
  const marketInsights = extractMarketInsights(allAds);
  const contentPatterns = extractContentPatterns(allAds);
  const targetingPatterns = extractTargetingPatterns(allAds);

  return {
    market_insights: marketInsights,
    content_patterns: contentPatterns,
    targeting_patterns: targetingPatterns,
  };
}

// Generate market research terms (not competitor names)
async function generateMarketResearchTerms(
  businessType: string,
  businessSummary: string
): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Generate 6-8 generic market research terms for competitive analysis. 
        
        Focus on:
        - Product categories (not brand names)
        - Service types
        - Solution keywords
        - Industry terms
        
        Examples:
        - Web scraping business → "web scraping, data extraction, automation tools, api services"
        - E-commerce platform → "online store, ecommerce platform, shopping cart, online retail"
        
        Return only comma-separated terms, no brand names.`,
      },
      {
        role: 'user',
        content: `Business Type: ${businessType}
Business Summary: ${businessSummary}

Generate market research terms for competitive analysis.`,
      },
    ],
  });

  const content = response.choices[0].message?.content || '';
  return content
    .split(',')
    .map(term => term.trim())
    .filter(term => term.length > 0)
    .slice(0, 8);
}

// Enhanced Meta API fetcher
async function fetchMetaAds(searchTerm: string): Promise<MetaAd[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const url = `${META_API_URL.replace(
    '/v21.0',
    '/v17.0'
  )}/ads_archive?search_terms=${encodeURIComponent(
    searchTerm
  )}&ad_reached_countries=['US']&ad_type=all&ad_delivery_date_min=${
    startDate.toISOString().split('T')[0]
  }&ad_delivery_date_max=${
    new Date().toISOString().split('T')[0]
  }&fields=id,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_captions,ad_snapshot_url,eu_total_reach,impressions,spend,publisher_platforms,languages,page_name,bylines&limit=50&access_token=${META_ACCESS_TOKEN}`;

  return withRetry(async () => {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta API Error: ${response.status} - ${
          data?.error?.message || response.statusText
        }`
      );
    }

    if (data.error) {
      throw new Error(`Meta API Error: ${data.error.message}`);
    }

    return data?.data || [];
  });
}

// Extract market insights without exposing competitor info
function extractMarketInsights(ads: MetaAd[]): string[] {
  const insights: string[] = [];

  if (ads.length === 0) return insights;

  const avgReach =
    ads.reduce((sum, ad) => sum + (ad.eu_total_reach || 0), 0) / ads.length;
  const platformDistribution: Record<string, number> = {};

  ads.forEach(ad => {
    ad.publisher_platforms?.forEach(platform => {
      platformDistribution[platform] =
        (platformDistribution[platform] || 0) + 1;
    });
  });

  const topPlatforms = Object.entries(platformDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([platform]) => platform);

  insights.push(
    `Average market reach: ${Math.round(avgReach).toLocaleString()}`
  );
  insights.push(`Top performing platforms: ${topPlatforms.join(', ')}`);
  insights.push(
    `Market activity level: ${
      ads.length > 100 ? 'High' : ads.length > 50 ? 'Medium' : 'Low'
    }`
  );

  return insights;
}

// Extract content patterns
function extractContentPatterns(ads: MetaAd[]): string[] {
  const patterns: string[] = [];

  if (ads.length === 0) return patterns;

  const avgBodyLength =
    ads
      .filter(ad => ad.ad_creative_bodies?.[0])
      .reduce((sum, ad) => sum + ad.ad_creative_bodies[0].length, 0) /
    Math.max(ads.filter(ad => ad.ad_creative_bodies?.[0]).length, 1);

  const commonWords: Record<string, number> = {};
  ads.forEach(ad => {
    ad.ad_creative_bodies?.forEach(body => {
      const words = body.toLowerCase().match(/\b\w+\b/g) || [];
      words.forEach(word => {
        if (word.length > 4) {
          commonWords[word] = (commonWords[word] || 0) + 1;
        }
      });
    });
  });

  const topWords = Object.entries(commonWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  patterns.push(`Optimal copy length: ${Math.round(avgBodyLength)} characters`);
  patterns.push(`Common themes: ${topWords.join(', ')}`);

  return patterns;
}

// Extract targeting patterns
function extractTargetingPatterns(ads: MetaAd[]): string[] {
  const patterns: string[] = [];

  if (ads.length === 0) return patterns;

  const platformUsage: Record<string, number> = {};
  ads.forEach(ad => {
    ad.publisher_platforms?.forEach(platform => {
      platformUsage[platform] = (platformUsage[platform] || 0) + 1;
    });
  });

  const topPlatforms = Object.entries(platformUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(
      ([platform, count]) =>
        `${platform} (${Math.round((count / ads.length) * 100)}%)`
    );

  patterns.push(`Platform distribution: ${topPlatforms.join(', ')}`);

  return patterns;
}

// Generate LexiLexi-style adsets
async function generateLexiLexiStyleAdsets(
  businessSummary: string,
  businessType: string,
  targetAudience: any,
  personas: AudiencePersona[],
  adInterests: MetaAdInterest[],
  marketAnalysis: any
): Promise<LexiLexiAdSet[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an elite Meta Ads strategist and direct-response copywriter.  
You specialize in building **high-performing, non-overlapping adsets** that maximize reach, CTR, and conversions.

CRITICAL INSTRUCTIONS:
1. Generate **exactly 10 adsets** (no more, no less). Each must be **unique** — no variations or near-duplicates.  
2. Each adset must target a **different persona or audience segment** with a clear rationale.  
3. Use **ONLY provided Meta ad interests** for audience_tags. Select the **9–10 most relevant** for each adset.  
4. Audience segments must be **strategically diverse** (demographics, behaviors, lifestyles, psychographics).  
5. **Do not mention competitors or brand names** in ad copy.  
6. Copy must be **benefit-driven, engaging, and professional**, with pain points, solutions, and strong CTAs.  
7. Use emojis naturally in **titles and body copy** (1–3 max, strategic placement).  
8. Each adset should be optimized for **broad but precise reach** — avoid overlaps in audience_tags.  
9. Each adset must estimate an **audience_size_range** based on interest sizes, ensuring realistic large-enough reach.  

RETURN STRUCTURE: JSON with "adsets" array. Each adset strictly follows this format:

{
  "ad_set_id": "uuid",
  "status": "PENDING",
  "ad_set_title": "Strategic audience name",
  "audience_description": "Who this targets, in plain English",
  "audience_explanation": "Why this segment is valuable for the business",
  "age_range": { "min": number, "max": number },
  "genders": ["All" | "Male" | "Female"],
  "audience_tags": ["Meta interest names from provided list (9-10)"],
  "audience_size_range": { "min": number, "max": number },
  "ad_copywriting_title": "Benefit-driven title with emoji",
  "ad_copywriting_body": "Engaging body text with benefits, pain points, and clear CTA. Use emojis naturally.",
  "targeting": null,
  "creative_meta_data_1x1": { "is_manual": false, "asset_id": 0, "url": "", "type": "" },
  "creative_meta_data_9x16": { "is_manual": false, "asset_id": 0, "url": "", "type": "" }
}`,
      },
      {
        role: 'user',
        content: `Business Overview: ${businessSummary}
Business Type: ${businessType}
Target Audience (overall): ${JSON.stringify(targetAudience)}

Personas to consider: ${JSON.stringify(personas)}

Available Meta Interests:
${adInterests.map(i => i.name).join(', ')}

Market Analysis Insights:
${JSON.stringify(marketAnalysis)}

TASK:  
Generate **10 unique and strategically different adsets** in the LexiLexi format.  
Each must target a **distinct persona/segment**, use **9–10 interests** from the list, and write **professional but compelling ad copy** highlighting **benefits, emotional triggers, and clear CTAs**.  
Ensure **no overlap in persona focus or interest combinations**.  
Return JSON with "adsets" array only.`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  try {
    const result = JSON.parse(response.choices[0].message?.content || '{}');
    let adsets: any[] = result.adsets || [];

    // If fewer than 10 unique adsets, request additional unique ones
    let attempts = 0;
    while (adsets.length < 10 && attempts < 2) {
      const missing = 10 - adsets.length;
      const followup = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Generate additional UNIQUE Meta adsets strictly different from provided ones. Avoid variant wording and near-duplicate audience_tags.',
          },
          {
            role: 'user',
            content: `Business: ${businessSummary}\nBusiness Type: ${businessType}\nTarget Audience: ${JSON.stringify(
              targetAudience
            )}\n\nPersonas: ${JSON.stringify(
              personas
            )}\n\nExisting adset titles: ${adsets
              .map(a => a.ad_set_title)
              .join(', ')}\nExisting audience tag sets: ${adsets
              .map(a => (a.audience_tags || []).slice(0, 8).join('|'))
              .join('; ')}\n\nAvailable Meta Interests:\n${adInterests
              .map(interest => interest.name)
              .join(
                ', '
              )}\n\nGenerate ${missing} more adsets. Each must target a different persona/segment and include 9-10 interest names from the list above. Return JSON with "adsets" array.`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      try {
        const add = JSON.parse(
          followup.choices[0].message?.content || '{}'
        ).adsets;
        if (Array.isArray(add)) {
          adsets = dedupeAdsets([...adsets, ...add]);
        }
      } catch {}
      attempts += 1;
    }

    // Enforce hard cap of 10
    if (adsets.length > 10) adsets = adsets.slice(0, 10);

    // Add UUIDs, ensure 9-10 relevant audience_tags, and calculate audience sizes
    for (const adset of adsets) {
      adset.ad_set_id = uuidv4();

      // Select 9-10 most relevant interests for this adset
      const contextText = `${businessType} ${businessSummary} ${adset.ad_set_title} ${adset.audience_description} ${adset.audience_explanation}`;
      const ranked = adInterests
        .map(interest => ({
          interest,
          score: computeInterestRelevanceScoreForText(contextText, interest),
        }))
        .sort((a, b) => b.score - a.score);

      const desiredCount = 10;
      const selected = ranked.slice(0, desiredCount).map(r => r.interest.name);
      // Ensure unique and within 9-10 range
      const uniqueSelected = Array.from(new Set(selected)).slice(0, 10);
      adset.audience_tags = uniqueSelected.slice(
        0,
        Math.max(9, Math.min(10, uniqueSelected.length))
      );

      // Ensure genders default to ["All"] unless clearly gender-specific
      const genders = (adset.genders || []).map((g: string) => g.toLowerCase());
      const hasExplicitGender = genders.some(
        (g: string) => g === 'male' || g === 'female'
      );
      if (!hasExplicitGender) {
        const genderSpecific = isLikelyGenderSpecific(
          `${adset.ad_set_title} ${adset.audience_description} ${adset.audience_explanation}`,
          adset.audience_tags
        );
        adset.genders = genderSpecific ? adset.genders || ['All'] : ['All'];
      }

      // Calculate accurate audience size based on selected interests
      const relevantInterests = adInterests.filter(interest =>
        adset.audience_tags.includes(interest.name)
      );

      if (relevantInterests.length > 0) {
        const totalMin = relevantInterests.reduce(
          (sum, interest) => sum + interest.audience_size_lower_bound,
          0
        );
        const totalMax = relevantInterests.reduce(
          (sum, interest) => sum + interest.audience_size_upper_bound,
          0
        );

        // Apply demographic and overlap adjustments
        const demographicFactor = 0.4; // Typical demographic filtering
        const overlapFactor = Math.max(0.3, 1 - relevantInterests.length * 0.1);

        adset.audience_size_range = {
          min: Math.round(totalMin * demographicFactor * overlapFactor),
          max: Math.round(totalMax * demographicFactor * overlapFactor),
        };
      } else {
        // Fallback audience size
        adset.audience_size_range = {
          min: 500000,
          max: 2000000,
        };
      }
    }

    return adsets;
  } catch (e) {
    console.error('Failed to parse adsets JSON', e);
    return [];
  }
}

// Main API endpoint
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    // 1. Extract parameters
    const projectId = params.id;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    console.log(
      `🚀 Starting LexiLexi-style ad generation for project: ${projectId}`
    );

    // 2. Fetch project data (including any previously saved adsets)
    const { data: project, error } = await supabase
      .from('projects')
      .select('campaign_proposal, ad_set_proposals')
      .eq('project_id', projectId)
      .single();

    if (error || !project) {
      throw new Error('Project not found');
    }

    const { business_summary, businessType, targetAudience } =
      project.campaign_proposal.analysis.summary;

    // 2.1 If adsets already exist in DB, return them immediately
    if (
      project.ad_set_proposals &&
      Array.isArray(project.ad_set_proposals) &&
      project.ad_set_proposals.length > 0
    ) {
      const adsets = project.ad_set_proposals;
      const processingTime = Date.now() - startTime;

      console.log(`ℹ️ Returning ${adsets.length} existing adsets from DB`);
      return NextResponse.json({
        success: true,
        processing_time_ms: processingTime,
        project_id: projectId,
        adsets,
        generated_count: adsets.length,
        meta_data: {
          source: 'cache',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 3. Fetch Meta ad interests
    console.log('🎯 Step 1: Fetching Meta ad interests...');
    const adInterests = await fetchMetaAdInterests(
      businessType,
      business_summary
    );
    console.log(`Found ${adInterests.length} relevant ad interests`);

    // 4. Generate strategic personas
    console.log('👥 Step 2: Generating strategic personas...');
    const personas = await generateStrategicPersonas(
      businessType,
      business_summary,
      targetAudience,
      adInterests
    );
    console.log(`Created ${personas.length} audience personas`);

    // 5. Analyze competitive market (for insights, not copy)
    console.log('📊 Step 3: Analyzing market patterns...');
    const marketAnalysis = await analyzeCompetitiveMarket(
      businessType,
      business_summary
    );

    // 6. Generate LexiLexi-style adsets
    console.log('🎯 Step 4: Generating LexiLexi-style adsets...');
    const adsets = await generateLexiLexiStyleAdsets(
      business_summary,
      businessType,
      targetAudience,
      personas,
      adInterests,
      marketAnalysis
    );

    // 7. Persist adsets to the project row
    try {
      const { error: saveError } = await supabase
        .from('projects')
        .update({ ad_set_proposals: adsets })
        .eq('project_id', projectId);

      if (saveError) {
        console.error('Failed to save adsets to project:', saveError);
      } else {
        console.log('💾 Adsets saved to project successfully');
      }
    } catch (e) {
      console.error('Unexpected error while saving adsets:', e);
    }

    const processingTime = Date.now() - startTime;

    console.log(
      `✅ Generated ${adsets.length} LexiLexi-style adsets in ${processingTime}ms`
    );

    // Return response in LexiLexi format
    return NextResponse.json({
      success: true,
      processing_time_ms: processingTime,
      project_id: projectId,
      adsets: adsets,
      generated_count: adsets.length,
      meta_data: {
        total_interests_analyzed: adInterests.length,
        personas_created: personas.length,
        market_insights: marketAnalysis.market_insights,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('❌ API Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      {
        status: error.message.includes('not found') ? 404 : 500,
      }
    );
  }
}
