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
  extractionType: 'logo' | 'products' | 'both';
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

export async function POST(req: Request) {
  try {
    console.log('🖼️ Starting image extraction API request...');

    const { project_id, extractionType = 'both' }: ExtractionRequest =
      await req.json();

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

    // Download the original screenshot
    console.log(`⬇️ Downloading screenshot...`);
    const screenshotBuffer = await downloadImage(screenshotUrl);

    const extractedImages: Array<{
      type: 'logo' | 'product';
      id?: number;
      url: string;
      coordinates: { x: number; y: number; width: number; height: number };
      description: string;
    }> = [];

    // Extract logo if requested
    if (extractionType === 'logo' || extractionType === 'both') {
      console.log(`🎯 Extracting logo...`);

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
        const logoAnalysis = logoData.logoAnalysis;

        if (logoAnalysis?.logoDetected && logoAnalysis?.logoCoordinates) {
          const logoCoordinates = logoAnalysis.logoCoordinates;

          const croppedLogoBuffer = await cropImage(
            screenshotBuffer,
            logoCoordinates
          );
          const logoUrl = await saveCroppedImage(
            croppedLogoBuffer,
            project_id,
            'logo.png'
          );

          extractedImages.push({
            type: 'logo',
            url: logoUrl,
            coordinates: logoCoordinates,
            description: logoAnalysis.logoDescription || 'Company logo',
          });
        }
      }
    }

    // Extract products if requested
    if (extractionType === 'products' || extractionType === 'both') {
      console.log(`🛍️ Extracting products...`);

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
          const croppedProductBuffer = await cropImage(
            screenshotBuffer,
            product.coordinates
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
            coordinates: product.coordinates,
            description: product.description,
          });
        }
      }
    }

    console.log(
      `🎉 Image extraction complete! Extracted ${extractedImages.length} images`
    );

    return NextResponse.json({
      success: true,
      project_id,
      screenshot_url: screenshotUrl,
      extractedImages,
      extractionType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in image extraction:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        error: 'Failed to extract images',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
