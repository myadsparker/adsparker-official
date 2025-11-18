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
    const { thumbnail_image_url, adset_id } = await req.json();

    if (!thumbnail_image_url) {
      return NextResponse.json(
        { error: 'thumbnail_image_url is required' },
        { status: 400 }
      );
    }

    if (!adset_id) {
      return NextResponse.json(
        { error: 'adset_id is required' },
        { status: 400 }
      );
    }

    // Get current adset_thumbnail_image object
    const { data: projectData, error: fetchError } = await supabase
      .from('projects')
      .select('adset_thumbnail_image')
      .eq('project_id', projectId)
      .single();

    if (fetchError) {
      console.error('Error fetching project data:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch project data', details: fetchError.message },
        { status: 500 }
      );
    }

    console.log('Current thumbnail data type:', typeof projectData?.adset_thumbnail_image);
    console.log('Current thumbnail data:', JSON.stringify(projectData?.adset_thumbnail_image, null, 2));

    // Parse existing thumbnail object or create new one
    let thumbnailObject: Record<string, string> = {};
    
    if (projectData?.adset_thumbnail_image) {
      try {
        const rawData = projectData.adset_thumbnail_image;
        
        // Handle different data types from Supabase
        if (typeof rawData === 'string') {
          // Try to parse as JSON string first
          try {
            const parsed = JSON.parse(rawData);
            // If parsed successfully and it's an object
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              thumbnailObject = parsed;
            } else {
              // It's a plain string URL (old format)
              thumbnailObject = { default: rawData };
            }
          } catch (e) {
            // If parsing fails, it's a plain string URL (old format)
            thumbnailObject = { default: rawData };
          }
        } else if (typeof rawData === 'object' && rawData !== null) {
          // It's already an object (JSONB from Supabase)
          // Ensure it's a plain object, not an array
          if (!Array.isArray(rawData)) {
            thumbnailObject = rawData as Record<string, string>;
          } else {
            thumbnailObject = {};
          }
        }
      } catch (e) {
        console.error('Error parsing thumbnail object:', e);
        thumbnailObject = {};
      }
    }

    // Update thumbnail for this specific adset
    thumbnailObject[adset_id] = thumbnail_image_url;

    console.log('Thumbnail object to save:', JSON.stringify(thumbnailObject, null, 2));

    // Update the adset_thumbnail_image column in projects table
    // Ensure we're sending a clean object that Supabase can handle
    const updatePayload: any = {
      adset_thumbnail_image: thumbnailObject
    };

    console.log('Attempting update with payload:', JSON.stringify(updatePayload, null, 2));

    const { error: updateError, data: updateData } = await supabase
      .from('projects')
      .update(updatePayload)
      .eq('project_id', projectId)
      .select('adset_thumbnail_image')
      .single();

    if (updateError) {
      console.error('❌ Error updating adset_thumbnail_image:', updateError);
      console.error('Error code:', updateError.code);
      console.error('Error message:', updateError.message);
      console.error('Error details:', updateError.details);
      console.error('Error hint:', updateError.hint);
      console.error('Thumbnail object being saved:', JSON.stringify(thumbnailObject, null, 2));
      console.error('Adset ID:', adset_id);
      console.error('Thumbnail URL:', thumbnail_image_url);
      console.error('Project ID:', projectId);
      
      // Return detailed error for debugging
      return NextResponse.json(
        { 
          error: 'Failed to save thumbnail image',
          details: updateError.message || 'Unknown error',
          code: updateError.code,
          hint: updateError.hint,
          updateError: {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint
          },
          debug: {
            adset_id,
            thumbnail_url: thumbnail_image_url,
            project_id: projectId,
            thumbnail_object: thumbnailObject
          }
        },
        { status: 500 }
      );
    }

    console.log('✅ Successfully updated thumbnail:', JSON.stringify(updateData, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Thumbnail image saved successfully',
      thumbnail_image_url,
      adset_id,
    });
  } catch (error: any) {
    console.error('Error in save-thumbnail:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save thumbnail' },
      { status: 500 }
    );
  }
}
