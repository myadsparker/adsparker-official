// app/api/projects/route.ts
import { supabase } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// create the project from entering url in the search
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();

  // Parse request body with better error handling
  let body;
  try {
    body = await req.json();
  } catch (parseError: any) {
    console.error('❌ JSON Parse Error:', parseError);
    return NextResponse.json(
      {
        error: 'Invalid JSON in request body',
        details: parseError.message,
        hint: 'Ensure you are sending valid JSON with Content-Type: application/json header',
      },
      { status: 400 }
    );
  }

  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: "Missing 'url'" }, { status: 400 });
  }

  // ✅ Get logged-in user's ID
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user_id = session.user.id;

  // ✅ Insert the project
  const { data, error } = await supabase
    .from('projects')
    .insert([
      {
        user_id,
        url_analysis: {
          website_url: url,
        },
        status: 'PENDING', // optional
        ad_set_proposals: [], // empty array initially
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.project_id });
}

// get data from project by project id
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('project_id', params.projectId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching project data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch project data' },
      { status: error.status || 500 }
    );
  }
}
