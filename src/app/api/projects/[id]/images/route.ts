import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('files, ai_images')
      .eq('project_id', params.id);

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const row = data[0];
    const filesCount = Array.isArray(row.files) ? row.files.length : 0;
    const aiImagesCount = Array.isArray(row.ai_images)
      ? row.ai_images.length
      : 0;

    return NextResponse.json({
      success: true,
      count: filesCount + aiImagesCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
