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

interface ImageAnalysisResult {
  websiteType: 'product' | 'service';
  businessDetails: {
    service?: string;
    product?: string;
  };
  brandAnalysis: {
    primaryColors: string[];
    branding: string;
  };
  logoAnalysis: {
    logoDetected: boolean;
    logoDescription: string;
    logoLocation: string;
    logoExtractionInstructions: string;
    logoUrl?: string; // Added: actual cropped logo URL
  };
  productAnalysis?: {
    productsDetected: boolean;
    productCount: number;
    products: Array<{
      id: number;
      coordinates: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      description: string;
      location: string;
      extractionInstructions: string;
      productUrl?: string; // Added: actual cropped product URL
    }>;
  };
}

// AI function to analyze screenshot with ChatGPT Vision
async function analyzeScreenshotWithVision(
  screenshotUrl: string
): Promise<ImageAnalysisResult> {
  console.log(`🔍 Analyzing screenshot with ChatGPT Vision...`);

  const prompt = `
  Analyze this website screenshot and provide the following information in JSON format:

  1. Determine if this is a PRODUCT-based or SERVICE-based website
  2. If it's a service-based website, identify what specific service is offered
  3. If it's a product-based website, identify what specific product is offered
  4. Identify the primary colors used in the branding
  5. Analyze the overall branding and visual identity
  6. Detect and analyze the logo (company logo/brand mark)
  7. If PRODUCT-based, detect and analyze all visible products with their coordinates

  Please respond with ONLY valid JSON in this exact format:
  {
    "websiteType": "product" or "service",
    "businessDetails": {
      "service": "specific service name" (only if websiteType is "service"),
      "product": "specific product name" (only if websiteType is "product")
    },
    "brandAnalysis": {
      "primaryColors": ["color1", "color2", "color3"],
      "branding": "detailed description of the branding, visual style, and brand identity"
    },
    "logoAnalysis": {
      "logoDetected": true/false,
      "logoDescription": "detailed description of the logo including text, symbols, colors, style",
      "logoLocation": "description of where the logo is positioned on the page (top-left, header, center, etc.)",
      "logoExtractionInstructions": "specific instructions on how to extract/crop the logo from this image, including approximate coordinates or visual landmarks"
    },
    "productAnalysis": {
      "productsDetected": true/false,
      "productCount": 0-10,
      "products": [
        {
          "id": 1,
          "coordinates": {
            "x": 0-1000,
            "y": 0-1000,
            "width": 50-500,
            "height": 50-500
          },
          "description": "detailed description of the product",
          "location": "where the product is positioned on the page",
          "extractionInstructions": "specific instructions for extracting this product image"
        }
      ]
    }
  }

  Focus on:
  - Visual elements, layout, and design
  - Color scheme and branding
  - Content and messaging
  - Business model indicators
  - Professional appearance and style
  - Logo identification and positioning
  - Logo characteristics for extraction purposes
  - Product detection and positioning (if product-based)
  - Product image boundaries and coordinates
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert web analyst and brand strategist. Analyze website screenshots to determine business type, identify services/products, and analyze branding. Always respond with ONLY valid JSON, no markdown, no code blocks, no additional text.',
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
    temperature: 0.2,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });

  const analysisText = response.choices[0]?.message?.content;
  console.log(`📝 AI screenshot analysis completed`);

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

// Advanced function to extract logo with detailed instructions
async function extractLogoWithDetailedAnalysis(
  screenshotUrl: string,
  logoAnalysis: any
): Promise<{
  logoUrl?: string;
  extractionSuccess: boolean;
  extractionDetails: string;
}> {
  console.log(`🎯 Attempting logo extraction...`);

  if (!logoAnalysis.logoDetected) {
    return {
      extractionSuccess: false,
      extractionDetails: 'No logo detected in the analysis',
    };
  }

  const extractionPrompt = `
  Based on the previous logo analysis, I need you to help extract the logo from this website screenshot.
  
  Previous Analysis:
  - Logo Description: ${logoAnalysis.logoDescription}
  - Logo Location: ${logoAnalysis.logoLocation}
  - Extraction Instructions: ${logoAnalysis.logoExtractionInstructions}
  
  Please provide detailed extraction instructions including:
  1. Exact positioning (e.g., "top-left corner, 50px from left edge, 30px from top")
  2. Size estimates (e.g., "approximately 150px wide by 60px tall")
  3. Visual landmarks to help locate the logo
  4. Any surrounding elements that can help identify the logo boundaries
  
  Respond with a JSON object:
  {
    "extractionInstructions": "detailed step-by-step instructions for cropping the logo",
    "positioning": "exact position description",
    "size": "approximate dimensions",
    "landmarks": "visual landmarks to help locate the logo"
  }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at analyzing images and providing detailed extraction instructions. Focus on precise positioning and clear visual landmarks.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: extractionPrompt,
            },
            {
              type: 'image_url',
              image_url: { url: screenshotUrl },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const extractionText = response.choices[0]?.message?.content;
    const extractionInstructions = JSON.parse(extractionText!);

    return {
      extractionSuccess: true,
      extractionDetails: JSON.stringify(extractionInstructions),
    };
  } catch (error) {
    console.error('Logo extraction analysis failed:', error);
    return {
      extractionSuccess: false,
      extractionDetails: 'Failed to generate extraction instructions',
    };
  }
}

