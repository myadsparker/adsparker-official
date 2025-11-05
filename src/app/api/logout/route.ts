// app/auth/logout/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/utils';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });

  await supabase.auth.signOut();

  const siteUrl = getSiteUrl();
  return NextResponse.redirect(new URL('/login', siteUrl));
}
