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

interface ProductExtractionResult {
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
    category: string;
    location: string;
    confidence: number;
    extractionInstructions: string;
  }>;
}

// Function to analyze and extract product coordinates
async function analyzeProductCoordinates(
  screenshotUrl: string
): Promise<ProductExtractionResult> {
  console.log(`🛍️ Analyzing product coordinates...`);

  const prompt = `
  Analyze this website screenshot and identify ALL visible products. This is for a product-based website.

  IMPORTANT: Look for actual product images, not just product categories or text. Focus on:
  - Product photos/images
  - Product thumbnails
  - Featured product displays
  - Product cards with images
  - Main product showcase images

  Exclude:
  - Navigation elements
  - Headers/footers
  - Text-only product listings
  - Category images without specific products

  Please respond with ONLY valid JSON in this exact format:
  {
    "productsDetected": true/false,
    "productCount": 0-10,
    "products": [
      {
        "id": 1,
        "coordinates": {
          "x": 0-1000,
          "y": 0-1000,
          "width": 100-800,
          "height": 100-800
        },
        "description": "detailed description of what the product is",
        "category": "product category (e.g., clothing, electronics, furniture)",
        "location": "where on the page this product is located",
        "confidence": 0.0-1.0,
        "extractionInstructions": "specific instructions for extracting this product image"
      }
    ]
  }

  Guidelines:
  - Be precise with coordinates
  - Include the entire product image with some padding
  - Focus on the main product image, not text or overlays
  - If multiple products are in a grid, extract each separately
  - Maximum 10 products to avoid overwhelming the response
  - Choose the most prominent/featured products if there are many
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert at analyzing e-commerce and product websites. Identify and locate actual product images with precise coordinates for extraction. Always respond with ONLY valid JSON, no markdown, no code blocks, no additional text.',
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
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const analysisText = response.choices[0]?.message?.content;
  console.log(`📝 Product coordinate analysis completed`);

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

// Function to generate product extraction instructions
async function generateProductExtractionInstructions(
  products: ProductExtractionResult['products']
): Promise<{
  overallInstructions: string;
  productInstructions: Array<{
    productId: number;
    instructions: string;
    cssClipPath: string;
    cropCoordinates: string;
    visualGuide: string;
  }>;
}> {
  console.log(`📋 Generating product extraction instructions...`);

  if (!products || products.length === 0) {
    return {
      overallInstructions: 'No products detected for extraction',
      productInstructions: [],
    };
  }

  const overallInstructions = `
  Product Extraction Overview:
  
  Found ${products.length} products on this page. Each product can be extracted individually using the coordinates provided below.
  
  General Guidelines:
  - Each product has specific coordinates (x, y, width, height)
  - Use image editing software or programmatic cropping
  - Include some padding around each product for better results
  - Products are listed in order of prominence on the page
  `;

  const productInstructions = products.map(product => {
    const { x, y, width, height } = product.coordinates;

    // CSS clip-path for web extraction
    const cssClipPath = `clip-path: rect(${y}px, ${x + width}px, ${y + height}px, ${x}px)`;

    // Crop coordinates for image processing tools
    const cropCoordinates = `x:${x}, y:${y}, width:${width}, height:${height}`;

    const instructions = `
    Product ${product.id} Extraction:
    
    1. MANUAL CROPPING:
       - Open the screenshot in an image editor
       - Select a rectangular area starting at position (${x}, ${y})
       - Make the selection ${width}px wide by ${height}px tall
       - Copy or crop this selection
    
    2. PROGRAMMATIC EXTRACTION:
       - Use image processing library (Canvas, ImageMagick, etc.)
       - Crop coordinates: ${cropCoordinates}
       - CSS clip-path: ${cssClipPath}
    
    3. PRODUCT DETAILS:
       - Description: ${product.description}
       - Category: ${product.category}
       - Location: ${product.location}
       - Confidence: ${Math.round(product.confidence * 100)}%
    `;

    const visualGuide = `
    Visual Guide for Product ${product.id}:
    - Look for ${product.description}
    - Located ${product.location}
    - Product area starts at ${x}px from the left, ${y}px from the top
    - Expected size: ${width}x${height} pixels
    - Category: ${product.category}
    `;

    return {
      productId: product.id,
      instructions,
      cssClipPath,
      cropCoordinates,
      visualGuide,
    };
  });

  return {
    overallInstructions,
    productInstructions,
  };
}

export async function POST(req: Request) {
  try {
    console.log('🛍️ Starting product-extraction API request...');

    // Check environment variables
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const { project_id } = await req.json();
    console.log(`📋 Request body parsed, project_id: ${project_id}`);

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
      console.error(`❌ Project not found:`, fetchError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Extract screenshot URL
    const analysingPoints = project.analysing_points;
    if (!analysingPoints?.parsingUrl?.screenshot) {
      return NextResponse.json(
        { error: 'No screenshot found. Please run analyzing-points first.' },
        { status: 400 }
      );
    }

    const screenshotUrl = analysingPoints.parsingUrl.screenshot;
    console.log(`📸 Screenshot URL found: ${screenshotUrl}`);

    // Analyze product coordinates
    console.log(`📋 Analyzing product coordinates...`);
    const productCoordinates = await analyzeProductCoordinates(screenshotUrl);

    // Generate extraction instructions
    console.log(`📋 Generating extraction instructions...`);
    const extractionInstructions = await generateProductExtractionInstructions(
      productCoordinates.products
    );

    console.log(`🎉 Product extraction analysis complete!`);

    return NextResponse.json({
      success: true,
      project_id,
      screenshot_url: screenshotUrl,
      productAnalysis: productCoordinates,
      extractionInstructions: extractionInstructions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in product extraction:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        error: 'Failed to extract products',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