export async function POST(req: Request) {
  try {
    console.log('🔍 Starting image-analysis API request...');

    // Check environment variables first
    console.log('🔧 Checking environment variables...');
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
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

    const { project_id } = await req.json();
    console.log(`📋 Request body parsed, project_id: ${project_id}`);

    if (!project_id) {
      console.error('❌ No project_id provided in request');
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    console.log(`🚀 Starting image analysis for project: ${project_id}`);

    // 1️⃣ Fetch project from Supabase
    console.log(`📊 Step 1: Fetching project from Supabase...`);
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('analysing_points')
      .eq('project_id', project_id)
      .single();

    if (fetchError || !project) {
      console.error(`❌ Project not found:`, fetchError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 2️⃣ Extract screenshot URL from analysing_points
    const analysingPoints = project.analysing_points;
    if (!analysingPoints) {
      console.error(`❌ No analysing_points found in project`);
      return NextResponse.json(
        {
          error:
            'No analysing_points found. Please run analyzing-points first.',
        },
        { status: 400 }
      );
    }

    const screenshotUrl = analysingPoints.parsingUrl?.screenshot;
    if (!screenshotUrl) {
      console.error(`❌ No screenshot found in analysing_points`);
      return NextResponse.json(
        {
          error:
            'No screenshot found in analysing_points.parsingUrl.screenshot',
        },
        { status: 400 }
      );
    }

    console.log(`📸 Screenshot URL found: ${screenshotUrl}`);

    // 3️⃣ Analyze screenshot with ChatGPT Vision
    console.log(`📋 Step 2: Analyzing screenshot with ChatGPT Vision...`);
    const analysisResult = await analyzeScreenshotWithVision(screenshotUrl);

    // 4️⃣ Download the screenshot for cropping
    console.log(`📋 Step 3: Downloading screenshot for image extraction...`);
    const screenshotBuffer = await downloadImage(screenshotUrl);

    // 5️⃣ Extract logo image if detected
    if (analysisResult.logoAnalysis?.logoDetected) {
      console.log(`🎯 Step 4: Extracting logo image...`);
      try {
        // Get logo coordinates from logo-extraction API
        const logoAnalysisResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/logo-extraction`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id }),
          }
        );

        if (logoAnalysisResponse.ok) {
          const logoData = await logoAnalysisResponse.json();
          const logoCoordinates = logoData.logoAnalysis?.logoCoordinates;

          if (logoCoordinates) {
            const croppedLogoBuffer = await cropImage(
              screenshotBuffer,
              logoCoordinates
            );
            const logoUrl = await saveCroppedImage(
              croppedLogoBuffer,
              project_id,
              'logo.png'
            );
            analysisResult.logoAnalysis.logoUrl = logoUrl;
            console.log(`✅ Logo extracted successfully: ${logoUrl}`);
          }
        }
      } catch (error) {
        console.error('❌ Error extracting logo:', error);
      }
    }

    // 6️⃣ Extract product images if website is product-based
    if (
      analysisResult.websiteType === 'product' &&
      analysisResult.productAnalysis?.productsDetected
    ) {
      console.log(`🛍️ Step 5: Extracting product images...`);
      try {
        // Get product coordinates from product-extraction API
        const productAnalysisResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/product-extraction`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id }),
          }
        );

        if (productAnalysisResponse.ok) {
          const productData = await productAnalysisResponse.json();
          const products = productData.productAnalysis?.products || [];

          for (const product of products) {
            try {
              const croppedProductBuffer = await cropImage(
                screenshotBuffer,
                product.coordinates
              );
              const productUrl = await saveCroppedImage(
                croppedProductBuffer,
                project_id,
                `product-${product.id}.png`
              );

              // Find and update the product in analysisResult
              const productIndex =
                analysisResult.productAnalysis!.products.findIndex(
                  p => p.id === product.id
                );
              if (productIndex !== -1) {
                analysisResult.productAnalysis!.products[
                  productIndex
                ].productUrl = productUrl;
              }

              console.log(
                `✅ Product ${product.id} extracted successfully: ${productUrl}`
              );
            } catch (error) {
              console.error(
                `❌ Error extracting product ${product.id}:`,
                error
              );
            }
          }
        }
      } catch (error) {
        console.error('❌ Error extracting products:', error);
      }
    }

    console.log(`🎉 Image analysis and extraction complete!`);

    return NextResponse.json({
      success: true,
      project_id,
      screenshot_url: screenshotUrl,
      analysis: analysisResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in image analysis - Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    });

    // Return more specific error information
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        error: 'Failed to analyze image',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
