// app/api/projects/[id]/route.ts

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate that id is a valid UUID
    if (!UUID_REGEX.test(params.id)) {
      console.error('❌ Invalid project ID format (not a UUID):', params.id);
      return NextResponse.json(
        { 
          error: 'Invalid project ID format',
          details: 'Project ID must be a valid UUID. Received: ' + params.id,
        },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user_id = session.user.id;

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', params.id)
    .eq('user_id', user_id)
    .single();

    if (error) {
      console.error('❌ Error fetching project:', error);
      return NextResponse.json(
        { 
          error: error.message || 'Failed to fetch project',
          details: error,
        }, 
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR in GET /api/projects/[id]:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
