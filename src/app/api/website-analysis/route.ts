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
  ad_set_title: string;
  audience_description: string;
  audience_explanation: string;
  audience_tags: string[];
  ad_copywriting_title: string;
  ad_copywriting_body: string;
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
  console.log(`✍️ Generating 10 ad sets for ${businessName}...`);

  try {
    const prompt = `Create 10 diverse, high-converting ad sets specifically for ${businessName} based on this business analysis:

Business Analysis:
${JSON.stringify(analysingPoints, null, 2)}

For each ad set, create:
1. ad_set_title: A specific, defining name for the target audience segment this ad is designed for
2. audience_description: Specific target audience description (1-2 sentences)
3. audience_explanation: Why this audience is relevant for ${businessName} (2-3 sentences)
4. audience_tags: 15-20 relevant interest tags for Facebook targeting
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
    console.log('🔍 Raw ChatGPT response:', JSON.stringify(result, null, 2));

    const adSets = result.adSets || [];

    console.log(
      `✅ Generated ${Array.isArray(adSets) ? adSets.length : 0} ad sets`
    );

    if (Array.isArray(adSets) && adSets.length > 0) {
      console.log(
        '📝 First ad set sample:',
        JSON.stringify(adSets[0], null, 2)
      );
    }

    return Array.isArray(adSets) ? adSets : [];
  } catch (error) {
    console.error('❌ Error generating ad sets:', error);
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
    console.log(`🖼️ Fetching logo for domain: ${domain}`);

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
    console.log(`✅ Logo uploaded successfully: ${bucketUrl}`);

    return bucketUrl;
  } catch (error) {
    console.error('❌ Error fetching/uploading logo:', error);
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

    console.log(`🚀 Starting ad set generation for project: ${project_id}`);

    // Step 1: Fetch project from Supabase
    console.log('📊 Fetching project from Supabase...');
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
      console.error('Error parsing analysing_points:', error);
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
    console.log(`🏢 Business Name: ${businessName}`);

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
        console.log(`🌐 Extracted domain for logo: ${domain}`);
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
          console.error(
            '❌ Error updating analysing_points with logo:',
            logoUpdateError
          );
        } else {
          console.log('✅ Logo URL saved to analysing_points successfully!');
        }
      } else {
        console.log('⚠️ No website URL found, skipping logo fetch');
      }
    } catch (error) {
      console.error('❌ Error fetching logo:', error);
      // Don't fail the entire request if logo fetch fails
    }

    // Step 5: Generate ad sets
    const adSets = await generateAdSets(businessName, analysingPoints);

    // Step 6: Save ad sets to Supabase in ad_set_proposals column
    console.log('💾 Saving ad sets to Supabase...');
    const { error: saveError } = await supabase
      .from('projects')
      .update({ ad_set_proposals: adSets })
      .eq('project_id', project_id);

    if (saveError) {
      console.error('❌ Error saving ad sets to Supabase:', saveError);
      // Don't fail the entire request, just log the error
    } else {
      console.log('✅ Ad sets saved to Supabase successfully!');
    }

    const response: AnalysisResponse = {
      success: true,
      project_id,
      businessName,
      adSets,
      logoUrl,
    };

    console.log('🎉 Ad set generation complete!');
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Error in ad set generation:', error);
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
