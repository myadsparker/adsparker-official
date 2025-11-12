import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'fileUrl is required' },
        { status: 400 }
      );
    }

    // Get current files array from database
    const { data: currentProject, error: fetchError } = await supabase
      .from('projects')
      .select('files')
      .eq('project_id', projectId)
      .single();

    if (fetchError) {
      console.error('Error fetching current project:', fetchError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

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
    files.push(fileUrl);

    // Update the files column
    const { error: updateError } = await supabase
      .from('projects')
      .update({ files: files })
      .eq('project_id', projectId);

    if (updateError) {
      console.error('Error updating files:', updateError);
      return NextResponse.json(
        { error: 'Failed to update project files' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileUrl: fileUrl,
    });
  } catch (error: any) {
    console.error('Error in add-file API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

