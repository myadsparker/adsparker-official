// app/api/freepik-extract/route.ts
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

type FirecrawlResult = {
  logoUrl?: string;
  mainImageUrl?: string;
  logoDescription?: string;
  productDescription?: string;
  businessDescription?: string;
};

type ScreenshotAnalysis = {
  visualElements: string;
  colorScheme: string;
  layout: string;
  keyFeatures: string[];
  brandingElements: string;
  userInterface: string;
  pageType?: 'product_page' | 'home_page' | 'landing_page';
  isProductPage?: boolean;
  hasMainProduct?: boolean;
  mainProductDescription?: string;
  inferredAudience?: string;
};

type FreepikGenerationResult = {
  taskId: string;
  status: string;
  generatedImages?: string[];
};

/**
 * Analyze screenshot using GPT-4 Vision (SAME AS BEFORE)
 */
async function analyzeScreenshot(
  screenshotUrl: string
): Promise<ScreenshotAnalysis> {
  console.log('📸 Analyzing screenshot with GPT-4 Vision...');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this website screenshot in detail. Focus on:
1. Visual elements and design style (modern, minimal, corporate, playful, etc.)
2. Color scheme and branding (primary colors, secondary colors, overall mood)
3. Layout and structure (hero section, navigation, content organization)
4. Key features visible (forms, CTAs, product images, testimonials, etc.)
5. Branding elements (logo style, typography, visual identity)
6. User interface patterns (buttons, cards, modals, etc.)
7. **PAGE TYPE DETECTION**: Determine if this is:
   - A product page (showing a specific product for sale with details, price, add to cart)
   - A home page (general overview, multiple sections)
   - A landing page (focused campaign page)
8. **PRODUCT DETECTION**: If it's a product page, identify:
   - Does it have a main product image?
   - What is the product? (brief description)

Provide a detailed analysis that will help create compelling ad visuals that match this brand's identity.

Return as JSON with fields: visualElements, colorScheme, layout, keyFeatures (array), brandingElements, userInterface, pageType ("product_page"|"home_page"|"landing_page"), isProductPage (boolean), hasMainProduct (boolean), mainProductDescription (string), inferredAudience (string describing target demographic: age, gender, interests, lifestyle)`,
            },
            {
              type: 'image_url',
              image_url: {
                url: screenshotUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    console.log('✅ Screenshot analysis complete:', analysis);
    return analysis;
  } catch (err) {
    console.error('❌ Error analyzing screenshot:', err);
    return {
      visualElements: 'Unable to analyze',
      colorScheme: 'Unknown',
      layout: 'Unknown',
      keyFeatures: [],
      brandingElements: 'Unknown',
      userInterface: 'Unknown',
    };
  }
}

/**
 * Extract images and content from URL using Firecrawl (SAME AS BEFORE)
 */
async function extractContentFromUrl(url: string): Promise<FirecrawlResult> {
  console.log(`🔍 Extracting content from URL: ${url}`);

  try {
    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('❌ Firecrawl API error:', resp.status, errorText);
      throw new Error(`Firecrawl API error: ${resp.status}`);
    }

    const json = await resp.json();
    const markdown = json.data?.markdown || '';

    // Use GPT to analyze the scraped content
    const analysisPrompt = `Analyze this website content and extract:
1. Logo URL (look for main logo in header/metadata)
2. Main product/hero image URL
3. Brief description of what the logo looks like (colors, style, text)
4. Brief description of the main product/image (what it shows)
5. Brief business description (what they sell/offer)

Website URL: ${url}

Content:
${markdown.slice(0, 4000)}

Return as JSON with fields: logoUrl, mainImageUrl, logoDescription, productDescription, businessDescription`;

    const analysis = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: analysisPrompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(analysis.choices[0].message.content || '{}');
    console.log('📊 Extracted content:', result);

    return {
      logoUrl: result.logoUrl,
      mainImageUrl: result.mainImageUrl,
      logoDescription: result.logoDescription,
      productDescription: result.productDescription,
      businessDescription: result.businessDescription,
    };
  } catch (err) {
    console.error('❌ Error extracting content:', err);
    return {};
  }
}

/**
 * Convert logo to PNG format for Freepik compatibility
 */
async function convertLogoToPNGForFreepik(
  logoBase64: string
): Promise<string | null> {
  try {
    console.log('🔄 Converting logo to PNG format for Freepik...');
    const sharp = (await import('sharp')).default;

    const logoBuffer = Buffer.from(logoBase64, 'base64');

    // Convert to PNG
    const pngBuffer = await sharp(logoBuffer)
      .png()
      .resize(1080, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
      })
      .toBuffer();

    const pngBase64 = pngBuffer.toString('base64');
    console.log(
      `✅ Logo converted to PNG for Freepik, size: ${(pngBase64.length / 1024).toFixed(2)} KB`
    );
    return pngBase64;
  } catch (error: any) {
    console.warn('⚠️ Failed to convert logo to PNG:', error.message);
    return null;
  }
}

/**
 * Generate an image with Freepik Seedream v4 or Seedream v4 Edit (with reference images)
 */
async function generateImageWithFreepik(
  prompt: string,
  referenceImages?: string[]
): Promise<FreepikGenerationResult> {
  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error('Freepik API key is not configured');
  }

  try {
    console.log('🎨 Generating image with Freepik Gemini 2.5 Flash...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    console.log('📐 Aspect Ratio: square_1_1 (1024x1024px)');
    console.log('🔑 API Key configured:', !!apiKey);
    console.log('🔑 API Key length:', apiKey?.length || 0);

    if (referenceImages && referenceImages.length > 0) {
      console.log('🖼️  Reference images:', referenceImages.length);
      referenceImages.forEach((img, idx) => {
        console.log(
          `   📷 Image ${idx + 1} size: ${(img.length / 1024).toFixed(2)} KB`
        );
      });
    }

    const url = 'https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview';

    const requestBody: any = {
      prompt: prompt,
      aspect_ratio: 'square_1_1', // Force 1:1 square format (1024x1024px)
      num_images: 1,
    };

    // Add reference images if available (max 3 supported by Gemini 2.5 Flash)
    if (referenceImages && referenceImages.length > 0) {
      requestBody.reference_images = referenceImages.slice(0, 3);
    }

    console.log('🎯 CRITICAL: aspect_ratio set to:', requestBody.aspect_ratio);

    const options = {
      method: 'POST',
      headers: {
        'x-freepik-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    };

    console.log('📤 Sending request to Gemini 2.5 Flash API...');
    console.log('🔗 URL:', url);
    console.log(
      '📋 Request body:',
      JSON.stringify(
        {
          prompt: requestBody.prompt.substring(0, 100) + '...',
          aspect_ratio: requestBody.aspect_ratio,
          num_images: requestBody.num_images,
          reference_images: requestBody.reference_images
            ? `[${requestBody.reference_images.length} images]`
            : undefined,
        },
        null,
        2
      )
    );
    console.log(
      '⚠️ ⚠️ ⚠️  ASPECT RATIO IS:',
      requestBody.aspect_ratio,
      '⚠️ ⚠️ ⚠️'
    );

    const response = await fetch(url, options);

    console.log(
      `📡 Response status: ${response.status} ${response.statusText}`
    );

    // Check content-type before parsing
    const contentType = response.headers.get('content-type');
    console.log(`📋 Response content-type: ${contentType}`);

    // Accept both application/json and application/problem+json (used for errors)
    if (
      !contentType ||
      (!contentType.includes('application/json') &&
        !contentType.includes('application/problem+json'))
    ) {
      const responseText = await response.text();
      console.error('❌ Non-JSON response received:', {
        contentType,
        status: response.status,
        body: responseText.substring(0, 500),
      });
      throw new Error(
        `Expected JSON but received ${contentType}. Status: ${response.status}. Body: ${responseText.substring(0, 200)}`
      );
    }

    const data = await response.json();

    console.log('📊 Full API Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ Freepik Gemini 2.5 Flash API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error,
        message: data.message,
        fullResponse: JSON.stringify(data, null, 2),
      });
      throw new Error(
        `Freepik API error (${response.status}): ${data.message || data.error?.message || JSON.stringify(data)}`
      );
    }

    const hasReference = referenceImages && referenceImages.length > 0;
    console.log(
      `✅ Image generation started ${hasReference ? '(with reference)' : ''}, task ID:`,
      data.data.task_id
    );
    console.log('📐 Requested aspect_ratio:', requestBody.aspect_ratio);

    return {
      taskId: data.data.task_id,
      status: data.data.status,
      generatedImages: data.data.generated,
    };
  } catch (error: any) {
    console.error(
      '❌ Error generating image with Freepik Gemini 2.5 Flash:',
      error
    );

    // If it's a parsing error, provide helpful debugging info
    if (error instanceof SyntaxError) {
      console.error('💥 JSON parsing failed in generation request');
      console.error('🔑 This usually means:');
      console.error('   1. Invalid or expired FREEPIK_API_KEY');
      console.error('   2. API endpoint changed or deprecated');
      console.error('   3. Network/firewall blocking the request');
    }

    throw error;
  }
}

/**
 * Poll Freepik Gemini 2.5 Flash task status until completion
 */
async function pollFreepikTaskStatus(
  taskId: string,
  maxAttempts: number = 60
): Promise<string[]> {
  console.log('⏳ Polling Freepik Gemini 2.5 Flash task status...');

  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    throw new Error(
      'FREEPIK_API_KEY is not configured in environment variables'
    );
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const pollUrl = `https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview/${taskId}`;
      console.log(`🔍 Polling URL (attempt ${i + 1}): ${pollUrl}`);

      const response = await fetch(pollUrl, {
        headers: {
          'x-freepik-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log(
        `📡 Response status: ${response.status} ${response.statusText}`
      );
      console.log(
        `📋 Response headers:`,
        Object.fromEntries(response.headers.entries())
      );

      // Check if response is OK
      if (!response.ok) {
        const responseText = await response.text();
        console.error('❌ Non-OK response:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText.substring(0, 500),
        });
        throw new Error(
          `Freepik API error ${response.status}: ${responseText.substring(0, 200)}`
        );
      }

      // Check content-type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('❌ Non-JSON response received:', {
          contentType,
          body: responseText.substring(0, 500),
        });
        throw new Error(
          `Expected JSON but received ${contentType}: ${responseText.substring(0, 200)}`
        );
      }

      const data = await response.json();

      console.log(`📊 Poll attempt ${i + 1}: Status = ${data.data?.status}`);

      if (data.data?.status === 'COMPLETED') {
        console.log('✅ Image generation completed!');
        return data.data.generated || [];
      }

      if (data.data?.status === 'FAILED') {
        console.error('❌ Failed response:', JSON.stringify(data, null, 2));
        throw new Error(
          `Freepik image generation failed: ${data.data?.message || 'Unknown error'}`
        );
      }

      // Wait 3 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('❌ Error polling task status:', error);

      // If it's a parsing error, log more details
      if (error instanceof SyntaxError) {
        console.error(
          '💥 JSON parsing failed - likely received HTML error page'
        );
        console.error('🔑 Check your FREEPIK_API_KEY environment variable');
        console.error('🔑 Current API key exists:', !!apiKey);
        console.error('🔑 API key length:', apiKey?.length || 0);
      }

      throw error;
    }
  }

  throw new Error('Freepik image generation timeout');
}

/**
 * Download image from URL and convert to base64
 */
async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  console.log('📥 Downloading image from URL...');
  const resp = await fetch(imageUrl);
  const buf = await resp.arrayBuffer();
  const base64Out = Buffer.from(buf).toString('base64');
  console.log('✅ Image downloaded and converted to base64');
  return base64Out;
}

/**
 * Extract domain from URL (remove protocol, www, paths, ports)
 */
function extractDomain(url: string): string {
  try {
    let domain = url.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.split('/')[0];
    domain = domain.split(':')[0];
    return domain;
  } catch (error) {
    console.error('Error extracting domain:', error);
    return url;
  }
}

/**
 * Fetch logo from PushOwl API and save to Supabase
 */
async function fetchAndSaveLogo(
  websiteUrl: string,
  projectId: string
): Promise<{
  logoUrl: string | null;
  logoBase64: string | null;
}> {
  try {
    const domain = extractDomain(websiteUrl);
    console.log(`🎨 Fetching logo for domain: ${domain}`);

    // Fetch from PushOwl API with increased timeout and retry logic
    const apiUrl = `https://getlogo.pushowl.com/api/${domain}`;
    const axios = (await import('axios')).default;

    let response;
    let attempts = 0;
    const maxAttempts = 2;

    // Retry logic for PushOwl API
    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(
          `📡 Attempt ${attempts}/${maxAttempts}: Fetching from PushOwl API...`
        );
        response = await axios.get(apiUrl, {
          timeout: 30000, // Increased to 30 seconds
          validateStatus: status => status < 500,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
        });
        console.log(`✅ PushOwl API responded successfully`);
        break; // Success, exit retry loop
      } catch (error: any) {
        if (
          attempts < maxAttempts &&
          (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
        ) {
          console.log(`⏳ Attempt ${attempts} timed out, retrying in 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw error; // Last attempt or non-timeout error
        }
      }
    }

    if (!response || (!response.data?.url && !response.data?.svg)) {
      console.log(`⚠️ No logo found for ${domain}`);
      return { logoUrl: null, logoBase64: null };
    }

    let logoBuffer: Buffer;
    let contentType: string;
    let fileExtension: string = 'png'; // Initialize with default

    if (response.data.url) {
      console.log(`📥 Downloading logo from: ${response.data.url}`);

      let logoResponse;
      let downloadAttempts = 0;
      const maxDownloadAttempts = 2;

      // Retry logic for logo download
      while (downloadAttempts < maxDownloadAttempts) {
        downloadAttempts++;
        try {
          console.log(
            `📡 Attempt ${downloadAttempts}/${maxDownloadAttempts}: Downloading logo file...`
          );
          logoResponse = await axios.get(response.data.url, {
            responseType: 'arraybuffer',
            timeout: 30000, // Increased to 30 seconds
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept:
                'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            },
          });
          console.log(`✅ Logo downloaded successfully`);
          break; // Success, exit retry loop
        } catch (error: any) {
          if (
            downloadAttempts < maxDownloadAttempts &&
            (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
          ) {
            console.log(
              `⏳ Download attempt ${downloadAttempts} timed out, retrying in 2s...`
            );
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw error; // Last attempt or non-timeout error
          }
        }
      }

      if (!logoResponse) {
        throw new Error('Failed to download logo after retries');
      }

      // Use original logo without any processing
      console.log('📥 Using original logo without modification...');
      logoBuffer = Buffer.from(logoResponse.data);
      contentType = logoResponse.headers['content-type'] || 'image/png';

      // Detect file extension from URL
      const urlLower = response.data.url.toLowerCase();
      if (urlLower.includes('.svg')) {
        fileExtension = 'svg';
        contentType = 'image/svg+xml';
      } else if (urlLower.includes('.png')) {
        fileExtension = 'png';
        contentType = 'image/png';
      } else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
        fileExtension = 'jpg';
        contentType = 'image/jpeg';
      } else if (urlLower.includes('.avif')) {
        fileExtension = 'avif';
        contentType = 'image/avif';
      } else if (urlLower.includes('.webp')) {
        fileExtension = 'webp';
        contentType = 'image/webp';
      } else {
        // Fallback: detect from content-type
        if (contentType.includes('svg')) {
          fileExtension = 'svg';
        } else if (contentType.includes('avif')) {
          fileExtension = 'avif';
        } else if (contentType.includes('webp')) {
          fileExtension = 'webp';
        } else if (
          contentType.includes('jpeg') ||
          contentType.includes('jpg')
        ) {
          fileExtension = 'jpg';
        } else {
          fileExtension = 'png'; // default
        }
      }

      const sizeKB = (logoBuffer.length / 1024).toFixed(2);
      console.log(`✅ Logo ready: ${fileExtension} format, size: ${sizeKB} KB`);
    } else if (response.data.svg) {
      console.log(`📥 Processing SVG logo`);
      logoBuffer = Buffer.from(response.data.svg, 'utf-8');
      contentType = 'image/svg+xml';
      fileExtension = 'svg';
    } else {
      return { logoUrl: null, logoBase64: null };
    }

    // Convert to base64 for Gemini reference
    const logoBase64 = logoBuffer.toString('base64');
    const sizeKB = (logoBase64.length / 1024).toFixed(2);
    console.log(`✅ Logo converted to Base64, size: ${sizeKB} KB`);

    // Save to Supabase
    const timestamp = Date.now();
    const fileName = `${projectId}/logos/${domain}-logo-${timestamp}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(fileName, logoBuffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      // Still return base64 even if upload fails
      return { logoUrl: null, logoBase64 };
    }

    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(fileName);

    console.log(`✅ Logo saved to Supabase: ${urlData.publicUrl}`);
    return {
      logoUrl: urlData.publicUrl,
      logoBase64,
    };
  } catch (error: any) {
    console.error('❌ Error fetching/saving logo:', error.message);
    return { logoUrl: null, logoBase64: null };
  }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToSupabase(
  imageData: string, // base64 string or data URL
  projectId: string,
  attemptNumber: number
): Promise<string | null> {
  try {
    let base64Data: string;

    // Handle both data URLs and raw base64
    if (imageData.startsWith('data:')) {
      base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    } else {
      base64Data = imageData;
    }

    const buffer = Buffer.from(base64Data, 'base64');

    const timestamp = Date.now();
    const fileName = `${projectId}/images/freepik-ad-${attemptNumber}-${timestamp}.png`;

    const { data, error } = await supabase.storage
      .from('project-files')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(data.path);

    console.log('✅ Image uploaded to Supabase:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('❌ Error uploading to Supabase:', err);
    return null;
  }
}

/**
 * Main API route
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

    console.log(
      '🚀 Starting ad generation with Freepik for project:',
      project_id
    );

    // Step 1: Fetch project from Supabase
    console.log('📊 Fetching project from Supabase...');
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

    // Step 2: Get screenshot from analysing_points
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
    if (!screenshotUrl) {
      return NextResponse.json(
        { error: 'No screenshot found. Please run analyzing-points first.' },
        { status: 400 }
      );
    }

    console.log('📸 Screenshot URL:', screenshotUrl);

    // Step 2.5: Extract logo from website using PushOwl API
    console.log('🎨 Extracting logo from website...');
    const { logoUrl, logoBase64 } = await fetchAndSaveLogo(
      websiteUrl,
      project_id
    );

    // Update url_analysis with logo URL if extracted
    if (logoUrl) {
      try {
        let currentUrlAnalysis = project.url_analysis || {};
        if (typeof currentUrlAnalysis === 'string') {
          currentUrlAnalysis = JSON.parse(currentUrlAnalysis);
        }

        const updatedUrlAnalysis = {
          ...currentUrlAnalysis,
          extracted_logo_url: logoUrl,
          logo_extraction_timestamp: new Date().toISOString(),
        };

        await supabase
          .from('projects')
          .update({ url_analysis: updatedUrlAnalysis })
          .eq('project_id', project_id);

        console.log('✅ Logo URL saved to project url_analysis');
      } catch (error) {
        console.error('⚠️ Failed to update url_analysis with logo:', error);
        // Continue even if update fails
      }
    }

    // Step 3: Analyze screenshot with GPT-4 Vision (OpenAI)
    const screenshotAnalysis = await analyzeScreenshot(screenshotUrl);

    // Step 3.5: Extract OG image from website URL if it's a product page
    let ogImage: string | null = null;

    if (screenshotAnalysis.isProductPage && screenshotAnalysis.hasMainProduct) {
      console.log(
        '🛍️ Product page detected! Extracting OG image with Cheerio...'
      );
      console.log('📦 Product:', screenshotAnalysis.mainProductDescription);

      try {
        // Scrape the website to get OG image
        const axios = (await import('axios')).default;
        const { load } = await import('cheerio');

        console.log('🌐 Fetching website:', websiteUrl);
        const { data: html } = await axios.get(websiteUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        });

        const $ = load(html);

        // Try multiple meta tags for product images
        ogImage =
          $('meta[property="og:image"]').attr('content') ||
          $('meta[property="og:image:secure_url"]').attr('content') ||
          $('meta[name="twitter:image"]').attr('content') ||
          $('meta[property="product:image"]').attr('content') ||
          $('link[rel="image_src"]').attr('href') ||
          null;

        if (ogImage) {
          // Make URL absolute if it's relative
          if (ogImage.startsWith('/')) {
            const urlObj = new URL(websiteUrl);
            ogImage = `${urlObj.protocol}//${urlObj.host}${ogImage}`;
          }

          // Validate that it's a proper URL
          try {
            new URL(ogImage);
            console.log('✅ OG Image extracted:', ogImage);

            // Optional: Test if image is accessible (quick HEAD request)
            try {
              const testResponse = await axios.head(ogImage, { timeout: 3000 });
              console.log(
                '✅ OG Image is accessible, content-type:',
                testResponse.headers['content-type']
              );
            } catch (testError) {
              console.warn('⚠️ OG Image may not be accessible:', ogImage);
              // Don't fail, just warn
            }
          } catch (urlError) {
            console.error('❌ Invalid OG Image URL:', ogImage);
            ogImage = null;
          }
        } else {
          console.log('⚠️ No OG image found in meta tags');
        }
      } catch (error) {
        console.error('❌ Failed to extract OG image:', error);
        // Continue even if extraction fails
      }
    } else {
      console.log('ℹ️ Not a product page or no main product detected');
    }

    // Convert OG image to Base64 for Freepik (more reliable than URL)
    let productReferenceImageBase64: string | null = null;

    if (ogImage) {
      try {
        console.log('📥 Downloading OG image to convert to Base64...');
        const axios = (await import('axios')).default;
        const imageResponse = await axios.get(ogImage, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        const imageBuffer = Buffer.from(imageResponse.data);
        const contentType = imageResponse.headers['content-type'];

        // Validate image format
        if (!contentType || !contentType.startsWith('image/')) {
          console.error(
            '❌ OG URL is not an image, content-type:',
            contentType
          );
          throw new Error('OG URL does not point to a valid image');
        }

        console.log('✅ Valid image format:', contentType);

        // Convert to base64
        productReferenceImageBase64 = imageBuffer.toString('base64');

        const sizeKB = (productReferenceImageBase64.length / 1024).toFixed(2);
        console.log('✅ OG image converted to Base64, size:', sizeKB, 'KB');

        // Check if image is too large (Freepik might have limits)
        if (imageBuffer.length > 10 * 1024 * 1024) {
          // 10MB
          console.warn(
            '⚠️ Warning: Reference image is quite large (>10MB), may cause issues'
          );
        }
      } catch (error) {
        console.error('❌ Failed to download/convert OG image:', error);
        // Continue without reference image
      }
    }

    const productReferenceImage = productReferenceImageBase64;

    // Step 4: Extract content from URL using Firecrawl
    const extracted = await extractContentFromUrl(websiteUrl);

    // Step 5: Generate ad concept with improved prompt structure
    console.log('📝 Generating ad concept with GPT-4...');

    const conceptGenerationPrompt = `Create 1 high-converting Facebook ad concept for this business.

**BUSINESS CONTEXT:**
Website: ${websiteUrl}
Business: ${extracted.businessDescription || 'Service/Product business'}
Target Audience: ${screenshotAnalysis.inferredAudience || 'General consumers'}

**BRAND IDENTITY (from website analysis):**
- Visual Style: ${screenshotAnalysis.visualElements}
- Color Palette: ${screenshotAnalysis.colorScheme}
- UI/UX Pattern: ${screenshotAnalysis.userInterface}
- Brand Voice: ${screenshotAnalysis.brandingElements}
- Page Type: ${screenshotAnalysis.pageType || 'unknown'}

**ASSETS AVAILABLE:**
${logoBase64 ? '✓ Company logo (will be auto-included as reference)' : '✗ No logo available'}
${productReferenceImage ? `✓ Real product image (${screenshotAnalysis.mainProductDescription})` : '✗ No product image available'}

**IMAGE GENERATION REQUIREMENTS:**
**CRITICAL: You must create ONE detailed image prompt (300-400 words) for a 1024x1024px SQUARE Facebook ad.**
**MANDATORY: The image MUST be square format (1024x1024 pixels) - NO horizontal banners, NO vertical formats.**

${
  productReferenceImage || logoBase64
    ? `**REFERENCE IMAGES PROVIDED:**
${productReferenceImage ? '- Real product image will be provided as reference' : ''}
${logoBase64 ? '- Company logo will be provided as reference' : ''}

Your prompt should focus on:
1. Scene composition and lifestyle context
2. 1-2 people (${screenshotAnalysis.inferredAudience || 'target demographic'}) naturally using/interacting with the product
3. Professional photography style (natural lighting, authentic expressions)
4. Color harmony matching: ${screenshotAnalysis.colorScheme}
5. Layout: balance product, people, and negative space

DO NOT describe the ${productReferenceImage ? 'product appearance or' : ''} ${logoBase64 ? 'logo' : ''} - they will be provided as reference images.
`
    : `**NO REFERENCE IMAGES:**
Your prompt must include:
1. Detailed product/service visualization
2. 1-2 people (${screenshotAnalysis.inferredAudience || 'target demographic'}) in authentic use scenario
3. Professional lifestyle photography style
4. Brand colors: ${screenshotAnalysis.colorScheme}
5. Complete scene description with all visual elements
`
}

**PEOPLE REQUIREMENTS (CRITICAL):**
- Show 1-2 people from target demographic actively using the product
- Natural features: realistic skin texture, genuine expressions, natural hair
- Authentic interaction: hands touching/holding product, engaged body language
- Emotional connection: joy, satisfaction, relief (matching product benefit)
- Diversity and relatability

**PHOTOGRAPHY STYLE:**
- Professional lifestyle shoot aesthetic
- Soft natural lighting (golden hour, window light, studio softbox)
- Shallow depth of field with product/person in focus
- Warm color grading matching brand palette
- Compositional balance: rule of thirds, leading lines
- AVOID: AI-generated perfection, stock photo clichés, harsh lighting

Return JSON:
{
  "analysis": {
    "business_type": "...",
    "target_audience": "...",
    "key_value_props": ["..."],
    "tone": "...",
    "brand_colors": "${screenshotAnalysis.colorScheme}",
    "visual_style": "${screenshotAnalysis.visualElements}"
  },
  "concepts": [
    {
      "headline": "Compelling headline under 40 chars",
      "primary_text": "150-200 char engaging copy with benefit and CTA",
      "cta": "Learn More|Shop Now|Get Started|Sign Up",
      "image_prompt": "DETAILED 300-400 word prompt for 1024x1024px square image..."
    }
  ]
}`;

    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: conceptGenerationPrompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = openaiResponse.choices[0].message.content || '{}';
    let conceptsData: any;

    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      conceptsData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      console.error('❌ Failed to parse GPT-4 response:', e);
      return NextResponse.json(
        { error: 'Failed to parse ad concept response', details: responseText },
        { status: 500 }
      );
    }

    if (!conceptsData?.concepts?.[0]) {
      return NextResponse.json(
        { error: 'Failed to generate ad concepts', data: conceptsData },
        { status: 500 }
      );
    }

    // Step 6: Enhanced image generation with Freepik
    const chosenConcept = conceptsData.concepts[0];
    let finalImageUrl: string | null = null;

    // Download blank canvas image for exact 1024x1024 dimensions
    let canvasImageBase64: string | null = null;
    try {
      console.log('📐 Downloading blank canvas image for 1024x1024...');
      canvasImageBase64 = await downloadImageAsBase64(
        'https://ghsgnjzkgygiqmhjvtpi.supabase.co/storage/v1/object/public/project-files/white-canvas-1024_1024.png'
      );
      console.log('✅ Canvas image downloaded and converted to base64');
    } catch (error) {
      console.warn('⚠️ Failed to download canvas image:', error);
    }

    // Prepare reference images (product + logo + canvas as LAST)
    const referenceImages: string[] = [];

    // Add product image if available
    if (productReferenceImage) {
      referenceImages.push(productReferenceImage);
      console.log('✅ Added product image as reference');
    }

    // Convert logo to PNG for Freepik compatibility (SVG/other formats not supported)
    if (logoBase64) {
      const logoPNG = await convertLogoToPNGForFreepik(logoBase64);
      if (logoPNG) {
        referenceImages.push(logoPNG);
        console.log('✅ Logo converted and added as reference image');
      } else {
        console.warn(
          '⚠️ Logo conversion failed, skipping logo reference image'
        );
      }
    }

    // Add blank canvas image as size reference (MUST BE LAST for Gemini 2.5 Flash)
    if (canvasImageBase64) {
      referenceImages.push(canvasImageBase64);
      console.log(
        '✅ Added blank canvas as LAST reference image for exact 1024x1024 size control'
      );
    }

    const hasProduct = !!productReferenceImage;
    const hasLogo = !!logoBase64;
    const finalReferenceImages =
      referenceImages.length > 0 ? referenceImages : undefined;

    // Build optimized prompt for Freepik Gemini 2.5 Flash
    let optimizedPrompt = '';

    if (finalReferenceImages) {
      // WITH REFERENCE IMAGES - Focus on composition and people
      optimizedPrompt = `**CRITICAL REQUIREMENT: GENERATE IMAGE AT EXACTLY 1024x1024 PIXELS - SQUARE FORMAT ONLY**

REFERENCE IMAGES:
${hasProduct ? '• Product image provided - use EXACT product as-is, no modifications' : ''}
${hasLogo ? `• Logo provided - place ${logoBase64 ? 'prominently in top-right corner OR center-top with 80% opacity overlay' : ''}` : ''}

SCENE COMPOSITION:
${chosenConcept.image_prompt}

HUMAN SUBJECTS (MANDATORY):
• ${screenshotAnalysis.inferredAudience || '1-2 people aged 25-35'}
• Natural facial features: subtle skin texture, authentic expressions, real hair movement
• Active product interaction: hands naturally holding/using ${hasProduct ? 'the reference product' : 'the product'}
• Genuine emotion: ${screenshotAnalysis.inferredAudience?.includes('professional') ? 'confident satisfaction' : 'joyful contentment'}

PHOTOGRAPHY DIRECTION:
• Lighting: soft window light, golden hour glow, or professional studio softbox
• Color grade: warm tones with ${screenshotAnalysis.colorScheme}
• Depth: f/2.8 aperture effect, background slightly blurred
• Framing: center-weighted, negative space for text overlay (top 20% clear)
• Style: lifestyle editorial, authentic not stock-photo, professional not amateur

LAYOUT FOR SQUARE AD (1024x1024px):
• Center: product + person interaction (60% of frame)
• Top 20%: clear area for headline text
• ${hasLogo ? 'Top-right corner: logo placement zone' : 'Bottom-right: branding space'}
• Rule of thirds: primary subject at intersection points

CANVAS INSTRUCTIONS:
Use the uploaded blank canvas image as the foundation for the final aspect ratio. Fill this canvas completely with the scene description while maintaining the exact square dimensions (1024x1024px) of the uploaded canvas.

**MANDATORY: Square 1024x1024 pixel format - NO horizontal banners, NO vertical formats**`;
    } else {
      // WITHOUT REFERENCE - Complete scene description
      optimizedPrompt = `**CRITICAL REQUIREMENT: GENERATE IMAGE AT EXACTLY 1024x1024 PIXELS - SQUARE FORMAT ONLY**

COMPLETE SCENE:
${chosenConcept.image_prompt}

PRODUCT/SERVICE VISUALIZATION:
• ${extracted.productDescription || 'Primary product/service offering'}
• Style: ${screenshotAnalysis.visualElements}
• Colors: ${screenshotAnalysis.colorScheme}
• Branding elements: ${screenshotAnalysis.brandingElements}

HUMAN SUBJECTS (MANDATORY):
• ${screenshotAnalysis.inferredAudience || '1-2 people aged 25-35'} representing target demographic
• Natural features: authentic skin texture, real expressions, genuine hair
• Interaction: actively using/benefiting from product
• Emotion: positive, relatable, authentic satisfaction

PROFESSIONAL PHOTOGRAPHY:
• Lighting: soft natural light, warm temperature (4500-5500K)
• Composition: rule of thirds, leading lines to product
• Depth: shallow focus (f/2.8), subject sharp, background soft
• Color: warm grade matching ${screenshotAnalysis.colorScheme}
• Style: lifestyle editorial, not stock photography

SQUARE AD LAYOUT (1024x1024px):
• Center: main subject + product (60% frame)
• Top 20%: negative space for headline
• Bottom: natural vignette
• Balance: 40% product, 40% person, 20% environment

CANVAS INSTRUCTIONS:
Use the uploaded blank canvas image as the foundation for the final aspect ratio. Fill this canvas completely with the scene description while maintaining the exact square dimensions (1024x1024px) of the uploaded canvas.

**MANDATORY: Square 1024x1024 pixel format - NO horizontal banners, NO vertical formats**`;
    }

    console.log(
      `🎨 Generating with Freepik (${hasProduct ? 'product' : ''}${hasProduct && hasLogo ? '+' : ''}${hasLogo ? 'logo' : 'text-only'} mode)...`
    );
    console.log(
      `📊 Sending ${referenceImages.length} reference image(s) to Freepik`
    );

    try {
      // Add final size instruction to ensure square format
      const finalImagePrompt = `${optimizedPrompt}

**FINAL REMINDER: Generate at EXACTLY 1024x1024 pixels - SQUARE FORMAT ONLY - NO horizontal banners or vertical formats**`;

      // Generate with Freepik
      const generationResult = await generateImageWithFreepik(
        finalImagePrompt,
        finalReferenceImages
      );

      // Poll and save
      const generatedImageUrls = await pollFreepikTaskStatus(
        generationResult.taskId
      );

      if (!generatedImageUrls || generatedImageUrls.length === 0) {
        throw new Error('No images generated from Freepik');
      }

      const freepikImageUrl = generatedImageUrls[0];
      const base64Image = await downloadImageAsBase64(freepikImageUrl);
      finalImageUrl = await uploadToSupabase(base64Image, project_id, 1);

      console.log('✅ 1024x1024 image generated and saved!');

      // Save the generated image URL to ai_images column
      if (finalImageUrl) {
        try {
          // Get existing ai_images
          const { data: projectData } = await supabase
            .from('projects')
            .select('ai_images')
            .eq('project_id', project_id)
            .single();

          let existingAiImages: string[] = [];
          if (projectData?.ai_images) {
            existingAiImages =
              typeof projectData.ai_images === 'string'
                ? JSON.parse(projectData.ai_images)
                : projectData.ai_images;
          }

          // Add new image URL
          const updatedAiImages = [...existingAiImages, finalImageUrl];

          // Update the database
          const { error: updateError } = await supabase
            .from('projects')
            .update({ ai_images: updatedAiImages })
            .eq('project_id', project_id);

          if (updateError) {
            console.error('❌ Failed to update ai_images:', updateError);
          } else {
            console.log('✅ AI image URL saved to ai_images column');
          }
        } catch (error) {
          console.error('❌ Error saving AI image URL:', error);
        }
      }
    } catch (error) {
      console.error('❌ Image generation failed:', error);
      throw error;
    }

    // Step 7: Return comprehensive response
    const response = {
      success: true,
      project_id,
      url: websiteUrl,
      screenshotUrl,
      screenshotAnalysis,
      logoExtraction:
        logoUrl || logoBase64
          ? {
              logoUrl: logoUrl,
              logoBase64Length: logoBase64?.length || 0,
              extractionMethod: 'pushowl-api',
              includedInGeneration: !!logoBase64,
              format: 'original',
            }
          : null,
      productExtraction: productReferenceImage
        ? {
            ogImageUrl: ogImage,
            ogImageBase64Length: productReferenceImage?.length || 0,
            productDescription: screenshotAnalysis.mainProductDescription,
            isProductPage: screenshotAnalysis.isProductPage,
            extractionMethod: 'cheerio-og-image-base64',
          }
        : null,
      extracted: {
        logoUrl: extracted.logoUrl,
        mainImageUrl: extracted.mainImageUrl,
        logoDescription: extracted.logoDescription,
        productDescription: extracted.productDescription,
        businessDescription: extracted.businessDescription,
      },
      analysis: conceptsData.analysis,
      chosenConcept,
      generation: {
        method: 'freepik-gemini-2.5-flash',
        finalImageUrl: finalImageUrl,
        usedRealProductImage: !!productReferenceImage,
        usedCompanyLogo: !!logoBase64,
        referenceImagesCount: referenceImages.length,
        referenceImageFormat: 'base64',
        ogImageUrl: ogImage,
        extractionMethod: 'cheerio-og-image-base64',
      },
      allConcepts: conceptsData.concepts,
    };

    console.log('🎉 Ad generation with Freepik complete!');
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('❌ Error in freepik-extract:', err);
    return NextResponse.json(
      { error: err.message || String(err), stack: err.stack },
      { status: 500 }
    );
  }
}
