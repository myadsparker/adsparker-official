// app/auth/logout/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/utils';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });

  // Sign out from Supabase
  await supabase.auth.signOut();

  // Clear all cookies by setting them to expire
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  // Create response with cleared cookies
  const response = NextResponse.json({ success: true });
  
  // Clear all cookies
  allCookies.forEach((cookie) => {
    response.cookies.set(cookie.name, '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  });

  // Also clear Supabase-specific cookies explicitly
  response.cookies.set('sb-access-token', '', {
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  
  response.cookies.set('sb-refresh-token', '', {
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return response;
}
