// app/api/forecast/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const BENCHMARKS: Record<string, any> = {
  apparel: { ctr: 0.0124, cpc: 0.45, cvr: 0.0411, cpa: 10.98 },
  auto: { ctr: 0.008, cpc: 2.24, cvr: 0.0511, cpa: 43.84 },
  b2b: { ctr: 0.0078, cpc: 2.52, cvr: 0.1063, cpa: 23.77 },
  beauty: { ctr: 0.0116, cpc: 1.81, cvr: 0.071, cpa: 25.49 },
  consumer_services: { ctr: 0.0062, cpc: 3.08, cvr: 0.0996, cpa: 31.11 },
  education: { ctr: 0.0073, cpc: 1.06, cvr: 0.1358, cpa: 7.85 },
  employment: { ctr: 0.0047, cpc: 2.72, cvr: 0.1173, cpa: 23.24 },
  finance: { ctr: 0.0056, cpc: 3.77, cvr: 0.0909, cpa: 41.43 },
  fitness: { ctr: 0.0101, cpc: 1.9, cvr: 0.1429, cpa: 13.29 },
  home_improvement: { ctr: 0.007, cpc: 2.93, cvr: 0.0656, cpa: 44.66 },
  healthcare: { ctr: 0.0083, cpc: 1.32, cvr: 0.11, cpa: 12.31 },
  industrial_services: { ctr: 0.0071, cpc: 2.14, cvr: 0.0071, cpa: 38.21 },
  legal: { ctr: 0.0161, cpc: 1.32, cvr: 0.056, cpa: 28.7 },
  real_estate: { ctr: 0.0099, cpc: 1.81, cvr: 0.1068, cpa: 16.92 },
  retail: { ctr: 0.0159, cpc: 0.7, cvr: 0.0326, cpa: 21.47 },
  technology: { ctr: 0.0104, cpc: 1.27, cvr: 0.0231, cpa: 55.21 },
  travel: { ctr: 0.009, cpc: 0.63, cvr: 0.0282, cpa: 22.5 },
};

function forecastIndustryPerformance(budget: number, metrics: any) {
  const impressions = Math.round(budget / metrics.cpc / metrics.ctr);
  const clicks = Math.round(impressions * metrics.ctr);
  const conversions = Math.round(clicks * metrics.cvr);

  const industryPerformance = Array.from({ length: 14 }, () =>
    Math.round(conversions * (0.8 + Math.random() * 0.5))
  );

  const lexiPerformance = industryPerformance.map((val, i) =>
    Math.round(val * (1.3 + i * 0.05))
  );

  return {
    industryPerformance,
    lexiPerformance,
    conversions,
    impressions,
    clicks,
  };
}

export async function POST(req: NextRequest) {
  try {
    const {
      project_id,
      daily_budget = 50,
      main_market = 'IN',
    } = await req.json();

    console.log(project_id);

    // 1. Get website_url from Supabase
    const { data: project, error } = await supabase
      .from('projects')
      .select('campaign_proposal')
      .eq('project_id', project_id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const websiteUrl = project.campaign_proposal?.website_url;
    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Website URL not found' },
        { status: 400 }
      );
    }

    // 2. Scrape website
    const html = await axios.get(websiteUrl).then(res => res.data);
    const $ = cheerio.load(html);
    const title = $('title').text();
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').first().text();
    const h2s = $('h2')
      .map((_, el) => $(el).text())
      .get()
      .join(', ');

    const siteSummary = `Title: ${title}\nMeta: ${metaDesc}\nH1: ${h1}\nH2s: ${h2s}`;

    // 3. Ask ChatGPT to classify industry
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a classifier. Match the website to one industry key from this list:\n' +
            Object.keys(BENCHMARKS).join(', '),
        },
        { role: 'user', content: siteSummary },
      ],
    });

    const industryKey = completion.choices[0].message.content
      ?.toLowerCase()
      .replace(/\s+/g, '_')
      .trim();

    if (!industryKey || !BENCHMARKS[industryKey]) {
      return NextResponse.json(
        { error: `Could not classify website industry. Got: ${industryKey}` },
        { status: 400 }
      );
    }

    // 4. Forecast performance
    const metrics = BENCHMARKS[industryKey];
    const { industryPerformance, lexiPerformance } =
      forecastIndustryPerformance(daily_budget, metrics);

    return NextResponse.json({
      group_num: 5,
      industry_performance: industryPerformance,
      lexi_performance: lexiPerformance,
      daily_budget,
      exploration_days: 7,
      drop_point: [1, 3, 5],
      drop_action: [
        'Lexi discovers a winning ads set',
        'Lexi adjusts ads set budget',
        'Lexi creates a new ads set',
      ],
      performance_range: [
        Math.min(...industryPerformance) * 100,
        Math.max(...lexiPerformance) * 100,
      ],
      recommend_budget: daily_budget,
      budget_range: { min: daily_budget - 20, max: daily_budget + 20 },
      industry: industryKey,
      main_market,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
