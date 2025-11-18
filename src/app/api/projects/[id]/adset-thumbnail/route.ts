// app/api/projects/[id]/adset-thumbnail/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { searchParams } = new URL(req.url);
    const adsetId = searchParams.get('adset_id');

    const supabase = createRouteHandlerClient({ cookies });

    const { data, error } = await supabase
      .from('projects')
      .select('adset_thumbnail_image')
      .eq('project_id', projectId)
      .single();

    if (error) throw error;

    if (!data?.adset_thumbnail_image) {
      return NextResponse.json({
        thumbnail: null,
      });
    }

    // Parse the thumbnail object
    let thumbnailObject: Record<string, string> = {};
    try {
      thumbnailObject = typeof data.adset_thumbnail_image === 'string'
        ? JSON.parse(data.adset_thumbnail_image)
        : data.adset_thumbnail_image;
    } catch (e) {
      // If it's a string (old format), return it for backward compatibility
      return NextResponse.json({
        thumbnail: data.adset_thumbnail_image,
      });
    }

    // If adset_id is provided, return thumbnail for that specific adset
    if (adsetId && thumbnailObject[adsetId]) {
      return NextResponse.json({
        thumbnail: thumbnailObject[adsetId],
      });
    }

    // If no adset_id provided, return the entire object
    // For backward compatibility, if object is empty or only has one key, return that value
    const keys = Object.keys(thumbnailObject);
    if (keys.length === 1) {
      return NextResponse.json({
        thumbnail: thumbnailObject[keys[0]],
      });
    }

    // Return the entire object
    return NextResponse.json({
      thumbnail: thumbnailObject,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
