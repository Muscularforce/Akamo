import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment at startup
const isMisconfigured = !supabaseUrl || !supabaseAnonKey
  || supabaseUrl === 'https://placeholder-url.supabase.co'
  || supabaseAnonKey === 'placeholder-key'
  || supabaseUrl.includes('your-project-ref');

if (isMisconfigured) {
  console.error(
    '%c[Akamo] Supabase is not configured.',
    'color: #ef4444; font-weight: bold',
    '\n\nCreate a .env file in the project root with:\n',
    'VITE_SUPABASE_URL=https://<your-project>.supabase.co\n',
    'VITE_SUPABASE_ANON_KEY=<your-anon-key>\n\n',
    'Get these from: https://supabase.com/dashboard → Settings → API'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

/** True if env vars are missing or placeholder values */
export const isSupabaseMisconfigured = isMisconfigured;
