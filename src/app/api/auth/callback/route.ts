import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('OAuth error:', error.message);
      return NextResponse.redirect('/login?error=oauth_failed');
    }
  }

  return NextResponse.redirect('/dashboard');
}
