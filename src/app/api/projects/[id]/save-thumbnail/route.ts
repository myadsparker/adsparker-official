import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { thumbnail_image_url } = await req.json();

    if (!thumbnail_image_url) {
      return NextResponse.json(
        { error: 'thumbnail_image_url is required' },
        { status: 400 }
      );
    }

    // Update the adset_thumbnail_image column in projects table
    const { error: updateError } = await supabase
      .from('projects')
      .update({ adset_thumbnail_image: thumbnail_image_url })
      .eq('project_id', projectId);

    if (updateError) {
      console.error('Error updating adset_thumbnail_image:', updateError);
      return NextResponse.json(
        { error: 'Failed to save thumbnail image' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Thumbnail image saved successfully',
      thumbnail_image_url,
    });
  } catch (error: any) {
    console.error('Error in save-thumbnail:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save thumbnail' },
      { status: 500 }
    );
  }
}
