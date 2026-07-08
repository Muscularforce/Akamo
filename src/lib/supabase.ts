import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, Album, AlbumTrack, PlaylistMeta, PlaylistTrack, Track, Notification, UserStat } from '../types';

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
 * Fetch all profiles (for admin use)
 */
export async function fetchAllProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('display_name');

  if (error) {
    console.error('[Akamo] fetchAllProfiles failed:', error);
    return [];
  }
  return data as UserProfile[];
}

/**
 * Upsert a profile — creates it if missing, updates if exists.
 */
export async function upsertProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url' | 'username'>>
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
 * Check if a username is available (true if available, false if taken)
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
    
  return !data;
}

/**
 * Fetch all tracks uploaded by a specific user
 */
export async function fetchUserTracks(userId: string): Promise<Track[]> {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .eq('ownerId', userId)
    .order('uploadedAt', { ascending: false });

  if (error) {
    console.error('[Akamo] fetchUserTracks failed:', error);
    return [];
  }
  return (data || []) as Track[];
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

/**
 * Upload a cover image and return the public URL and path.
 * Stores in the `songs` bucket under `covers/{userId}-{timestamp}.ext`.
 */
export async function uploadCover(userId: string, timestamp: number, file: File): Promise<{ path: string, url: string } | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `covers/${userId}-${timestamp}.${ext}`;

  const { error } = await supabase.storage
    .from('songs')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('[Akamo] Cover upload failed:', error);
    return null;
  }

  const { data } = supabase.storage.from('songs').getPublicUrl(path);
  return { path, url: data.publicUrl };
}

// ─── Album Helpers ──────────────────────────────────────────────────────────

/** Fetch all albums */
export async function fetchAlbums(): Promise<Album[]> {
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[Akamo] fetchAlbums failed:', error);
    return [];
  }
  return (data || []) as Album[];
}

/** Fetch a single album by ID */
export async function fetchAlbum(albumId: string): Promise<Album | null> {
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('id', albumId)
    .single();

  if (error || !data) return null;
  return data as Album;
}

/** Fetch tracks for an album, joined with track data, ordered by trackNumber */
export async function fetchAlbumTracks(albumId: string): Promise<AlbumTrack[]> {
  const { data, error } = await supabase
    .from('album_tracks')
    .select('*, track:tracks(*)')
    .eq('albumId', albumId)
    .order('trackNumber', { ascending: true });

  if (error) {
    console.error('[Akamo] fetchAlbumTracks failed:', error);
    return [];
  }

  // Flatten the joined track
  return (data || []).map((row: any) => ({
    id: row.id,
    albumId: row.albumId,
    trackId: row.trackId,
    trackNumber: row.trackNumber,
    track: row.track as Track,
  }));
}

/** Create a new album */
export async function createAlbum(album: Omit<Album, 'id' | 'createdAt'>): Promise<Album | null> {
  const { data, error } = await supabase
    .from('albums')
    .insert(album)
    .select()
    .single();

  if (error) {
    console.error('[Akamo] createAlbum failed:', error);
    return null;
  }
  return data as Album;
}

/** Delete an album */
export async function deleteAlbum(albumId: string): Promise<boolean> {
  const { error } = await supabase.from('albums').delete().eq('id', albumId);
  if (error) {
    console.error('[Akamo] deleteAlbum failed:', error);
    return false;
  }
  return true;
}

/** Update album metadata — mirrors updatePlaylist pattern */
export async function updateAlbum(
  albumId: string,
  updates: Partial<Pick<Album, 'title' | 'artist' | 'year' | 'genre' | 'coverUrl' | 'coverPath'>>
): Promise<Album | null> {
  const { data, error } = await supabase
    .from('albums')
    .update(updates)
    .eq('id', albumId)
    .select()
    .single();

  if (error) {
    console.error('[Akamo] updateAlbum failed:', error);
    return null;
  }
  return data as Album;
}

/** Add a track to an album — mirrors addTrackToPlaylist pattern */
export async function addTrackToAlbum(
  albumId: string,
  trackId: string
): Promise<boolean> {
  // Determine next track number by checking existing album tracks
  const { data: existing } = await supabase
    .from('album_tracks')
    .select('trackNumber')
    .eq('albumId', albumId)
    .order('trackNumber', { ascending: false })
    .limit(1);

  const nextNumber = (existing && existing.length > 0) ? existing[0].trackNumber + 1 : 1;

  const { error } = await supabase
    .from('album_tracks')
    .insert({ albumId, trackId, trackNumber: nextNumber });

  if (error) {
    // Duplicate — silently succeed, same as playlist pattern
    if (error.code === '23505') return true;
    console.error('[Akamo] addTrackToAlbum failed:', error);
    return false;
  }

  // Also set the albumId FK on the track itself for quick lookups
  await supabase.from('tracks').update({ albumId }).eq('id', trackId);

  return true;
}

