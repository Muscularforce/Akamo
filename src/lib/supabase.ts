import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile } from '../types';

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

// ─── Profile Helpers ────────────────────────────────────────────────────────

/**
 * Fetch a user's profile from the `profiles` table.
 * Returns null if profile doesn't exist yet.
 */
export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

/**
 * Upsert a profile — creates it if missing, updates if exists.
 */
export async function upsertProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[Akamo] Profile upsert failed:', error);
    return null;
  }
  return data as UserProfile;
}

/**
 * Upload an avatar image and return the public URL.
 * Stores in the `songs` bucket under `avatars/{userId}.webp`.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `avatars/${userId}.${ext}`;

  const { error } = await supabase.storage
    .from('songs')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('[Akamo] Avatar upload failed:', error);
    return null;
  }

  const { data } = supabase.storage.from('songs').getPublicUrl(path);
  // Append cache-buster to force reload after update
  return `${data.publicUrl}?t=${Date.now()}`;
}
