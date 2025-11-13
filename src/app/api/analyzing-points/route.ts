import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Set max duration for Vercel (requires Pro plan for >10s, but this helps with serverless config)
export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

// Initialize services with validated API key
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  // Validate API key format
  if (!apiKey.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY format is invalid. It should start with "sk-"');
  }
  
  // Check for common issues (extra spaces, newlines, etc.)
  if (apiKey.includes('\n') || apiKey.includes('\r')) {
    throw new Error('OPENAI_API_KEY contains newline characters. Please check your Vercel environment variable.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
};

const openai = getOpenAIClient();

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
  businessSummary: {
    description: string;
  };
  isMainProduct: boolean;
  pageType: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
    description: string;
  };
  tone: string;
}

// Firecrawl integration for URL parsing with screenshot
async function parseUrlWithFirecrawl(
  url: string
): Promise<{ screenshot: string; content: string }> {

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
    throw new Error(
      `Firecrawl API error: ${response.status} ${response.statusText}. Details: ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();

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

  let response;
  try {
    response = await openai.chat.completions.create({
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
  } catch (openaiError: any) {
    // Handle OpenAI API errors
    if (openaiError?.status === 401 || openaiError?.message?.includes('Incorrect API key')) {
      throw new Error(`401 Incorrect API key provided. Please check your OPENAI_API_KEY in Vercel environment variables. The key may be truncated, expired, or invalid.`);
    }
    throw openaiError;
  }

  const businessName =
    response.choices[0]?.message?.content?.trim() || 'Business Name';

  return businessName;
}

// AI analysis function to extract the three specific details
async function analyzeWebsiteContent(
  content: string,
  screenshot: string
): Promise<Omit<AnalyzingPointsResult, 'parsingUrl'>> {

  // Build messages array - include screenshot if available
  const messages: any[] = [
    {
      role: 'system',
      content:
        'You are an expert digital marketing strategist and brand analyst. Analyze website content and screenshots to provide detailed insights for advertising strategy. ALWAYS respond with ONLY valid JSON, no markdown, no code blocks, no additional text.',
    },
  ];

  // Add screenshot analysis if available
  if (screenshot) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this website screenshot to extract brand colors and tone. Then analyze the website content below.

Website Screenshot URL: ${screenshot}

Please analyze:
1. The dominant brand colors in the screenshot (primary, secondary, accent colors in hex format)
2. The overall brand tone/mood (e.g., professional, playful, modern, elegant, bold, minimal, etc.)
3. Website content analysis as specified below`,
        },
        {
          type: 'image_url',
          image_url: {
            url: screenshot,
          },
        },
        {
          type: 'text',
          text: `Website Content: ${content.substring(0, 5000)}

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
  },
  "businessSummary": {
    "description": "Comprehensive and detailed summary of the business including what they do, their mission, target market, core value proposition, products/services offered, key differentiators, target audience demographics, brand positioning, and unique selling points (MINIMUM 150 words)"
  },
  "isMainProduct": true/false,
  "pageType": "homepage|product|about|contact|services|blog|pricing|faq|other",
  "brandColors": {
    "primary": "#hexcolor (dominant brand color from screenshot)",
    "secondary": "#hexcolor (secondary brand color from screenshot)",
    "accent": "#hexcolor (accent/brand color from screenshot)",
    "description": "Brief description of the brand color palette (2-3 sentences)"
  },
  "tone": "professional|playful|modern|elegant|bold|minimal|energetic|calm|luxurious|friendly|authoritative|creative (based on visual design and content)"
}`,
        },
      ],
    });
  } else {
    // If no screenshot, just analyze content
    messages.push({
      role: 'user',
      content: `Analyze the following website content and provide exactly 4 specific details, each in 100-120 words, plus page type analysis:

Website Content: ${content.substring(0, 5000)}

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
  },
  "businessSummary": {
    "description": "Comprehensive and detailed summary of the business including what they do, their mission, target market, core value proposition, products/services offered, key differentiators, target audience demographics, brand positioning, and unique selling points (MINIMUM 150 words)"
  },
  "isMainProduct": true/false,
  "pageType": "homepage|product|about|contact|services|blog|pricing|faq|other",
  "brandColors": {
    "primary": "#hexcolor (estimate from content if screenshot not available, or use common brand colors)",
    "secondary": "#hexcolor",
    "accent": "#hexcolor",
    "description": "Brief description of the brand color palette (2-3 sentences)"
  },
  "tone": "professional|playful|modern|elegant|bold|minimal|energetic|calm|luxurious|friendly|authoritative|creative"
}`,
    });
  }

  // Instructions for analysis
  const additionalPrompt = `

Set isMainProduct = true only if the page clearly shows a physical product for sale — such as clothing, electronics, accessories, furniture, or other tangible goods (e.g., t-shirts, shoes, phones, etc.).
Set isMainProduct = false for pages about digital products, SaaS platforms, software tools, or services (e.g., web apps, subscriptions, consulting, or online platforms), as well as for informational pages like blogs, about, or contact pages.

For pageType: Determine the type of page based on content analysis:
- "homepage" - Main landing page with overview of business
- "product" - Specific product or service page
- "about" - About us, company information
- "contact" - Contact information, contact forms
- "services" - Services offered page
- "blog" - Blog posts, articles, news
- "pricing" - Pricing plans, pricing information
- "faq" - Frequently asked questions
- "other" - Any other type of page

For brandColors: Extract the dominant colors from the screenshot. If analyzing from content only, make educated estimates based on industry and content tone.

For tone: Analyze both the visual design (from screenshot) and content to determine the brand's communication style and emotional tone.

For businessSummary: Provide a comprehensive overview of the business with MINIMUM 150 words. Include:
- What they do (products/services)
- Company mission and values
- Target customer demographics
- Unique selling points and differentiators
- Core value proposition and benefits
- Brand positioning in the market
- Key features and benefits
This should provide a detailed and complete picture of the business.

Focus on actionable insights for advertising strategy. productInformation, sellingPoints, and adsGoalStrategy should each be exactly 100-120 words. businessSummary MUST be MINIMUM 150 words.`;

  // Add the additional instructions to the last message
  const lastMessage = messages[messages.length - 1];
  if (Array.isArray(lastMessage.content)) {
    // Find the last text element and append instructions
    const textElements = lastMessage.content.filter(
      (item: any) => item.type === 'text'
    );
    if (textElements.length > 0) {
      const lastTextElement = textElements[textElements.length - 1];
      lastTextElement.text += additionalPrompt;
    }
  } else if (typeof lastMessage.content === 'string') {
    lastMessage.content += additionalPrompt;
  }

  let response;
  try {
    response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.3,
      max_tokens: 2800, // Increased to accommodate 150+ word business summary
      response_format: { type: 'json_object' },
    });
  } catch (openaiError: any) {
    // Handle OpenAI API errors
    if (openaiError?.status === 401 || openaiError?.message?.includes('Incorrect API key')) {
      throw new Error(`401 Incorrect API key provided. Please check your OPENAI_API_KEY in Vercel environment variables. The key may be truncated, expired, or invalid.`);
    }
    throw openaiError;
  }

  const analysisText = response.choices[0]?.message?.content;

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

  const parsedResult = JSON.parse(cleanedText);

  return parsedResult;
}