/** Remove a track from an album */
export async function removeTrackFromAlbum(
  albumId: string,
  trackId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('album_tracks')
    .delete()
    .eq('albumId', albumId)
    .eq('trackId', trackId);

  if (error) {
    console.error('[Akamo] removeTrackFromAlbum failed:', error);
    return false;
  }

  // Clear the albumId FK on the track
  await supabase.from('tracks').update({ albumId: null }).eq('id', trackId);

  return true;
}

/** Sync album tracks — deletes existing and inserts new ones */
export async function syncAlbumTracks(
  albumId: string,
  trackIds: string[]
): Promise<boolean> {
  // 1. Delete existing tracks
  const { error: deleteError } = await supabase
    .from('album_tracks')
    .delete()
    .eq('albumId', albumId);

  if (deleteError) {
    console.error('[Akamo] syncAlbumTracks delete failed:', deleteError);
    return false;
  }

  // Clear FK from all tracks that used to belong to this album
  await supabase.from('tracks').update({ albumId: null }).eq('albumId', albumId);

  if (trackIds.length === 0) return true;

  // 2. Insert new tracks with their order
  const newTracks = trackIds.map((trackId, index) => ({
    albumId,
    trackId,
    trackNumber: index + 1
  }));

  const { error: insertError } = await supabase
    .from('album_tracks')
    .insert(newTracks);

  if (insertError) {
    console.error('[Akamo] syncAlbumTracks insert failed:', insertError);
    return false;
  }

  // 3. Set the albumId FK on the tracks
  const fkUpdates = trackIds.map(trackId => 
    supabase.from('tracks').update({ albumId }).eq('id', trackId)
  );
  await Promise.all(fkUpdates);

  return true;
}

// ─── Playlist Helpers ───────────────────────────────────────────────────────

/** Fetch all playlists for a user */
export async function fetchPlaylists(userId: string): Promise<PlaylistMeta[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('ownerId', userId)
    .order('updatedAt', { ascending: false });

  if (error) {
    console.error('[Akamo] fetchPlaylists failed:', error);
    return [];
  }
  return (data || []) as PlaylistMeta[];
}

export interface PlaylistWithCovers extends PlaylistMeta {
  trackCount: number;
  trackCovers: string[];
}

/** Fetch all public playlists with their track covers and count */
export async function fetchPublicPlaylists(): Promise<PlaylistWithCovers[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*, playlist_tracks( track:tracks(coverUrl) )')
    .eq('isPublic', true)
    .order('updatedAt', { ascending: false });

  if (error) {
    console.error('[Akamo] fetchPublicPlaylists failed:', error);
    return [];
  }

  return (data || []).map((row: any) => {
    // Extract cover URLs from the nested relation, ignoring nulls
    const covers = row.playlist_tracks
      .map((pt: any) => pt.track?.coverUrl)
      .filter(Boolean);
    
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      ownerId: row.ownerId,
      isPublic: row.isPublic,
      coverUrl: row.coverUrl,
      createdAt: row.createdAt,
      trackCount: row.playlist_tracks.length,
      trackCovers: covers.slice(0, 4), // first 4 for collage
    };
  });
}

/** Fetch a single playlist by ID */
export async function fetchPlaylist(playlistId: string): Promise<PlaylistMeta | null> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .single();

  if (error || !data) return null;
  return data as PlaylistMeta;
}

/** Fetch tracks for a playlist, joined with track data, ordered by position */
export async function fetchPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
  const { data, error } = await supabase
    .from('playlist_tracks')
    .select('*, track:tracks(*)')
    .eq('playlistId', playlistId)
    .order('position', { ascending: true });

  if (error) {
    console.error('[Akamo] fetchPlaylistTracks failed:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    playlistId: row.playlistId,
    trackId: row.trackId,
    position: row.position,
    addedAt: row.addedAt,
    addedBy: row.addedBy,
    track: row.track as Track,
  }));
}

