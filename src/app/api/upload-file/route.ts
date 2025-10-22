import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('project_id') as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: 'File and project_id are required' },
        { status: 400 }
      );
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${projectId}/uploaded-${timestamp}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(uploadData.path);

    // Update files column in projects table
    try {
      // Get current files array from database
      const { data: currentProject, error: fetchError } = await supabase
        .from('projects')
        .select('files')
        .eq('project_id', projectId)
        .single();

      if (fetchError) {
        console.error('Error fetching current project:', fetchError);
      } else {
        // Parse existing files or initialize empty array
        let files = [];
        if (currentProject?.files) {
          try {
            files =
              typeof currentProject.files === 'string'
                ? JSON.parse(currentProject.files)
                : currentProject.files;
          } catch (parseError) {
            console.error('Error parsing files:', parseError);
            files = [];
          }
        }

        // Add new file URL to array
        files.push(publicUrlData.publicUrl);

        // Update the files column
        const { error: updateError } = await supabase
          .from('projects')
          .update({ files: files })
          .eq('project_id', projectId);

        if (updateError) {
          console.error('Error updating files:', updateError);
        } else {
          console.log('✅ File URL saved to files column');
        }
      }
    } catch (error) {
      console.error('Error saving to files column:', error);
    }

    return NextResponse.json({
      success: true,
      fileUrl: publicUrlData.publicUrl,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error('Error in upload-file:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
