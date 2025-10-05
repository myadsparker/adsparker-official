import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
);

// ✅ Fetch files (used when modal opens or page reloads)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('files')
      .eq('project_id', params.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, files: data?.files || [] });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// ✅ Upload
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const formData = await req.formData();

    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('files')
      .eq('project_id', projectId)
      .single();
    if (fetchError) throw fetchError;

    const existingFiles: string[] = project?.files || [];
    const uploadedUrls: string[] = [];

    for (const [, value] of formData.entries()) {
      if (value instanceof File) {
        const fileExt = value.name.split('.').pop();
        const fileName = `${projectId}/${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, value, { contentType: value.type });
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('project-files')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicData.publicUrl);
      }
    }

    const updatedFiles = [...existingFiles, ...uploadedUrls];

    const { error: updateError } = await supabase
      .from('projects')
      .update({ files: updatedFiles })
      .eq('project_id', projectId);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, files: updatedFiles });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// ✅ Delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { fileUrl } = await req.json();
    const projectId = params.id;

    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('files')
      .eq('project_id', projectId)
      .single();
    if (fetchError) throw fetchError;

    const existingFiles: string[] = project?.files || [];
    const updatedFiles = existingFiles.filter(url => url !== fileUrl);

    const filePath = fileUrl.split('/project-files/')[1];
    if (filePath) {
      await supabase.storage.from('project-files').remove([filePath]);
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({ files: updatedFiles })
      .eq('project_id', projectId);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, files: updatedFiles });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // const {
    //   data: { user },
    //   error: authError,
    // } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json(
    //     { success: false, error: "Unauthorized" },
    //     { status: 401 }
    //   );
    // }

    const projectId = params.id;
    const { imageUrl } = await req.json();

    // Verify project ownership
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('user_id, files, ai_images')
      .eq('project_id', projectId)
      .single();

    if (fetchError) throw fetchError;
    // if (project?.user_id !== user.id) {
    //   return NextResponse.json(
    //     { success: false, error: "You don't own this project" },
    //     { status: 403 }
    //   );
    // }

    // Verify the image exists in either files or ai_images
    const isValidImage =
      (project.files && project.files.includes(imageUrl)) ||
      (project.ai_images && project.ai_images.includes(imageUrl));

    if (!isValidImage) {
      return NextResponse.json(
        { success: false, error: 'Invalid image URL' },
        { status: 400 }
      );
    }

    // Update the adset_thumbnail_image
    const { error: updateError } = await supabase
      .from('projects')
      .update({ adset_thumbnail_image: imageUrl })
      .eq('project_id', projectId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Thumbnail image saved successfully',
    });
  } catch (err: any) {
    console.error('Save thumbnail error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
