import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from './supabase';

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;


