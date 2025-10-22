// app/api/freepik-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TemplateSearchResult = {
  id: string;
  title: string;
  thumbnailUrl: string;
  downloadUrl?: string;
  tags: string[];
  isPremium: boolean;
  format: string;
  category: string;
};

type BusinessAnalysis = {
  businessType: string;
  productCategory: string;
  targetAudience: string;
  brandStyle: string;
  searchKeywords: string[];
  templateCategories: string[];
};

/**
 * Analyze business to determine template search parameters
 */
async function analyzeBusinessForTemplates(
  websiteUrl: string,
  screenshotUrl?: string,
  businessDescription?: string
): Promise<BusinessAnalysis> {
  console.log('🔍 Analyzing business for template matching...');

  const analysisPrompt = `Analyze this business and its products to find the most relevant Facebook ad templates from Freepik.

Website: ${websiteUrl}
Business Description: ${businessDescription || 'Not provided'}
${screenshotUrl ? 'Screenshot analysis will be performed - focus on the specific products/services shown' : ''}

Based on the business analysis, identify the SPECIFIC PRODUCTS or SERVICES being offered and create highly targeted search terms for Facebook ad templates.

IMPORTANT: Look at the actual products/services in the image and website. Generate search terms that match the EXACT product type, not generic business categories.

Examples of good specific searches:
- If selling skincare: "skincare facebook ad template", "beauty products facebook ad", "face cream facebook ad template"
- If selling electronics: "electronics facebook ad template", "gadgets facebook ad", "tech products facebook ad template"
- If selling food: "food facebook ad template", "restaurant facebook ad", "delivery food facebook ad template"
- If selling fashion: "fashion facebook ad template", "clothing facebook ad", "apparel facebook ad template"

Generate 5-7 highly specific search terms that directly relate to the ACTUAL PRODUCTS being sold.

Return as JSON:
{
  "businessType": "specific business type",
  "productCategory": "exact product category from image/website", 
  "targetAudience": "demographic description",
  "brandStyle": "visual style description",
  "searchKeywords": ["specific product facebook ad template", "exact product type facebook ad", "product category facebook ad template", "specific service facebook ad", "exact product facebook ad", "product type facebook ad template", "specific category facebook ad"],
  "templateCategories": ["facebook ad"]
}`;

  try {
    const messages: any[] = [
      {
        role: 'user',
        content: screenshotUrl
          ? [
              { type: 'text', text: analysisPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: screenshotUrl,
                  detail: 'low',
                },
              },
            ]
          : analysisPrompt,
      },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    console.log('✅ Business analysis complete:', analysis);
    return analysis;
  } catch (err) {
    console.error('❌ Error analyzing business:', err);
    return {
      businessType: 'general',
      productCategory: 'general products',
      targetAudience: 'general audience',
      brandStyle: 'modern',
      searchKeywords: [
        'products facebook ad template',
        'general facebook ad template',
        'business facebook ad template',
        'marketing facebook ad template',
        'promotion facebook ad template',
      ],
      templateCategories: ['facebook ad'],
    };
  }
}

/**
 * Search Freepik for templates
 */
