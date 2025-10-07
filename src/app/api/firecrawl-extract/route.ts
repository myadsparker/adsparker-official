import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import sharp from 'sharp';

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FirecrawlExtractRequest {
  project_id: string;
}

// Function to extract images using Firecrawl API
async function extractImagesFromUrl(url: string): Promise<{
  logoUrl?: string;
  mainImageUrl?: string;
}> {
  console.log(`🔍 Extracting images from URL using Firecrawl: ${url}`);

  try {
    const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: [
          {
            type: 'json',
            prompt:
              "Extract and return the following as JSON: 1. The website logo URL (the main logo in the header or metadata). 2. The main image: - If this is a product page, return the main product image. - If this is a homepage or service page, return the hero or featured image. Respond with a JSON object with fields 'logo_url' and 'main_image_url'.",
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Firecrawl API error: ${response.status} - ${response.statusText}`
      );
      console.error(`❌ Error details:`, errorText);
      throw new Error(
        `Firecrawl API error: ${response.status} - ${response.statusText}`
      );
    }

    const json = await response.json();
    console.log(`📊 Firecrawl response:`, JSON.stringify(json, null, 2));

    if (json.success && json.data?.json) {
      const extractedData = json.data.json;
      console.log(`✅ Firecrawl extraction completed!`);
      console.log(`📋 Logo URL: ${extractedData.logo_url}`);
      console.log(`📋 Main Image URL: ${extractedData.main_image_url}`);

      return {
        logoUrl: extractedData.logo_url,
        mainImageUrl: extractedData.main_image_url,
      };
    } else {
      throw new Error('Invalid Firecrawl response format');
    }
  } catch (error) {
    console.error('❌ Error extracting images with Firecrawl:', error);
    return {};
  }
}

// Function to download image from URL
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Function to save image to Supabase storage (Buffer version)
async function saveImageToSupabase(
  imageBuffer: Buffer,
  projectId: string,
  filename: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('project-files')
    .upload(`${projectId}/${filename}`, imageBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to save image to Supabase: ${error.message}`);
  }

  const { data: publicData } = supabase.storage
    .from('project-files')
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

// Function to save base64 image to Supabase storage (same as generate-images route)
async function saveImageToSupabaseFromBase64(
  base64Image: string,
  projectId: string,
  filename: string
): Promise<string> {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    const timestamp = Date.now();
    const fileName = `${projectId}/${filename.replace('.png', `-${timestamp}.png`)}`;

    const { error } = await supabase.storage
      .from('project-files')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to save image to Supabase: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    throw new Error(
      `Failed to save base64 image: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

// Enhanced ChatGPT Vision analysis function (analyzing screenshot like analyzing-points)
async function analyzeWithChatGPTVision(
  screenshotUrl: string,
  logoUrl?: string,
  productImageUrl?: string
): Promise<{
  websiteType: 'product' | 'service';
  service?: string;
  product?: string;
  primaryColors: string[];
  brandTone: string;
  sceneAnalysis?: {
    sceneDescription: string;
    productPlacement: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    backgroundStyle: string;
    lighting: string;
    mood: string;
    lifestyleContext?: string;
    compositionNotes?: string;
    colorHarmony?: string;
  };
}> {
  console.log(`🤖 Analyzing website screenshot with ChatGPT Vision...`);

  const prompt = `
  Analyze this website screenshot and create a HIGH-QUALITY PROFESSIONAL MARKETING SCENE for the product.

  IMPORTANT: You are NOT generating an image. You are analyzing the screenshot and creating a scene description for marketing purposes.

  Logo URL: ${logoUrl || 'Not available'}
  Product Image URL: ${productImageUrl || 'Not available'}

  From the screenshot, analyze and create a PREMIUM MARKETING SCENE with these quality elements:

  1. WEBSITE TYPE: Is this a 'product' or 'service' based website?
  2. BUSINESS FOCUS: What is the main product or service?
  3. BRAND ANALYSIS: What are the primary colors and brand tone?
  4. PREMIUM SCENE CREATION: Create a high-quality, attractive marketing scene that includes:
     - Professional lifestyle environment (not just product shots)
     - Aspirational setting that connects to the brand values
     - Human element or lifestyle context when appropriate
     - Premium photography setup with proper lighting
     - Strategic composition for maximum visual impact
     - Exact product placement coordinates (x, y, width, height) for a 1024x1024 canvas
     - Professional lighting setup (studio quality, natural light, etc.)
     - Mood and atmosphere that creates emotional connection
     - Background elements that reinforce brand story
     - Color palette that complements the product
     - Depth of field and composition guidelines

  QUALITY STANDARDS TO ACHIEVE:
  - Professional photography aesthetic
  - Lifestyle integration (show the product in use or in aspirational context)
  - Warm, inviting lighting that creates emotional connection
  - Strategic use of props and environment to tell brand story
  - Balanced composition with clear focal points
  - Premium, high-end feel that justifies product value
  - Authentic human elements when relevant
  - Attention to detail in scene elements

  CRITICAL: Do NOT generate or return any images. Only provide scene analysis and coordinates.

  Respond with ONLY valid JSON in this exact format:
  {
    "websiteType": "product" | "service",
    "service": "service name if service-based",
    "product": "product name if product-based", 
    "primaryColors": ["color1", "color2", "color3"],
    "brandTone": "brand tone description",
    "sceneAnalysis": {
      "sceneDescription": "detailed premium marketing scene description with lifestyle context",
      "productPlacement": {
        "x": 100,
        "y": 200,
        "width": 400,
        "height": 500
      },
      "backgroundStyle": "professional background with lifestyle elements and brand story",
      "lighting": "professional lighting setup (studio/natural) with specific mood",
      "mood": "emotional atmosphere that creates desire and connection",
      "lifestyleContext": "how the product fits into aspirational lifestyle",
      "compositionNotes": "strategic positioning and visual hierarchy",
      "colorHarmony": "color scheme that complements product and brand"
    }
  }

  Guidelines:
  - Create scenes that look like premium advertising campaigns
  - Include lifestyle elements that make the product aspirational
  - Focus on emotional connection and brand story
  - Use professional photography principles
  - Make it look expensive and high-quality
  - If no product, omit sceneAnalysis field
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert marketing analyst and visual designer. Always respond with ONLY valid JSON, no markdown, no code blocks, no additional text.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: { url: screenshotUrl },
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const analysisText = response.choices[0]?.message?.content;

    // Clean the response text
    let cleanedText = analysisText!;
    if (cleanedText.includes('```json')) {
      cleanedText = cleanedText
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '');
    }
    if (cleanedText.includes('```')) {
      cleanedText = cleanedText.replace(/```\s*$/g, '');
    }
    cleanedText = cleanedText.trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('❌ Error analyzing with ChatGPT Vision:', error);
    throw new Error('Failed to analyze with ChatGPT Vision');
  }
}

// Function to create composite image with actual product in scene
async function createImageWithGPT(
  sceneAnalysis: {
    sceneDescription: string;
    backgroundStyle: string;
    lighting: string;
    mood: string;
    productPlacement: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    lifestyleContext?: string;
    compositionNotes?: string;
    colorHarmony?: string;
  },
  productInfo: string,
  projectId: string,
  actualProductImageUrl?: string
): Promise<string> {
  console.log(
    `🎨 Creating professional composite image with actual product in scene...`
  );

  try {
    if (!actualProductImageUrl) {
      throw new Error('No actual product image provided for composite');
    }

    // Step 1: Generate premium marketing background scene
    const backgroundPrompt = `
    Create a PREMIUM LIFESTYLE MARKETING SCENE for a ${productInfo} product.
    
    SCENE REQUIREMENTS:
    - ${sceneAnalysis.sceneDescription}
    - ${sceneAnalysis.backgroundStyle}
    - ${sceneAnalysis.lighting}
    - ${sceneAnalysis.mood}
    - ${sceneAnalysis.lifestyleContext || 'Aspirational lifestyle context'}
    - ${sceneAnalysis.compositionNotes || 'Strategic composition for maximum impact'}
    - ${sceneAnalysis.colorHarmony || 'Harmonious color scheme'}
    
    VISUAL SPECIFICATIONS:
    - 1024x1024 pixels
    - Premium advertising campaign quality
    - Lifestyle photography aesthetic
    - Warm, inviting atmosphere
    - Professional studio lighting setup
    - Strategic depth of field
    - Balanced composition with clear focal points
    - High-end, aspirational feel
    - Perfect for product placement
    - No product visible in background (leave space for product)
    - Authentic human elements when appropriate
    - Attention to detail in every element
    
    QUALITY STANDARDS:
    - Looks like it belongs in a premium magazine advertisement
    - Creates emotional connection and desire
    - Professional photography principles applied
    - Lifestyle integration that tells brand story
    - Premium, expensive aesthetic
    - Strategic use of props and environment
    - Warm, natural lighting with soft shadows
    
    Style: Premium lifestyle marketing photography, aspirational and high-end.
    `;

    console.log(`🎨 Generating professional background scene...`);

    // Generate background scene with gpt-image-1 (same as generate-images route)
    const backgroundResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: backgroundPrompt,
      size: '1024x1024',
      quality: 'medium',
      n: 1,
    });

    const backgroundData = backgroundResponse.data?.[0];
    if (!backgroundData) {
      throw new Error('Background scene not generated');
    }

    // Handle both base64 and URL responses (same as generate-images route)
    let backgroundBase64: string | undefined;
    if (backgroundData.b64_json) backgroundBase64 = backgroundData.b64_json;
    else if (backgroundData.url) {
      const resp = await fetch(backgroundData.url);
      const buf = await resp.arrayBuffer();
      backgroundBase64 = Buffer.from(buf).toString('base64');
    }

    if (!backgroundBase64) {
      throw new Error('No background image data from OpenAI');
    }

    // Convert base64 to buffer
    const cleanBase64 = backgroundBase64.replace(
      /^data:image\/[a-z]+;base64,/,
      ''
    );
    const backgroundBuffer = Buffer.from(cleanBase64, 'base64');

    // Step 2: Download and prepare the actual product image
    const productBuffer = await downloadImage(actualProductImageUrl);

    // Step 3: Resize product image to fit the placement coordinates
    const { x, y, width, height } = sceneAnalysis.productPlacement;

    const resizedProductBuffer = await sharp(productBuffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .png()
      .toBuffer();

    // Step 4: Create professional composite with shadows and blending
    const compositeBuffer = await sharp(backgroundBuffer)
      .composite([
        {
          input: resizedProductBuffer,
          top: y,
          left: x,
          blend: 'over', // Professional blending mode
        },
      ])
      .png()
      .toBuffer();

    // Step 5: Save the professional composite image
    const savedImageUrl = await saveImageToSupabase(
      compositeBuffer,
      projectId,
      'professional-product-scene.png'
    );

    console.log(
      `✅ Professional composite image created and saved: ${savedImageUrl}`
    );
    return savedImageUrl;
  } catch (error) {
    console.error('❌ Error creating professional composite:', error);
    throw new Error('Failed to create professional composite image');
  }
}

// Function to create composite image with Sharp
async function createCompositeImage(
  productImageUrl: string,
  sceneAnalysis: {
    sceneDescription: string;
    backgroundStyle: string;
    lighting: string;
    mood: string;
    productPlacement: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  },
  projectId: string
): Promise<string> {
  console.log(`🎨 Creating composite image with Sharp...`);

  try {
    // Download product image
    const productBuffer = await downloadImage(productImageUrl);

    // Create a 1080x1080 canvas (you can customize this)
    const canvasWidth = 1080;
    const canvasHeight = 1080;

    // Create background (you can customize this based on sceneAnalysis)
    const backgroundBuffer = await sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 3,
        background: { r: 240, g: 240, b: 240 }, // Light gray background
      },
    })
      .png()
      .toBuffer();

    // Resize product image to fit the placement coordinates
    const { x, y, width, height } = sceneAnalysis.productPlacement;

    const resizedProductBuffer = await sharp(productBuffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .png()
      .toBuffer();

    // Composite the product onto the background
    const compositeBuffer = await sharp(backgroundBuffer)
      .composite([
        {
          input: resizedProductBuffer,
          top: y,
          left: x,
        },
      ])
      .png()
      .toBuffer();

    // Save the composite image
    const compositeUrl = await saveImageToSupabase(
      compositeBuffer,
      projectId,
      'composite-product.png'
    );

    console.log(`✅ Composite image created and saved: ${compositeUrl}`);
    return compositeUrl;
  } catch (error) {
    console.error('❌ Error creating composite image:', error);
    throw new Error('Failed to create composite image');
  }
}

export async function POST(req: Request) {
  try {
    console.log('🔥 Starting Firecrawl extraction and analysis...');

    const { project_id }: FirecrawlExtractRequest = await req.json();

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch project from Supabase to get website URL and screenshot (like analyzing-points)
    console.log(`📊 Fetching project from Supabase...`);
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('url_analysis, analysing_points')
      .eq('project_id', project_id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const websiteUrl = project.url_analysis?.website_url;
    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'No website URL found. Please run analyzing-points first.' },
        { status: 400 }
      );
    }

    // Get screenshot from analysing_points (like analyzing-points does)
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

    console.log(`🌐 Website URL: ${websiteUrl}`);

    // Extract images using Firecrawl API
    console.log(`📸 Extracting images with Firecrawl...`);
    const extractedImages = await extractImagesFromUrl(websiteUrl);

    if (!extractedImages.logoUrl && !extractedImages.mainImageUrl) {
      return NextResponse.json({
        success: true,
        project_id,
        website_url: websiteUrl,
        message: 'No images found on the website',
        analysis: null,
      });
    }

    console.log(
      `📊 Found logo: ${!!extractedImages.logoUrl}, main image: ${!!extractedImages.mainImageUrl}`
    );

    // Save images to Supabase
    let savedLogoUrl: string | undefined;
    let savedMainImageUrl: string | undefined;

    if (extractedImages.logoUrl) {
      console.log(`💾 Saving logo to Supabase...`);
      const logoBuffer = await downloadImage(extractedImages.logoUrl);
      savedLogoUrl = await saveImageToSupabase(
        logoBuffer,
        project_id,
        'logo.png'
      );
    }

    if (extractedImages.mainImageUrl) {
      console.log(`💾 Saving main image to Supabase...`);
      const mainImageBuffer = await downloadImage(extractedImages.mainImageUrl);
      savedMainImageUrl = await saveImageToSupabase(
        mainImageBuffer,
        project_id,
        'main-product.png'
      );
    }

    // Enhanced ChatGPT Vision analysis using screenshot (like analyzing-points)
    console.log(`🤖 Running enhanced ChatGPT Vision analysis on screenshot...`);
    const analysis = await analyzeWithChatGPTVision(
      screenshotUrl,
      savedLogoUrl,
      savedMainImageUrl
    );

    // Create GPT-generated image if we have scene analysis
    let gptGeneratedImageUrl: string | undefined;
    if (
      analysis.sceneAnalysis &&
      analysis.websiteType === 'product' &&
      savedMainImageUrl
    ) {
      console.log(`🎨 Creating GPT-generated product scene...`);
      try {
        gptGeneratedImageUrl = await createImageWithGPT(
          analysis.sceneAnalysis,
          analysis.product || 'Product',
          project_id,
          savedMainImageUrl // Pass the actual product image
        );
        console.log(
          `✅ GPT image generated successfully: ${gptGeneratedImageUrl}`
        );
      } catch (error) {
        console.error(`❌ Professional composite creation failed:`, error);
        console.error(
          `❌ Error details:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
        // Continue without composite image - don't fail the entire request
      }
    } else {
      console.log(
        `⚠️ Skipping GPT image generation - missing scene analysis or not product type`
      );
    }

    // Create composite image if we have a product image and scene analysis
    let compositeImageUrl: string | undefined;
    if (
      savedMainImageUrl &&
      analysis.sceneAnalysis &&
      analysis.websiteType === 'product'
    ) {
      console.log(`🎨 Creating composite product scene...`);
      compositeImageUrl = await createCompositeImage(
        savedMainImageUrl,
        analysis.sceneAnalysis,
        project_id
      );
    }

    console.log(`✅ Analysis complete!`);

    return NextResponse.json({
      success: true,
      project_id,
      website_url: websiteUrl,
      extractedImages: {
        logoUrl: savedLogoUrl,
        mainImageUrl: savedMainImageUrl,
        compositeImageUrl: compositeImageUrl,
        gptGeneratedImageUrl: gptGeneratedImageUrl,
      },
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in Firecrawl extraction:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        error: 'Failed to extract and analyze images',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
