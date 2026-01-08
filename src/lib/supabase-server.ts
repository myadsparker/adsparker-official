// lib/supabase-server.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
};
