import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ClassificationRequest {
  project_id: string;
}

// Function to extract images using Extract.pics API
async function extractImagesFromUrl(url: string): Promise<
  Array<{
    url: string;
    alt?: string;
  }>
> {
  console.log(`🔍 Extracting images from URL: ${url}`);

  try {
    const response = await fetch('https://api.extract.pics/v0/extractions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.EXTRACTAPIAUTHTOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Extract.pics API error: ${response.status} - ${response.statusText}`
      );
      console.error(`❌ Error details:`, errorText);
      throw new Error(
        `Extract.pics API error: ${response.status} - ${response.statusText}`
      );
    }

    const json = await response.json();
    console.log(`📊 Extract.pics response:`, JSON.stringify(json, null, 2));

    // Wait for extraction to complete (polling)
    let extractionId = json.data.id;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait time

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(
        `https://api.extract.pics/v0/extractions/${extractionId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXTRACTAPIAUTHTOKEN}`,
          },
        }
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error(
          `❌ Status check error: ${statusResponse.status} - ${statusResponse.statusText}`
        );
        console.error(`❌ Error details:`, errorText);
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      console.log(`📋 Extraction status:`, statusData.data.status);
      console.log(
        `📋 Full status response:`,
        JSON.stringify(statusData, null, 2)
      );

      if (statusData.data.status === 'completed') {
        const images = statusData.data.images || [];
        console.log(`✅ Extraction completed! Found ${images.length} images`);
        return images.map((img: any) => ({
          url: img.url,
          alt: img.alt || '',
        }));
      } else if (statusData.data.status === 'failed') {
        throw new Error('Extract.pics extraction failed');
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Extract.pics extraction timeout');
  } catch (error) {
    console.error('❌ Error extracting images:', error);
    return [];
  }
}

// Function to classify images using Hugging Face (free)
async function classifyImage(imageUrl: string): Promise<{
  isLogo: boolean;
  isProduct: boolean;
  confidence: number;
  description: string;
}> {
  try {
    // Using Hugging Face's free CLIP model
    const response = await fetch(
      'https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32',
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN || 'hf_public'}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          inputs: {
            image: imageUrl,
            text: [
              'company logo',
              'brand logo',
              'product image',
              'e-commerce product',
              'advertisement',
              'icon',
              'banner',
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const results = await response.json();

    // Analyze results to determine if it's a logo or product
    const logoKeywords = ['logo', 'brand'];
    const productKeywords = ['product', 'e-commerce'];

    let logoScore = 0;
    let productScore = 0;

    results.forEach((result: any) => {
      if (
        logoKeywords.some(keyword =>
          result.label.toLowerCase().includes(keyword)
        )
      ) {
        logoScore += result.score;
      }
      if (
        productKeywords.some(keyword =>
          result.label.toLowerCase().includes(keyword)
        )
      ) {
        productScore += result.score;
      }
    });

    const isLogo = logoScore > productScore && logoScore > 0.3;
    const isProduct = productScore > logoScore && productScore > 0.3;
    const confidence = Math.max(logoScore, productScore);

    return {
      isLogo,
      isProduct,
      confidence,
      description: results[0]?.label || 'Unknown',
    };
  } catch (error) {
    console.error('Error classifying image:', error);
    return {
      isLogo: false,
      isProduct: false,
      confidence: 0,
      description: 'Classification failed',
    };
  }
}

export async function POST(req: Request) {
  try {
    console.log('🔍 Starting image extraction and classification...');

    const { project_id }: ClassificationRequest = await req.json();

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch project from Supabase to get website URL
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

    // Extract images using Extract.pics API
    console.log(`📸 Extracting images from website...`);
    const images = await extractImagesFromUrl(websiteUrl);

    if (images.length === 0) {
      return NextResponse.json({
        success: true,
        project_id,
        website_url: websiteUrl,
        message: 'No images found on the website',
        classification: { logo: null, products: [], others: [] },
      });
    }

    console.log(`📊 Found ${images.length} images, now classifying...`);

    const classificationResults = await Promise.all(
      images.map(async (image, index) => {
        console.log(`🔍 Classifying image ${index + 1}: ${image.url}`);

        // Use Hugging Face for classification
        const result = await classifyImage(image.url);

        return {
          url: image.url,
          alt: image.alt,
          ...result,
          type: result.isLogo ? 'logo' : result.isProduct ? 'product' : 'other',
        };
      })
    );

    // Group results
    const logo = classificationResults.find(img => img.isLogo);
    const products = classificationResults.filter(img => img.isProduct);
    const others = classificationResults.filter(
      img => !img.isLogo && !img.isProduct
    );

    console.log(
      `✅ Classification complete! Found ${logo ? 1 : 0} logo, ${products.length} products, ${others.length} others`
    );

    return NextResponse.json({
      success: true,
      project_id,
      website_url: websiteUrl,
      totalImages: images.length,
      classification: {
        logo: logo || null,
        products: products,
        others: others,
      },
      summary: {
        logoFound: !!logo,
        productCount: products.length,
        otherCount: others.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in image classification:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        error: 'Failed to classify images',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
