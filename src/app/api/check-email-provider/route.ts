import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) throw error;

    const user = data.users.find(u => u.email === email);

    if (!user) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }

    const provider = user.app_metadata?.provider ?? 'email'; // fallback

    return NextResponse.json({ exists: true, provider });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
