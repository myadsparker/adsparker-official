// app/api/projects/[id]/reach-estimate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Enhanced industry data with real-world metrics
const industryMetrics: Record<
  string,
  {
    baseCPM: number;
    competitionLevel: number; // 1-10, affects performance
    seasonalityFactor: number; // 0.5-2.0
    audienceEngagement: number; // 0.5-1.5
    conversionRate: number; // Expected CTR %
    marketSaturation: number; // 0.1-0.9
  }
> = {
  'Real Estate': {
    baseCPM: 8.5,
    competitionLevel: 8,
    seasonalityFactor: 1.2,
    audienceEngagement: 0.9,
    conversionRate: 1.8,
    marketSaturation: 0.7,
  },
  'Financial Services': {
    baseCPM: 12.0,
    competitionLevel: 9,
    seasonalityFactor: 1.0,
    audienceEngagement: 0.8,
    conversionRate: 2.1,
    marketSaturation: 0.8,
  },
  'E-commerce': {
    baseCPM: 7.2,
    competitionLevel: 7,
    seasonalityFactor: 1.5,
    audienceEngagement: 1.2,
    conversionRate: 3.2,
    marketSaturation: 0.6,
  },
  Healthcare: {
    baseCPM: 9.8,
    competitionLevel: 6,
    seasonalityFactor: 1.0,
    audienceEngagement: 1.1,
    conversionRate: 2.5,
    marketSaturation: 0.5,
  },
  Technology: {
    baseCPM: 10.5,
    competitionLevel: 8,
    seasonalityFactor: 1.1,
    audienceEngagement: 1.0,
    conversionRate: 2.8,
    marketSaturation: 0.7,
  },
  Default: {
    baseCPM: 8.0,
    competitionLevel: 5,
    seasonalityFactor: 1.0,
    audienceEngagement: 1.0,
    conversionRate: 2.0,
    marketSaturation: 0.6,
  },
};

// Enhanced geographic data
const geoData: Record<
  string,
  {
    cpmMultiplier: number;
    audienceSize: number;
    competitiveIndex: number;
    economicFactor: number;
  }
> = {
  US: {
    cpmMultiplier: 1.0,
    audienceSize: 250000000,
    competitiveIndex: 1.0,
    economicFactor: 1.0,
  },
  CA: {
    cpmMultiplier: 0.8,
    audienceSize: 30000000,
    competitiveIndex: 0.8,
    economicFactor: 0.85,
  },
  GB: {
    cpmMultiplier: 0.9,
    audienceSize: 55000000,
    competitiveIndex: 0.9,
    economicFactor: 0.9,
  },
  AU: {
    cpmMultiplier: 0.85,
    audienceSize: 20000000,
    competitiveIndex: 0.7,
    economicFactor: 0.8,
  },
  AE: {
    cpmMultiplier: 1.2,
    audienceSize: 8000000,
    competitiveIndex: 0.9,
    economicFactor: 1.1,
  },
  IN: {
    cpmMultiplier: 0.3,
    audienceSize: 500000000,
    competitiveIndex: 0.6,
    economicFactor: 0.4,
  },
  DE: {
    cpmMultiplier: 0.7,
    audienceSize: 70000000,
    competitiveIndex: 0.8,
    economicFactor: 0.8,
  },
  FR: {
    cpmMultiplier: 0.7,
    audienceSize: 60000000,
    competitiveIndex: 0.8,
    economicFactor: 0.8,
  },
  Default: {
    cpmMultiplier: 0.6,
    audienceSize: 50000000,
    competitiveIndex: 0.5,
    economicFactor: 0.6,
  },
};

function classifyIndustry(description: string): string {
  const desc = description.toLowerCase();

  if (desc.includes('real estate') || desc.includes('property'))
    return 'Real Estate';
  if (
    desc.includes('bank') ||
    desc.includes('finance') ||
    desc.includes('loan')
  )
    return 'Financial Services';
  if (
    desc.includes('shop') ||
    desc.includes('store') ||
    desc.includes('ecommerce')
  )
    return 'E-commerce';
  if (
    desc.includes('health') ||
    desc.includes('medical') ||
    desc.includes('doctor')
  )
    return 'Healthcare';
  if (
    desc.includes('tech') ||
    desc.includes('software') ||
    desc.includes('app')
  )
    return 'Technology';

  return 'Default';
}

