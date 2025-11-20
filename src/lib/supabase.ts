// lib/supabaseClient.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const supabaseUrl = 'https://ghsgnjzkgygiqmhjvtpi.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoc2duanprZ3lnaXFtaGp2dHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMjE2OTksImV4cCI6MjA2NTY5NzY5OX0.IFqbyxmYzCDZZEZpV0MIpPQWVxBplygWlnap1q97hcg';

// Create a cookie-aware client for client components
// This ensures session persistence across page navigation and matches middleware behavior
export const supabase = createClientComponentClient();
