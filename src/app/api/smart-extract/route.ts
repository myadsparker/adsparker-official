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

interface SmartExtractionRequest {
  project_id: string;
}

// Function to extract all images using Extract.pics API
async function extractAllImages(url: string): Promise<
  Array<{
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  }>
> {
  console.log(`🔍 Extracting all images from URL: ${url}`);

  try {
    // Note: You'll need to get an API key from extract.pics
    const response = await fetch(
      `https://api.extract.pics/v1/extract?url=${encodeURIComponent(url)}&api_key=${process.env.EXTRACT_PICS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Extract.pics API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.images || [];
  } catch (error) {
    console.error('❌ Error extracting images:', error);
    return [];
  }
}

// Function to classify images using ChatGPT Vision
async function classifyImages(
  images: Array<{
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  }>
): Promise<{
  logo?: string;
  products: string[];
  others: string[];
}> {
  console.log(`🤖 Classifying ${images.length} images with ChatGPT...`);

  const classificationPrompt = `
  I have extracted ${images.length} images from a website. Please analyze each image URL and classify them into:
  1. LOGO - Company/brand logo (should be 1 image max)
  2. PRODUCTS - Product images for e-commerce (clothing, electronics, etc.)
  3. OTHERS - Everything else (ads, icons, banners, etc.)

  Image URLs:
  ${images.map((img, index) => `${index + 1}. ${img.url}${img.alt ? ` (alt: ${img.alt})` : ''}${img.width && img.height ? ` (${img.width}x${img.height})` : ''}`).join('\n')}

  Please respond with ONLY valid JSON in this exact format:
  {
    "logo": "image_url_if_logo_found",
    "products": ["product_url_1", "product_url_2", ...],
    "others": ["other_url_1", "other_url_2", ...]
  }

  Guidelines:
  - Choose the most prominent logo if multiple candidates
  - Focus on main product images, not thumbnails or small icons
  - Be selective - prefer quality over quantity
  - If no logo found, omit the "logo" field
  - If no products found, return empty "products" array
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at analyzing website images and classifying them. Always respond with ONLY valid JSON, no markdown, no code blocks, no additional text.',
        },
        {
          role: 'user',
          content: classificationPrompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const classificationText = response.choices[0]?.message?.content;

    // Clean the response text
    let cleanedText = classificationText!;
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
    console.error('❌ Error classifying images:', error);
    return { products: [], others: [] };
  }
}

export async function POST(req: Request) {
  try {
    console.log('🧠 Starting smart extraction...');

    const { project_id }: SmartExtractionRequest = await req.json();

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
      .select('url_analysis')
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

    console.log(`🌐 Website URL: ${websiteUrl}`);

    // Extract all images using Extract.pics
    console.log(`📸 Extracting all images...`);
    const allImages = await extractAllImages(websiteUrl);

    if (allImages.length === 0) {
      return NextResponse.json({
        success: true,
        project_id,
        website_url: websiteUrl,
        message: 'No images found on the website',
        extractedImages: [],
        classification: { logo: null, products: [], others: [] },
      });
    }

    console.log(`📊 Found ${allImages.length} images`);

    // Classify images using ChatGPT
    console.log(`🤖 Classifying images...`);
    const classification = await classifyImages(allImages);

    // Prepare results
    const extractedImages: Array<{
      type: 'logo' | 'product' | 'other';
      url: string;
      alt?: string;
      width?: number;
      height?: number;
    }> = [];

    // Add logo if found
    if (classification.logo) {
      const logoImage = allImages.find(img => img.url === classification.logo);
      if (logoImage) {
        extractedImages.push({
          type: 'logo',
          url: logoImage.url,
          alt: logoImage.alt,
          width: logoImage.width,
          height: logoImage.height,
        });
      }
    }

    // Add products
    classification.products.forEach(productUrl => {
      const productImage = allImages.find(img => img.url === productUrl);
      if (productImage) {
        extractedImages.push({
          type: 'product',
          url: productImage.url,
          alt: productImage.alt,
          width: productImage.width,
          height: productImage.height,
        });
      }
    });

    console.log(
      `✅ Classification complete! Found ${extractedImages.length} relevant images`
    );

    return NextResponse.json({
      success: true,
      project_id,
      website_url: websiteUrl,
      totalImagesFound: allImages.length,
      extractedImages,
      classification: {
        logo: classification.logo || null,
        products: classification.products,
        others: classification.others,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in smart extraction:', error);

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
