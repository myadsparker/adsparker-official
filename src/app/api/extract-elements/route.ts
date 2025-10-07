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

interface ExtractionRequest {
  project_id: string;
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

// Function to crop image using coordinates
async function cropImage(
  imageBuffer: Buffer,
  coordinates: { x: number; y: number; width: number; height: number }
): Promise<Buffer> {
  console.log(`Cropping image at coordinates:`, coordinates);

  try {
    const croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: coordinates.x,
        top: coordinates.y,
        width: coordinates.width,
        height: coordinates.height,
      })
      .png()
      .toBuffer();

    console.log(
      `✅ Successfully cropped image to ${coordinates.width}x${coordinates.height}`
    );
    return croppedBuffer;
  } catch (error) {
    console.error('❌ Error cropping image:', error);
    throw new Error(
      `Failed to crop image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Function to save cropped image to Supabase storage
async function saveCroppedImage(
  imageBuffer: Buffer,
  projectId: string,
  filename: string
): Promise<string> {
  const fileName = `${projectId}/extracted/${Date.now()}-${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload cropped image: ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage
    .from('project-files')
    .getPublicUrl(fileName);

  return publicData.publicUrl;
}

// Function to analyze screenshot and get coordinates
async function analyzeScreenshot(screenshotUrl: string): Promise<{
  logo?: {
    x: number;
    y: number;
    width: number;
    height: number;
    description: string;
  };
  products: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    description: string;
    id: number;
  }>;
}> {
  console.log(`🔍 Analyzing screenshot with ChatGPT Vision...`);

  const prompt = `
  Analyze this website screenshot and provide coordinates for:
  1. The main company LOGO (if visible)
  2. All visible PRODUCT images (if this is an e-commerce/product site)
  3. The main SERVICE image (if this is a service-based site)

  Please respond with ONLY valid JSON in this exact format:
  {
    "logo": {
      "x": 0-1000,
      "y": 0-1000,
      "width": 50-500,
      "height": 20-200,
      "description": "description of the logo"
    },
    "products": [
      {
        "id": 1,
        "x": 0-1000,
        "y": 0-1000,
        "width": 100-800,
        "height": 100-800,
        "description": "description of the product"
      }
    ]
  }

   Guidelines:
   - If no logo is visible, omit the "logo" field
   - If no products are visible, return empty "products" array
   - Be VERY precise with coordinates - this is critical for image cropping
   - Include padding around elements (add 10-20px on each side)
   - Focus on the main/featured elements only
   - Maximum 5 products to avoid overwhelming response
   - For logos: typically in top-left corner, header area, or navigation
   - For products: look for product grids, featured products, main product images
   - Avoid small icons, social media buttons, or decorative elements
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert at analyzing website screenshots and identifying visual elements. Provide precise coordinates for logo and product extraction. Always respond with ONLY valid JSON, no markdown, no code blocks, no additional text.',
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
    temperature: 0.1,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });

  const analysisText = response.choices[0]?.message?.content;
  console.log(`📝 Screenshot analysis completed`);

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

  const result = JSON.parse(cleanedText);
  return {
    logo: result.logo || undefined,
    products: result.products || [],
  };
}

export async function POST(req: Request) {
  try {
    console.log('🖼️ Starting element extraction from screenshot...');

    const { project_id }: ExtractionRequest = await req.json();

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch project from Supabase
    console.log(`📊 Fetching project from Supabase...`);
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('analysing_points')
      .eq('project_id', project_id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const screenshotUrl = project.analysing_points?.parsingUrl?.screenshot;
    if (!screenshotUrl) {
      return NextResponse.json(
        { error: 'No screenshot found. Please run analyzing-points first.' },
        { status: 400 }
      );
    }

    console.log(`📸 Screenshot URL found: ${screenshotUrl}`);

    // Download the screenshot
    console.log(`⬇️ Downloading screenshot...`);
    const screenshotBuffer = await downloadImage(screenshotUrl);

    // Analyze screenshot to get coordinates
    console.log(`🔍 Analyzing screenshot...`);
    const analysis = await analyzeScreenshot(screenshotUrl);

    const extractedImages: Array<{
      type: 'logo' | 'product';
      id?: number;
      url: string;
      description: string;
      coordinates: { x: number; y: number; width: number; height: number };
    }> = [];

    // Extract logo if found
    if (analysis.logo) {
      console.log(`🎯 Extracting logo...`);
      try {
        const croppedLogoBuffer = await cropImage(
          screenshotBuffer,
          analysis.logo
        );
        const logoUrl = await saveCroppedImage(
          croppedLogoBuffer,
          project_id,
          'logo.png'
        );

        extractedImages.push({
          type: 'logo',
          url: logoUrl,
          description: analysis.logo.description,
          coordinates: analysis.logo,
        });

        console.log(`✅ Logo extracted: ${logoUrl}`);
      } catch (error) {
        console.error('❌ Error extracting logo:', error);
      }
    }

    // Extract products if found
    if (analysis.products.length > 0) {
      console.log(`🛍️ Extracting ${analysis.products.length} products...`);
      for (const product of analysis.products) {
        try {
          const croppedProductBuffer = await cropImage(
            screenshotBuffer,
            product
          );
          const productUrl = await saveCroppedImage(
            croppedProductBuffer,
            project_id,
            `product-${product.id}.png`
          );

          extractedImages.push({
            type: 'product',
            id: product.id,
            url: productUrl,
            description: product.description,
            coordinates: product,
          });

          console.log(`✅ Product ${product.id} extracted: ${productUrl}`);
        } catch (error) {
          console.error(`❌ Error extracting product ${product.id}:`, error);
        }
      }
    }

    console.log(
      `🎉 Extraction complete! Extracted ${extractedImages.length} images`
    );

    return NextResponse.json({
      success: true,
      project_id,
      screenshot_url: screenshotUrl,
      extractedImages,
      analysis: {
        logoDetected: !!analysis.logo,
        productsDetected: analysis.products.length > 0,
        productCount: analysis.products.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in element extraction:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        error: 'Failed to extract elements',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
