import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AnalyzingPointsResult {
  parsingUrl: {
    screenshot: string;
    description: string;
  };
  productInformation: {
    description: string;
  };
  sellingPoints: {
    description: string;
  };
  adsGoalStrategy: {
    description: string;
  };
}

// Firecrawl integration for URL parsing with screenshot
async function parseUrlWithFirecrawl(
  url: string
): Promise<{ screenshot: string; content: string }> {
  console.log(`🔍 Parsing URL with Firecrawl: ${url}`);

  // Check if Firecrawl API key is available
  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error(
      'FIRECRAWL_API_KEY is required but not found in environment variables'
    );
  }

  const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
      formats: [
        'markdown',
        {
          type: 'screenshot',
          fullPage: true,
        },
      ],
      onlyMainContent: true,
      includeTags: ['h1', 'h2', 'h3', 'p', 'div', 'span', 'a'],
      excludeTags: ['script', 'style', 'nav', 'footer', 'header'],
      waitFor: 2000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ Firecrawl API error details:', errorData);
    throw new Error(
      `Firecrawl API error: ${response.status} ${response.statusText}. Details: ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();
  console.log('✅ Firecrawl response received');

  return {
    screenshot: data.data?.screenshot || '',
    content: data.data?.markdown || data.data?.html || '',
  };
}

// AI function to generate business name
async function generateBusinessName(
  content: string,
  websiteUrl: string
): Promise<string> {
  console.log(`🏷️ Generating business name with AI...`);

  const prompt = `
  Based on the website content and URL, generate a clean, professional business name.
  
  Website URL: ${websiteUrl}
  Website Content: ${content.substring(0, 3000)}
  
  Rules:
  - Extract the actual business name from the content
  - If the business name is clear from the content, use it exactly as it appears
  - If not clear, generate a professional name based on the business description
  - Keep it simple, clean, and professional
  - Do not include "Inc", "LLC", "Corp", etc. unless it's part of the actual business name
  - Maximum 50 characters
  
  Return ONLY the business name, nothing else.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert at extracting and generating professional business names. Always respond with ONLY the business name, no additional text.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 100,
  });

  const businessName =
    response.choices[0]?.message?.content?.trim() || 'Business Name';
  console.log(`✅ Generated business name: ${businessName}`);

  return businessName;
}

