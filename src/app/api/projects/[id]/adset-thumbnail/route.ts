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

    const supabase = createRouteHandlerClient({ cookies });

    const { data, error } = await supabase
      .from('projects')
      .select('adset_thumbnail_image')
      .eq('project_id', projectId) // match how your POST does it
      .single();

    if (error) throw error;

    return NextResponse.json({
      thumbnail: data?.adset_thumbnail_image || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