/** Create a new playlist */
export async function createPlaylist(playlist: {
  title: string;
  description?: string;
  ownerId: string;
  isPublic?: boolean;
}): Promise<PlaylistMeta | null> {
  const { data, error } = await supabase
    .from('playlists')
    .insert({
      title: playlist.title,
      description: playlist.description || '',
      ownerId: playlist.ownerId,
      isPublic: playlist.isPublic ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error('[Akamo] createPlaylist failed:', error);
    return null;
  }
  return data as PlaylistMeta;
}

/** Update playlist metadata */
export async function updatePlaylist(
  playlistId: string,
  updates: Partial<Pick<PlaylistMeta, 'title' | 'description' | 'isPublic' | 'coverUrl' | 'coverPath'>>
): Promise<PlaylistMeta | null> {
  const { data, error } = await supabase
    .from('playlists')
    .update({ ...updates, updatedAt: new Date().toISOString() })
    .eq('id', playlistId)
    .select()
    .single();

  if (error) {
    console.error('[Akamo] updatePlaylist failed:', error);
    return null;
  }
  return data as PlaylistMeta;
}

/** Delete a playlist */
export async function deletePlaylist(playlistId: string): Promise<boolean> {
  const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
  if (error) {
    console.error('[Akamo] deletePlaylist failed:', error);
    return false;
  }
  return true;
}

/** Add a track to a playlist */
export async function addTrackToPlaylist(
  playlistId: string,
  trackId: string,
  userId: string
): Promise<boolean> {
  // Get current max position
  const { data: existing } = await supabase
    .from('playlist_tracks')
    .select('position')
    .eq('playlistId', playlistId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = (existing && existing.length > 0) ? existing[0].position + 1 : 0;

  const { error } = await supabase
    .from('playlist_tracks')
    .insert({
      playlistId,
      trackId,
      position: nextPosition,
      addedBy: userId,
    });

  if (error) {
    // Duplicate track — silently ignore
    if (error.code === '23505') return true;
    console.error('[Akamo] addTrackToPlaylist failed:', error);
    return false;
  }

  // Touch the playlist's updatedAt
  await supabase
    .from('playlists')
    .update({ updatedAt: new Date().toISOString() })
    .eq('id', playlistId);

  return true;
}

/** Remove a track from a playlist */
export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('playlist_tracks')
    .delete()
    .eq('playlistId', playlistId)
    .eq('trackId', trackId);

  if (error) {
    console.error('[Akamo] removeTrackFromPlaylist failed:', error);
    return false;
  }

  // Touch the playlist's updatedAt
  await supabase
    .from('playlists')
    .update({ updatedAt: new Date().toISOString() })
    .eq('id', playlistId);

  return true;
}

/** Reorder playlist tracks — updates positions for all tracks */
export async function reorderPlaylistTracks(
  playlistId: string,
  orderedTrackIds: string[]
): Promise<boolean> {
  // Update each track's position
  const updates = orderedTrackIds.map((trackId, index) =>
    supabase
      .from('playlist_tracks')
      .update({ position: index })
      .eq('playlistId', playlistId)
      .eq('trackId', trackId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(r => r.error);

  if (hasError) {
    console.error('[Akamo] reorderPlaylistTracks had errors');
    return false;
  }

  return true;
}

// ─── Notification Helpers ───────────────────────────────────────────────────

export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Akamo] fetchNotifications failed:', error);
    return [];
  }
  return data as Notification[];
}

export async function createNotification(content: string, authorId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .insert({ content, author_id: authorId });

  if (error) {
    console.error('[Akamo] createNotification failed:', error);
    return false;
  }
  return true;
}

// ─── Social Helpers ─────────────────────────────────────────────────────────

export async function fetchUserStats(): Promise<UserStat[]> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .order('upload_count', { ascending: false });

  if (error) {
    console.error('[Akamo] fetchUserStats failed:', error);
    return [];
  }
  return data as UserStat[];
}

// ─── Song Request Helpers ───────────────────────────────────────────────────

export async function createSongRequest(titles: string[], userName?: string): Promise<boolean> {
  const insertData = titles.map(title => ({
    title,
    user_name: userName || 'Anonymous',
    status: 'pending'
  }));

  const { error } = await supabase
    .from('song_requests')
    .insert(insertData);

  if (error) {
    console.error('[Akamo] createSongRequest failed:', error);
    return false;
  }
  return true;
}

export async function fetchSongRequests(): Promise<any[]> {
  const { data, error } = await supabase
    .from('song_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Akamo] fetchSongRequests failed:', error);
    return [];
  }
  return data || [];
}

export async function updateSongRequestStatus(id: string, status: 'approved' | 'rejected'): Promise<boolean> {
  const { error } = await supabase
    .from('song_requests')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('[Akamo] updateSongRequestStatus failed:', error);
    return false;
  }
  return true;
}