async function searchFreepikTemplates(
  searchQuery: string,
  page: number = 1,
  perPage: number = 20
): Promise<TemplateSearchResult[]> {
  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('Freepik API key is not configured');
  }

  try {
    console.log(
      `🔍 Searching Freepik templates: "${searchQuery}", page ${page}`
    );

    // Freepik search endpoint
    const searchUrl = 'https://api.freepik.com/v1/resources';

    const params = new URLSearchParams({
      page: page.toString(),
      limit: perPage.toString(),
      order: 'relevance', // Use 'relevance' instead of 'popular' as per API docs
      term: searchQuery,
    });

    // Add filters as individual parameters since API expects array format
    params.append('filters[content_type][]', 'template');
    params.append('filters[content_type][]', 'psd');
    params.append('filters[orientation][]', 'square');

    const response = await fetch(`${searchUrl}?${params}`, {
      headers: {
        'x-freepik-api-key': apiKey,
        'Accept-Language': 'en-US',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Freepik search error:', response.status, errorText);
      throw new Error(`Freepik search failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Found ${data.data?.length || 0} templates`);

    // Map results to our format based on actual API response structure
    const templates: TemplateSearchResult[] = (data.data || []).map(
      (item: any) => ({
        id: item.id?.toString() || '',
        title: item.title || 'Untitled Template',
        thumbnailUrl: item.image?.source?.url || '',
        downloadUrl: item.url || '',
        tags: item.related?.keywords || [],
        isPremium:
          item.licenses?.some((license: any) => license.type === 'premium') ||
          false,
        format: item.filename?.split('.').pop() || 'psd',
        category: item.image?.type || 'template',
      })
    );

    return templates;
  } catch (error) {
    console.error('❌ Error searching Freepik templates:', error);
    return [];
  }
}

/**
 * Download and save template to Supabase
 */
async function downloadAndSaveTemplate(
  templateUrl: string,
  projectId: string,
  templateId: string
): Promise<string | null> {
  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('Freepik API key is not configured');
  }

  try {
    console.log('📥 Downloading template from Freepik...');

    // Use the official download endpoint
    const downloadUrl = `https://api.freepik.com/v1/resources/${templateId}/download`;

    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        'x-freepik-api-key': apiKey,
      },
    });

    if (!downloadResponse.ok) {
      console.error('❌ Failed to download template:', downloadResponse.status);
      return null;
    }

    const templateBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(templateBuffer);

    // Save to Supabase
    const timestamp = Date.now();
    const fileName = `${projectId}/templates/template-${templateId}-${timestamp}.zip`;

    const { data, error } = await supabase.storage
      .from('project-files')
      .upload(fileName, buffer, {
        contentType: 'application/zip',
        upsert: false,
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(data.path);

    console.log('✅ Template saved to Supabase:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('❌ Error downloading template:', err);
    return null;
  }
}

/**
 * Generate custom search queries based on business analysis
 */
function generateSearchQueries(analysis: BusinessAnalysis): string[] {
  const queries: string[] = [];

  // Use the AI-generated keywords directly (they already include "facebook ad")
  if (analysis.searchKeywords && analysis.searchKeywords.length > 0) {
    // Take only the first 5 most specific keywords to avoid too many searches
    queries.push(...analysis.searchKeywords.slice(0, 5));
  } else {
    // Fallback queries if AI analysis fails - keep them concise
    queries.push(`${analysis.productCategory} facebook ad template`);
    queries.push(`${analysis.businessType} facebook ad template`);
    queries.push('facebook ad template square');
  }

  return queries;
}

/**
 * Main API route
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      project_id,
      search_query,
      page = 1,
      per_page = 20,
      auto_analyze = true,
    } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting Freepik template search for project:', project_id);

    let searchQueries: string[] = [];
    let businessAnalysis: BusinessAnalysis | null = null;

    // If auto_analyze is true, analyze the business first
    if (auto_analyze) {
      // Fetch project from Supabase
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('url_analysis, analysing_points')
        .eq('project_id', project_id)
        .single();

      if (fetchError || !project) {
        return NextResponse.json(
          { error: 'Project not found', details: fetchError },
          { status: 404 }
        );
      }

      const websiteUrl = project.url_analysis?.website_url;
      if (!websiteUrl) {
        return NextResponse.json(
          { error: 'No website URL found. Please run analyzing-points first.' },
          { status: 400 }
        );
      }

      // Get screenshot if available
      let analysingPoints: any = null;
      try {
        analysingPoints =
          typeof project?.analysing_points === 'string'
            ? JSON.parse(project.analysing_points)
            : project?.analysing_points;
      } catch (error) {
        console.error('Error parsing analysing_points:', error);
      }

      const screenshotUrl = analysingPoints?.parsingUrl?.screenshot;
      const businessDescription = project.url_analysis?.business_description;

      // Analyze business
      businessAnalysis = await analyzeBusinessForTemplates(
        websiteUrl,
        screenshotUrl,
        businessDescription
      );

      // Generate multiple search queries
      searchQueries = generateSearchQueries(businessAnalysis);

      // Add any custom keywords from analysis (they already include "facebook ad")
      if (businessAnalysis.searchKeywords?.length > 0) {
        searchQueries.push(...businessAnalysis.searchKeywords);
      }
    } else if (search_query) {
      // Use manual search query
      searchQueries = [search_query];
    } else {
      return NextResponse.json(
        { error: 'Either search_query or auto_analyze must be provided' },
        { status: 400 }
      );
    }

    // Search for templates using all queries
    const allTemplates: TemplateSearchResult[] = [];
    const seenIds = new Set<string>();

    for (const query of searchQueries.slice(0, 3)) {
      // Limit to first 3 most specific queries for better results
      console.log(`🔍 Searching with query: "${query}"`);
      const templates = await searchFreepikTemplates(query, page, per_page);

      // De-duplicate results
      for (const template of templates) {
        if (!seenIds.has(template.id)) {
          seenIds.add(template.id);
          allTemplates.push(template);
        }
      }

      // Stop if we have enough results
      if (allTemplates.length >= per_page) {
        break;
      }
    }

    // Sort by relevance (templates that appear in multiple searches rank higher)
    const templateScores = new Map<string, number>();
    allTemplates.forEach(template => {
      const currentScore = templateScores.get(template.id) || 0;
      templateScores.set(template.id, currentScore + 1);
    });

    const sortedTemplates = allTemplates.sort((a, b) => {
      const scoreA = templateScores.get(a.id) || 0;
      const scoreB = templateScores.get(b.id) || 0;
      return scoreB - scoreA;
    });

    // Limit to requested number
    const finalTemplates = sortedTemplates.slice(0, per_page);

    // Optional: Download and save top templates
    const downloadTop = body.download_top || 0;
    const downloadedTemplates = [];

    if (downloadTop > 0) {
      for (let i = 0; i < Math.min(downloadTop, finalTemplates.length); i++) {
        const template = finalTemplates[i];
        if (template.downloadUrl && !template.isPremium) {
          const savedUrl = await downloadAndSaveTemplate(
            template.downloadUrl,
            project_id,
            template.id
          );
          downloadedTemplates.push({
            ...template,
            savedUrl,
          });
        }
      }
    }

    // Save search results to database
    try {
      const searchRecord = {
        project_id,
        search_queries: searchQueries,
        business_analysis: businessAnalysis,
        templates_found: finalTemplates.length,
        templates: finalTemplates,
        downloaded_templates: downloadedTemplates,
        created_at: new Date().toISOString(),
      };

      await supabase.from('template_searches').insert(searchRecord);

      console.log('✅ Search results saved to database');
    } catch (dbError) {
      console.error('⚠️ Failed to save search results:', dbError);
      // Continue anyway
    }

    // Return results
    const response = {
      success: true,
      project_id,
      search_queries: searchQueries,
      business_analysis: businessAnalysis,
      templates_found: finalTemplates.length,
      templates: finalTemplates,
      downloaded_templates: downloadedTemplates,
      recommendations: businessAnalysis
        ? {
            primary_style: businessAnalysis.brandStyle,
            target_audience: businessAnalysis.targetAudience,
            suggested_categories: businessAnalysis.templateCategories,
            suggested_keywords: businessAnalysis.searchKeywords,
          }
        : null,
    };

    console.log(
      `🎉 Template search complete! Found ${finalTemplates.length} templates`
    );
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('❌ Error in freepik-templates:', err);
    return NextResponse.json(
      { error: err.message || String(err), stack: err.stack },
      { status: 500 }
    );
  }
}

/**
 * GET route to retrieve saved template searches
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get('project_id');

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch saved searches from database
    const { data: searches, error } = await supabase
      .from('template_searches')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Database fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch template searches', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      project_id,
      searches: searches || [],
    });
  } catch (err: any) {
    console.error('❌ Error in GET freepik-templates:', err);
    return NextResponse.json(
      { error: err.message || String(err), stack: err.stack },
      { status: 500 }
    );
  }
}
