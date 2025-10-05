import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { email, password, redirectTo } = await request.json();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // ✅ Send JSON back with redirect URL
  return NextResponse.json({ redirectTo: redirectTo || '/dashboard' });
}
