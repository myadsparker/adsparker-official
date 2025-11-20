// lib/supabaseClient.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const supabaseUrl = 'https://ghsgnjzkgygiqmhjvtpi.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoc2duanprZ3lnaXFtaGp2dHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMjE2OTksImV4cCI6MjA2NTY5NzY5OX0.IFqbyxmYzCDZZEZpV0MIpPQWVxBplygWlnap1q97hcg';

// Helper function to get a fresh client instance
// This ensures cookies are read properly on each call
export const getSupabaseClient = () => createClientComponentClient();

// Singleton instance for backward compatibility (but use getSupabaseClient() in new code)
// Create it fresh on the client side only
let clientInstance: ReturnType<typeof createClientComponentClient> | null = null;

export const supabase =
  typeof window !== 'undefined'
    ? (clientInstance = clientInstance || createClientComponentClient())
    : (createClientComponentClient() as any);
