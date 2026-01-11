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

const LOGO_DEV_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_LOGO_DEV_KEY || 'pk_S4Hd1_jvQ8WsbXpxCuND3Q';

type AdSet = {
  ad_set_id: string;
  ad_set_title: string;
  audience_description: string;
  audience_explanation: string;
  audience_tags: string[];
  ad_copywriting_title: string;
  ad_copywriting_body: string;
  age_range?: { min: number; max: number };
  genders?: string[];
  audience_size_range?: { min: number; max: number };
  status?: string;
  targeting?: any;
  creative_meta_data_1x1?: any;
  creative_meta_data_9x16?: any;
};

type AnalysisResponse = {
  success: boolean;
  project_id: string;
  businessName: string;
  adSets: AdSet[];
  logoUrl?: string | null;
  error?: string;
};

/**
 * Generate 10 ad sets based on business analysis
 */
async function generateAdSets(
  businessName: string,
  analysingPoints: any
): Promise<AdSet[]> {
  try {
    const prompt = `Create 10 diverse, high-converting ad sets specifically for ${businessName} based on this business analysis:

Business Analysis:
${JSON.stringify(analysingPoints, null, 2)}

For each ad set, create:
1. ad_set_title: A specific, defining name for the target audience segment this ad is designed for
2. audience_description: Specific target audience description (1-2 sentences)
3. audience_explanation: Why this audience is relevant for ${businessName} (2-3 sentences)
4. audience_tags: EXACTLY 20-25 relevant interest tags for Facebook targeting (minimum 20 tags required for each ad set)
5. ad_copywriting_title: Compelling headline (5-10 words)
6. ad_copywriting_body: Engaging ad copy (2-3 paragraphs, 100-150 words)
7. age_range: Realistic age range based on persona (min: 20-30, max: 40-65)
8. genders: Realistic genders based on persona (male, female, all)

Make each ad set:
- SPECIFICALLY tailored to ${businessName} and their products/services
- Target different audience segments
- Use different emotional triggers and angles
- Include relevant emojis and engaging language
- Focus on the business's unique selling points from the analysis

Return as JSON object with this exact structure:
{
  "adSets": [
    {
      "ad_set_title": "High-Performance Athletes",
      "audience_description": "Competitive athletes and serious fitness enthusiasts who demand peak performance...",
      "audience_explanation": "This audience is perfect for ${businessName} because they prioritize quality supplements...",
      "audience_tags": ["Athletics", "Performance", "Competition", "Elite Fitness", ...],
      "ad_copywriting_title": "Elite Performance Starts Here!",
      "ad_copywriting_body": "Serious athletes know that every advantage counts. Our premium supplements...",
      "age_range": {
      "min": 25,
      "max": 45
    },
    "genders": ["All"],
    "audience_size_range": {
      "min": 1000000,
      "max": 5000000
    }
    },
    ...
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    const adSets = result.adSets || [];

    // Generate UUID for each adset
    const adSetsWithIds = Array.isArray(adSets) 
      ? adSets.map((adSet: any) => ({
          ...adSet,
          ad_set_id: crypto.randomUUID(), // Generate unique ID for each adset
          status: adSet.status || 'ACTIVE',
          targeting: adSet.targeting || null,
          creative_meta_data_1x1: adSet.creative_meta_data_1x1 || null,
          creative_meta_data_9x16: adSet.creative_meta_data_9x16 || null,
        }))
      : [];

    return adSetsWithIds;
  } catch (error) {
    throw new Error(`Failed to generate ad sets: ${error}`);
  }
}

/**
 * Fetch logo from logo.dev, upload to Supabase storage, and return bucket URL
 */
async function fetchAndSaveLogo(
  domain: string,
  projectId: string
): Promise<string> {
  try {

    // Construct logo.dev URL
    const logoUrl = `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}`;

    // Fetch the logo image
    const response = await fetch(logoUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch logo: ${response.status} ${response.statusText}`
      );
    }

    // Get the image buffer
    const imageBuffer = await response.arrayBuffer();

    // Determine file extension from content type
    const contentType = response.headers.get('content-type') || 'image/png';
    const extension = contentType.includes('svg')
      ? 'svg'
      : contentType.includes('jpg') || contentType.includes('jpeg')
        ? 'jpg'
        : 'png';

    // Create filename: projectid-logo.extension
    const filename = `${projectId}-logo.${extension}`;

    // Upload to Supabase storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-logos')
      .upload(filename, Buffer.from(imageBuffer), {
        contentType: contentType,
        upsert: true, // Overwrite if file exists
      });

    if (uploadError) {
      throw new Error(
        `Failed to upload logo to storage: ${uploadError.message}`
      );
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('project-logos')
      .getPublicUrl(filename);

    const bucketUrl = urlData.publicUrl;

    return bucketUrl;
  } catch (error) {
    throw error;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    // If URL parsing fails, assume it's already a domain
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
  }
}

/**
 * Main API route handler
 */
// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Validate that project_id is a valid UUID
    if (!UUID_REGEX.test(project_id)) {
      console.error('❌ Invalid project_id format (not a UUID):', project_id);
      return NextResponse.json(
        { 
          error: 'Invalid project_id format',
          details: 'project_id must be a valid UUID. Received: ' + project_id,
          hint: 'Please ensure you are using a valid project ID from the database'
        },
        { status: 400 }
      );
    }

    console.log('✅ Valid UUID project_id:', project_id);

    // Step 1: Fetch project from Supabase
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('analysing_points, url_analysis')
      .eq('project_id', project_id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Project not found', details: fetchError },
        { status: 404 }
      );
    }

    // Step 2: Parse analysing_points
    let analysingPoints: any = null;
    try {
      analysingPoints =
        typeof project?.analysing_points === 'string'
          ? JSON.parse(project.analysing_points)
          : project?.analysing_points;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid analysing_points data' },
        { status: 400 }
      );
    }

    if (!analysingPoints) {
      return NextResponse.json(
        {
          error:
            'No analysing_points found. Please run analyzing-points first.',
        },
        { status: 400 }
      );
    }

    // Step 3: Extract business name
    const businessName = analysingPoints.businessName || 'Unknown Business';

    // Step 4: Fetch and save logo
    let logoUrl: string | null = null;
    try {
      // Extract domain from url_analysis
      const urlAnalysis =
        typeof project.url_analysis === 'string'
          ? JSON.parse(project.url_analysis)
          : project.url_analysis;

      const websiteUrl = urlAnalysis?.website_url;
      if (websiteUrl) {
        const domain = extractDomain(websiteUrl);
        logoUrl = await fetchAndSaveLogo(domain, project_id);

        // Add logo URL to analysing_points
        analysingPoints.logoUrl = logoUrl;
        analysingPoints.logoDomain = domain;

        // Update analysing_points in database
        const { error: logoUpdateError } = await supabase
          .from('projects')
          .update({ analysing_points: analysingPoints })
          .eq('project_id', project_id);

        if (logoUpdateError) {
        }
      }
    } catch (error) {
    }

    // Step 5: Generate ad sets (with UUIDs)
    const adSets = await generateAdSets(businessName, analysingPoints);

    // Step 6: Save ad sets to Supabase in ad_set_proposals column
    const { error: saveError } = await supabase
      .from('projects')
      .update({ ad_set_proposals: adSets })
      .eq('project_id', project_id);

    if (saveError) {
    }

    const response: AnalysisResponse = {
      success: true,
      project_id,
      businessName,
      adSets,
      logoUrl,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        project_id: 'unknown',
      },
      { status: 500 }
    );
  }
}