async function getAIPerformanceEstimate(
  industry: string,
  dailyBudget: number,
  audienceSize: number,
  countries: string[],
  audienceTags: string[]
): Promise<{
  estimatedReachRange: [number, number];
  competitiveAdvantage: number;
  optimizationFactor: number;
  recommendedBudgetRange: { min: number; max: number };
}> {
  const prompt = `As an expert digital marketing analyst, provide realistic performance estimates for an ad campaign with these parameters:

Industry: ${industry}
Daily Budget: $${dailyBudget}
Audience Size: ${audienceSize.toLocaleString()}
Target Countries: ${countries.join(', ')}
Audience Interests: ${audienceTags.join(', ')}

Based on real-world data and industry benchmarks, estimate:
1. Expected reach range for 14 days (min-max)
2. Competitive advantage factor for optimized targeting vs standard campaigns (1.0-3.0)
3. Campaign optimization potential (1.0-2.0)
4. Recommended budget range for optimal performance
5. Estimated exploration days (a number between 2 and 7, indicating when the campaign is expected to move from learning to scaling phase. This should be directly influenced by daily budget, industry competition, and the estimated 14-day reach. Higher budget, larger estimated reach, or less competitive industry may lead to fewer exploration days)

Consider factors like:
- Market saturation in target countries
- Industry competition levels
- Seasonal trends
- Audience engagement patterns
- Platform algorithm performance

Respond in JSON format only:
{
  "estimatedReachRange": [min_reach, max_reach],
  "competitiveAdvantage": competitive_factor,
  "optimizationFactor": optimization_potential,
  "recommendedBudgetRange": {"min": min_budget, "max": max_budget},
  "explorationDays": exploration_days
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      estimatedReachRange: result.estimatedReachRange || [
        audienceSize * 0.05,
        audienceSize * 0.15,
      ],
      competitiveAdvantage: result.competitiveAdvantage || 1.5,
      optimizationFactor: result.optimizationFactor || 1.3,
      recommendedBudgetRange: result.recommendedBudgetRange || {
        min: Math.max(30, dailyBudget * 0.7),
        max: dailyBudget * 1.5,
      },
    };
  } catch (error) {
    console.error('AI estimation error:', error);
    console.log('Fallback exploration days triggered.');
    // Fallback to algorithmic estimation
    return {
      estimatedReachRange: [audienceSize * 0.05, audienceSize * 0.15],
      competitiveAdvantage: 1.5,
      optimizationFactor: 1.3,
      recommendedBudgetRange: {
        min: Math.max(30, dailyBudget * 0.7),
        max: dailyBudget * 1.5,
      },
    };
  }
}

function calculateExplorationDays(dailyBudget: number): number {
  console.log(
    `Debug: calculateExplorationDays called with dailyBudget: ${dailyBudget}`
  );
  let explorationDays: number;

  // Simplified logic: more budget = less exploration days, minimum 3 days
  if (dailyBudget < 50) {
    explorationDays = 6; // For budget less than $50
  } else if (dailyBudget >= 50 && dailyBudget < 75) {
    explorationDays = 5; // For budget between $50 and $75 (exclusive of $75)
  } else if (dailyBudget >= 75 && dailyBudget < 100) {
    explorationDays = 4; // For budget between $75 and $100 (exclusive of $100)
  } else if (dailyBudget >= 100) {
    explorationDays = 3; // For budget greater than or equal to $100
  } else {
    // Fallback for any unhandled cases, ensuring a minimum of 3 days
    explorationDays = 3;
  }

  // Ensure minimum 3 days and maximum 7 days (as per previous implicit range)
  return Math.max(3, Math.min(7, explorationDays));
}

function generateRealisticProgression(
  baseReach: number,
  days: number,
  variabilityFactor: number,
  growthPattern: 'linear' | 'exponential' | 'logarithmic' = 'logarithmic'
): number[] {
  const progression: number[] = [];
  let cumulativeReach = 0;

  for (let day = 1; day <= days; day++) {
    let dailyGrowth: number;

    switch (growthPattern) {
      case 'exponential':
        dailyGrowth = baseReach * (1 - Math.exp(-day / 7)) * (day / days);
        break;
      case 'linear':
        dailyGrowth = (baseReach / days) * day;
        break;
      default: // logarithmic (most realistic for ad campaigns)
        dailyGrowth = (baseReach * Math.log(day + 1)) / Math.log(days + 1);
    }

    // Add realistic daily variation (±15%)
    const variation = 1 + (Math.random() - 0.5) * 0.3 * variabilityFactor;
    dailyGrowth *= variation;

    // Apply diminishing returns
    const saturationFactor = Math.max(
      0.3,
      1 - (cumulativeReach / baseReach) * 0.7
    );
    dailyGrowth *= saturationFactor;

    cumulativeReach = Math.min(
      baseReach,
      cumulativeReach + Math.max(0, dailyGrowth - cumulativeReach)
    );
    progression.push(Math.round(cumulativeReach));
  }

  return progression;
}

function calculateEnhancedReachEstimate(
  dailyBudget: number,
  industry: string,
  audienceSize: number,
  countries: string[],
  aiEstimate: any,
  days: number = 10
): {
  industryPerformance: number[];
  adsparkerPerformance: number[];
  explorationDays: number;
  dropPoints: number[];
  dropActions: string[];
  performanceRange: [number, number];
} {
  const industryData = industryMetrics[industry] || industryMetrics['Default'];
  const mainCountry = countries[0] || 'US';
  const geoInfo = geoData[mainCountry] || geoData['Default'];

  // Calculate base performance for industry standard (unoptimized)
  const industryBaseCPM = industryData.baseCPM * geoInfo.cpmMultiplier;
  const industryDailyImpressions = (dailyBudget / industryBaseCPM) * 1000;
  const industryBaseReach = Math.round(
    (industryDailyImpressions / 2.5) * // Higher frequency for unoptimized campaigns
      (1 - industryData.marketSaturation * 0.3) * // Market saturation penalty
      Math.min(1, audienceSize / 1000000) *
      days // Audience size factor
  );

  // Calculate AdSparker performance (optimized)
  const optimizedReach = Math.round(
    industryBaseReach *
      aiEstimate.competitiveAdvantage *
      aiEstimate.optimizationFactor *
      industryData.audienceEngagement
  );

  // Generate realistic progressions
  const industryProgression = generateRealisticProgression(
    industryBaseReach,
    days,
    0.8, // Higher variability for unoptimized
    'linear'
  );

  const adsparkerProgression = generateRealisticProgression(
    optimizedReach,
    days,
    0.4, // Lower variability for optimized
    'logarithmic'
  );

  // Identify key performance moments
  const explorationDays = aiEstimate.explorationDays; // Use AI-estimated exploration days
  const dropPoints: number[] = [];
  const dropActions: string[] = [];

  // Find significant performance jumps
  for (let i = 1; i < adsparkerProgression.length; i++) {
    const growthRate =
      (adsparkerProgression[i] - adsparkerProgression[i - 1]) /
      adsparkerProgression[i - 1];
    if (growthRate > 0.15) {
      // 15% jump
      dropPoints.push(i);
      if (i <= 3)
        dropActions.push('AdSparker discovers winning audience segment');
      else if (i <= 7) dropActions.push('Creative optimization takes effect');
      else dropActions.push('Campaign scaling optimization');
    }
  }

  if (dropPoints.length === 0) {
    dropPoints.push(2);
    dropActions.push('AdSparker discovers a winning ads set');
  }

  return {
    industryPerformance: industryProgression,
    adsparkerPerformance: adsparkerProgression,
    explorationDays,
    dropPoints,
    dropActions,
    performanceRange: aiEstimate.estimatedReachRange,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const { dailyBudget: requestDailyBudget } = await req.json(); // Read dailyBudget from request body

    // Fetch project data from Supabase
    const { data: projects, error } = await supabase
      .from('projects')
      .select('ad_set_proposals')
      .eq('project_id', projectId)
      .limit(1);

    if (error || !projects || projects.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const adsets = projects[0]?.ad_set_proposals || [];
    if (!adsets || adsets.length === 0) {
      return NextResponse.json(
        { error: 'No ad sets found for this project' },
        { status: 404 }
      );
    }

    // Get adset data
    const adset = adsets[0];
    const audienceDescription = adset.audience_description || '';
    const dailyBudget = requestDailyBudget || adset.budget || 150; // Use budget from request body, then adset, then default
    console.log(`Debug: Daily Budget in POST function: ${dailyBudget}`);
    const audienceTags = adset.audience_tags || [];
    const targetCountries = adset.targeting?.GeoLocations?.Countries || ['US'];

    // Classify industry
    const industry = classifyIndustry(audienceDescription);

    // Calculate audience size based on countries and interests
    const mainCountry = targetCountries[0] || 'US';
    const geoInfo = geoData[mainCountry] || geoData['Default'];
    const estimatedAudienceSize = Math.round(
      geoInfo.audienceSize *
        (audienceTags.length > 0
          ? Math.min(0.3, audienceTags.length * 0.1)
          : 0.15)
    );

    console.log('📊 Enhanced Analysis:');
    console.log('- Industry:', industry);
    console.log('- Daily Budget:', dailyBudget);
    console.log('- Main Market:', mainCountry);
    console.log(
      '- Estimated Audience:',
      estimatedAudienceSize.toLocaleString()
    );

    // Get AI-powered estimates
    const aiEstimate = await getAIPerformanceEstimate(
      industry,
      dailyBudget,
      estimatedAudienceSize,
      targetCountries,
      audienceTags
    );

    // Calculate enhanced reach estimates
    const reachData = calculateEnhancedReachEstimate(
      dailyBudget,
      industry,
      estimatedAudienceSize,
      targetCountries,
      aiEstimate,
      14
    );

    // Generate random group number (1-10)
    const groupNum = Math.floor(Math.random() * 10) + 1;

    const result = {
      group_num: groupNum,
      industry_performance: reachData.industryPerformance,
      adsparker_performance: reachData.adsparkerPerformance, // Keeping original naming
      daily_budget: dailyBudget,
      exploration_days: calculateExplorationDays(dailyBudget),
      drop_point: reachData.dropPoints,
      drop_action: reachData.dropActions,
      performance_range: reachData.performanceRange,
      recommend_budget: Math.round(
        (aiEstimate.recommendedBudgetRange.min +
          aiEstimate.recommendedBudgetRange.max) /
          2
      ),
      budget_range: {
        min: aiEstimate.recommendedBudgetRange.min,
        max: aiEstimate.recommendedBudgetRange.max,
      },
      industry: industry,
      main_market: mainCountry,

      // Additional metadata
      calculation_method:
        'AI-Enhanced Dynamic Estimation with Real-World Factors',
      timestamp: new Date().toISOString(),
      competitive_advantage: aiEstimate.competitiveAdvantage,
      optimization_factor: aiEstimate.optimizationFactor,
    };

    console.log(
      `Debug: Final exploration_days before response: ${calculateExplorationDays(
        dailyBudget
      )}`
    );
    console.log('📈 Enhanced Results:');
    console.log(
      '- AdSparker Final Reach:',
      reachData.adsparkerPerformance[13].toLocaleString()
    );
    console.log(
      '- Industry Final Reach:',
      reachData.industryPerformance[13].toLocaleString()
    );
    console.log(
      '- Performance Range:',
      reachData.performanceRange.map(r => r.toLocaleString())
    );
    console.log('- Recommended Budget:', result.recommend_budget);

    // Save to Supabase
    try {
      await supabase
        .from('projects')
        .update({ reach_estimate_data: result })
        .eq('project_id', projectId);
      console.log('✅ Enhanced reach estimate saved successfully');
    } catch (saveErr) {
      console.error('⚠️ Error saving to Supabase:', saveErr);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('❌ Enhanced API Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}