export async function POST(req: Request) {
  try {

    // Check environment variables first with validation
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured',
          hint: 'Please set OPENAI_API_KEY in Vercel environment variables (Settings > Environment Variables)'
        },
        { status: 500 }
      );
    }
    
    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { 
          error: 'Invalid OpenAI API key format',
          hint: 'API key should start with "sk-" or "sk-proj-". Please check your Vercel environment variable.'
        },
        { status: 500 }
      );
    }
    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { error: 'Firecrawl API key not configured' },
        { status: 500 }
      );
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      );
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase service role key not configured' },
        { status: 500 }
      );
    }

    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch project from Supabase
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('url_analysis, analysing_points')
      .eq('project_id', projectId)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 2️⃣ Check if analysing_points already exists
    if (project.analysing_points) {
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
      return NextResponse.json(
        { error: 'website_url not found in url_analysis' },
        { status: 400 }
      );
    }

    // 4️⃣ Parse URL with Firecrawl (includes viewport screenshot) - with timeout
    let screenshot, content;
    try {
      // Add timeout to Firecrawl request
      const firecrawlPromise = parseUrlWithFirecrawl(websiteUrl);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Firecrawl request timeout after 20 seconds')),
          20000
        )
      );

      const result = (await Promise.race([
        firecrawlPromise,
        timeoutPromise,
      ])) as { screenshot: string; content: string };
      screenshot = result.screenshot; // This is a Firecrawl URL that expires!
      content = result.content;
    } catch (firecrawlError) {
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
    let permanentScreenshotUrl = screenshot; // Fallback to original if upload fails

    if (screenshot) {
      try {
        const axios = (await import('axios')).default;
        const screenshotResponse = await axios.get(screenshot, {
          responseType: 'arraybuffer',
          timeout: 10000, // Reduced from 15s to 10s
          maxContentLength: 10 * 1024 * 1024, // Limit to 10MB
        });

        const screenshotBuffer = Buffer.from(screenshotResponse.data);

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
        } else if (uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('project-files')
            .getPublicUrl(uploadData.path);

          permanentScreenshotUrl = publicUrlData.publicUrl;
          }
      } catch (downloadError) {
        // Continue with original URL
      }
    }

    // 5️⃣ AI Analysis for the three specific details & Generate business name (parallel)

    // Run both OpenAI calls in parallel to save time
    const [analysisResult, businessName] = await Promise.all([
      analyzeWebsiteContent(content, permanentScreenshotUrl),
      generateBusinessName(content, websiteUrl),
    ]);


    // 7️⃣ Compile final result with business name included
    const result: AnalyzingPointsResult & { businessName: string } = {
      parsingUrl: {
        screenshot: permanentScreenshotUrl, // Use permanent Supabase URL instead of expiring Firecrawl URL
        description: `Successfully parsed and analyzed ${websiteUrl} using Firecrawl. Screenshot permanently saved to Supabase Storage for long-term access.`,
      },
      ...analysisResult, // This now includes isMainProduct and pageType from analyzeWebsiteContent
      businessName: businessName,
    };


    // 8️⃣ Save to analysing_points column (includes business name)
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        analysing_points: result,
      })
      .eq('project_id', projectId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save analyzing points to database' },
        { status: 500 }
      );
    }


    return NextResponse.json({
      success: true,
      projectId,
      website_url: websiteUrl,
      analysing_points: result,
      business_name: result.businessName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Handle OpenAI API errors specifically
    if (error instanceof Error) {
      // Check for OpenAI API key errors
      if (error.message.includes('Incorrect API key') || error.message.includes('401')) {
        return NextResponse.json(
          {
            error: 'OpenAI API key is invalid',
            details: 'The API key configured in Vercel is incorrect or has been revoked.',
            hint: 'Please check your OPENAI_API_KEY in Vercel Settings > Environment Variables. Make sure: 1) The key is complete (no truncation), 2) No extra spaces or newlines, 3) The key is valid and not expired.',
            timestamp: new Date().toISOString(),
          },
          { status: 401 }
        );
      }
      
      // Check for missing API key
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          {
            error: 'OpenAI API key configuration error',
            details: error.message,
            hint: 'Please set OPENAI_API_KEY in Vercel Settings > Environment Variables and redeploy.',
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        );
      }
    }

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
