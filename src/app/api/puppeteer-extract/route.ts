import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import puppeteer from 'puppeteer';

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PuppeteerExtractionRequest {
  project_id: string;
}

// Function to extract images using Puppeteer
async function extractImagesWithPuppeteer(url: string): Promise<
  Array<{
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    element: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>
> {
  console.log(`🌐 Launching browser for: ${url}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Extract all image elements with their positions
    const images = await page.evaluate(() => {
      const imageElements = Array.from(document.querySelectorAll('img'));

      return imageElements
        .map((img, index) => {
          const rect = img.getBoundingClientRect();
          return {
            src: img.src,
            alt: img.alt,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            element: {
              x: Math.round(rect.left + window.scrollX),
              y: Math.round(rect.top + window.scrollY),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          };
        })
        .filter(
          img =>
            // Filter out very small images, data URLs, and invalid images
            img.element.width > 50 &&
            img.element.height > 50 &&
            img.src.startsWith('http') &&
            !img.src.includes('data:')
        );
    });

    console.log(`📸 Found ${images.length} images with Puppeteer`);
    return images;
  } finally {
    await browser.close();
  }
}

// Function to classify images using ChatGPT Vision
async function classifyImagesWithVision(
  images: Array<{
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    element: { x: number; y: number; width: number; height: number };
  }>
): Promise<{
  logo?: string;
  products: string[];
  others: string[];
}> {
  console.log(`🤖 Classifying ${images.length} images with ChatGPT Vision...`);

  // Take screenshot of the page first
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Get the URL from the first image (assuming they're from the same page)
    const pageUrl = new URL(images[0].src).origin;
    await page.goto(pageUrl, { waitUntil: 'networkidle2' });

    // Take full page screenshot
    const screenshot = await page.screenshot({ fullPage: true });

    // Convert to base64 for ChatGPT Vision
    const screenshotBase64 = screenshot.toString('base64');
    const screenshotUrl = `data:image/png;base64,${screenshotBase64}`;

    const classificationPrompt = `
    Analyze this website screenshot and identify which of these image elements are:
    1. LOGO - Company/brand logo (choose the most prominent one)
    2. PRODUCTS - Product images for e-commerce
    3. OTHERS - Everything else (ads, icons, banners, etc.)

    Image elements found:
    ${images
      .map(
        (img, index) =>
          `${index + 1}. ${img.src} (alt: ${img.alt || 'none'}) - Position: (${img.element.x}, ${img.element.y}) Size: ${img.element.width}x${img.element.height}`
      )
      .join('\n')}

    Please respond with ONLY valid JSON in this exact format:
    {
      "logo": "image_src_if_logo_found",
      "products": ["product_src_1", "product_src_2", ...],
      "others": ["other_src_1", "other_src_2", ...]
    }

    Guidelines:
    - Choose the most prominent logo if multiple candidates
    - Focus on main product images, not small thumbnails
    - Be selective - prefer quality over quantity
    - If no logo found, omit the "logo" field
    - If no products found, return empty "products" array
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at analyzing website screenshots and identifying visual elements. Always respond with ONLY valid JSON, no markdown, no code blocks, no additional text.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: classificationPrompt,
            },
            {
              type: 'image_url',
              image_url: { url: screenshotUrl },
            },
          ],
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
  } finally {
    await browser.close();
  }
}

export async function POST(req: Request) {
  try {
    console.log('🎭 Starting Puppeteer extraction...');

    const { project_id }: PuppeteerExtractionRequest = await req.json();

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

    // Extract images using Puppeteer
    console.log(`📸 Extracting images with Puppeteer...`);
    const allImages = await extractImagesWithPuppeteer(websiteUrl);

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

    // Classify images using ChatGPT Vision
    console.log(`🤖 Classifying images...`);
    const classification = await classifyImagesWithVision(allImages);

    // Prepare results
    const extractedImages: Array<{
      type: 'logo' | 'product' | 'other';
      url: string;
      alt?: string;
      width?: number;
      height?: number;
      coordinates?: { x: number; y: number; width: number; height: number };
    }> = [];

    // Add logo if found
    if (classification.logo) {
      const logoImage = allImages.find(img => img.src === classification.logo);
      if (logoImage) {
        extractedImages.push({
          type: 'logo',
          url: logoImage.src,
          alt: logoImage.alt,
          width: logoImage.width,
          height: logoImage.height,
          coordinates: logoImage.element,
        });
      }
    }

    // Add products
    classification.products.forEach(productSrc => {
      const productImage = allImages.find(img => img.src === productSrc);
      if (productImage) {
        extractedImages.push({
          type: 'product',
          url: productImage.src,
          alt: productImage.alt,
          width: productImage.width,
          height: productImage.height,
          coordinates: productImage.element,
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
    console.error('❌ Error in Puppeteer extraction:', error);

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
