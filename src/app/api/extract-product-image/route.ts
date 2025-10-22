import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProductCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function POST(req: Request) {
  try {
    const { project_id, product_index = 0 } = await req.json();

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch project data
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('url_analysis')
      .eq('project_id', project_id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse url_analysis
    let urlAnalysis: any = project.url_analysis;
    if (typeof urlAnalysis === 'string') {
      try {
        urlAnalysis = JSON.parse(urlAnalysis);
      } catch {
        return NextResponse.json(
          { error: 'Invalid url_analysis format' },
          { status: 500 }
        );
      }
    }

    // Get product extraction data
    const productExtraction = urlAnalysis?.product_extraction;
    if (
      !productExtraction ||
      !productExtraction.productAnalysis ||
      !productExtraction.productAnalysis.products
    ) {
      return NextResponse.json(
        { error: 'No product extraction data found' },
        { status: 400 }
      );
    }

    const products = productExtraction.productAnalysis.products;
    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'No products found' }, { status: 400 });
    }

    if (product_index >= products.length) {
      return NextResponse.json(
        { error: `Product index ${product_index} out of range` },
        { status: 400 }
      );
    }

    const product = products[product_index];
    const coordinates: ProductCoordinates = product.coordinates;
    const screenshotUrl = productExtraction.screenshot_url;

    if (!screenshotUrl) {
      return NextResponse.json(
        { error: 'Screenshot URL not found' },
        { status: 400 }
      );
    }

    console.log('📸 Downloading screenshot from:', screenshotUrl);

    // Download the screenshot
    const response = await axios.get(screenshotUrl, {
      responseType: 'arraybuffer',
    });
    const screenshotBuffer = Buffer.from(response.data);

    console.log('✂️ Cropping product with coordinates:', coordinates);

    // Crop the product image
    const croppedBuffer = await sharp(screenshotBuffer)
      .extract({
        left: Math.round(coordinates.x),
        top: Math.round(coordinates.y),
        width: Math.round(coordinates.width),
        height: Math.round(coordinates.height),
      })
      .toBuffer();

    console.log('📦 Cropped product image size:', croppedBuffer.length);

    // Upload to Supabase Storage
    const fileName = `product-${project_id}-${product_index}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ad-images')
      .upload(fileName, croppedBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload product image' },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('ad-images').getPublicUrl(fileName);

    console.log('✅ Product image saved:', publicUrl);

    // Update url_analysis with the cropped product image URL
    const updatedUrlAnalysis = {
      ...urlAnalysis,
      cropped_product_image: publicUrl,
      cropped_product_description: product.description,
      cropped_product_category: product.category,
    };

    await supabase
      .from('projects')
      .update({ url_analysis: updatedUrlAnalysis })
      .eq('project_id', project_id);

    return NextResponse.json({
      success: true,
      project_id,
      product_image_url: publicUrl,
      product_description: product.description,
      product_category: product.category,
      coordinates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error extracting product image:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract product image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