// AI analysis function to extract the three specific details
async function analyzeWebsiteContent(
  content: string,
  screenshot: string
): Promise<Omit<AnalyzingPointsResult, 'parsingUrl'>> {
  console.log(`🧠 Analyzing website content with AI...`);

  const prompt = `
  Analyze the following website content and provide exactly 3 specific details, each in 100-120 words:

  Website Content: ${content.substring(0, 5000)} // Limit content to avoid token limits

  Please provide analysis in the following JSON format:
  {
    "productInformation": {
      "description": "Detailed analysis of the product/service information, features, and offerings (100-120 words)"
    },
    "sellingPoints": {
      "description": "Key selling points, unique value propositions, and competitive advantages (100-120 words)"
    },
    "adsGoalStrategy": {
      "description": "Recommended advertising goals, target audience strategy, and campaign objectives (100-120 words)"
    }
  }

  Focus on actionable insights for advertising strategy. Each description should be exactly 100-120 words.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert digital marketing strategist. Analyze website content and provide detailed insights for advertising strategy. ALWAYS respond with ONLY valid JSON, no markdown, no code blocks, no additional text.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const analysisText = response.choices[0]?.message?.content;
  console.log(`📝 AI analysis completed`);

  // Clean the response text
  let cleanedText = analysisText!;
  if (cleanedText.includes('```json')) {
    cleanedText = cleanedText
      .replace(/```json\s*/g, '')
      .replace(/```\s*$/g, '');
  }
  if (cleanedText.includes('```')) {
    cleanedText = cleanedText.replace(/```\s*/g, '');
  }
  cleanedText = cleanedText.trim();

  return JSON.parse(cleanedText);
}

export async function POST(req: Request) {
  try {
    console.log('🔍 Starting analyzing-points API request...');

    // Check environment variables first
    console.log('🔧 Checking environment variables...');
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    if (!process.env.FIRECRAWL_API_KEY) {
      console.error('❌ FIRECRAWL_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'Firecrawl API key not configured' },
        { status: 500 }
      );
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error(
        '❌ NEXT_PUBLIC_SUPABASE_URL not found in environment variables'
      );
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      );
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(
        '❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables'
      );
      return NextResponse.json(
        { error: 'Supabase service role key not configured' },
        { status: 500 }
      );
    }
    console.log('✅ Environment variables check passed');

    const { projectId } = await req.json();
    console.log(`📋 Request body parsed, projectId: ${projectId}`);

    if (!projectId) {
      console.error('❌ No projectId provided in request');
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    console.log(
      `🚀 Starting analyzing points extraction for project: ${projectId}`
    );

    // 1️⃣ Fetch project from Supabase
    console.log(`📊 Step 1: Fetching project from Supabase...`);
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('url_analysis, analysing_points')
      .eq('project_id', projectId)
      .single();

    if (fetchError || !project) {
      console.error(`❌ Project not found:`, fetchError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 2️⃣ Check if analysing_points already exists
    if (project.analysing_points) {
      console.log(`✅ Analysing points already exist, returning cached data`);
      return NextResponse.json({
        success: true,
        projectId,
        website_url: project.url_analysis?.website_url,
        analysing_points: project.analysing_points,
        business_name:
          (project.analysing_points as any)?.businessName || 'Business Name',
        timestamp: new Date().toISOString(),
        cached: true,
      });
    }

    // 3️⃣ Extract website_url from url_analysis JSON
    const websiteUrl = project.url_analysis?.website_url;
    if (!websiteUrl) {
      console.error(`❌ No website URL found in project`);
      return NextResponse.json(
        { error: 'website_url not found in url_analysis' },
        { status: 400 }
      );
    }

    console.log(`🎯 Analyzing website: ${websiteUrl}`);

    // 4️⃣ Parse URL with Firecrawl (includes viewport screenshot)
    console.log(`📋 Step 3: Parsing URL with Firecrawl...`);
    let screenshot, content;
    try {
      const result = await parseUrlWithFirecrawl(websiteUrl);
      screenshot = result.screenshot; // This is a Firecrawl URL that expires!
      content = result.content;
      console.log(`✅ Firecrawl parsing completed successfully`);
      console.log(`📸 Firecrawl screenshot URL (temporary):`, screenshot);
    } catch (firecrawlError) {
      console.error(`❌ Firecrawl parsing failed:`, firecrawlError);
      // Return a more specific error for Firecrawl issues
      return NextResponse.json(
        {
          error: 'Failed to parse URL with Firecrawl',
          details:
            firecrawlError instanceof Error
              ? firecrawlError.message
              : 'Unknown Firecrawl error',
          timestamp: new Date().toISOString(),
        },
        { status: 502 } // Bad Gateway for external service issues
      );
    }

    // 4.5️⃣ Download screenshot and upload to Supabase (permanent storage)
    console.log(
      `💾 Step 3.5: Downloading screenshot and saving to Supabase...`
    );
    let permanentScreenshotUrl = screenshot; // Fallback to original if upload fails

    if (screenshot) {
      try {
        console.log('📥 Downloading screenshot from Firecrawl...');
        const axios = (await import('axios')).default;
        const screenshotResponse = await axios.get(screenshot, {
          responseType: 'arraybuffer',
          timeout: 15000,
        });

        const screenshotBuffer = Buffer.from(screenshotResponse.data);
        console.log(
          `✅ Screenshot downloaded, size: ${(screenshotBuffer.length / 1024).toFixed(2)} KB`
        );

        // Upload to Supabase Storage
        const timestamp = Date.now();
        const fileName = `${projectId}/screenshots/screenshot-${timestamp}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, screenshotBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error(
            '❌ Failed to upload screenshot to Supabase:',
            uploadError
          );
          console.log('⚠️ Using original Firecrawl URL as fallback');
        } else if (uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('project-files')
            .getPublicUrl(uploadData.path);

          permanentScreenshotUrl = publicUrlData.publicUrl;
          console.log(
            '✅ Screenshot saved to Supabase (permanent):',
            permanentScreenshotUrl
          );
        }
      } catch (downloadError) {
        console.error(
          '❌ Failed to download/upload screenshot:',
          downloadError
        );
        console.log('⚠️ Using original Firecrawl URL as fallback');
        // Continue with original URL
      }
    }

    // 5️⃣ AI Analysis for the three specific details
    console.log(`📋 Step 4: AI analysis for specific details...`);
    const analysisResult = await analyzeWebsiteContent(
      content,
      permanentScreenshotUrl
    );

    // 6️⃣ Generate business name
    console.log(`📋 Step 5: Generating business name...`);
    const businessName = await generateBusinessName(content, websiteUrl);

    // 7️⃣ Compile final result with business name included
    const result: AnalyzingPointsResult & { businessName: string } = {
      parsingUrl: {
        screenshot: permanentScreenshotUrl, // Use permanent Supabase URL instead of expiring Firecrawl URL
        description: `Successfully parsed and analyzed ${websiteUrl} using Firecrawl. Screenshot permanently saved to Supabase Storage for long-term access.`,
      },
      ...analysisResult,
      businessName: businessName,
    };

    console.log(
      `💾 Step 6: Saving analyzing points with business name to Supabase...`
    );

    // 8️⃣ Save to analysing_points column (includes business name)
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        analysing_points: result,
      })
      .eq('project_id', projectId);

    if (updateError) {
      console.error('❌ Error saving to Supabase:', updateError);
      return NextResponse.json(
        { error: 'Failed to save analyzing points to database' },
        { status: 500 }
      );
    }

    console.log(
      `🎉 Analyzing points extraction complete and saved successfully!`
    );

    return NextResponse.json({
      success: true,
      projectId,
      website_url: websiteUrl,
      analysing_points: result,
      business_name: result.businessName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      '❌ Error extracting analyzing points - Full error details:',
      {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error,
      }
    );

    // Return more specific error information
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        error: 'Failed to extract analyzing points',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
