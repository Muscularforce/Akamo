export type View = 'home' | 'explore' | 'library' | 'favorites' | 'auth' | 'verified' | 'account'
  | 'albums' | 'album-detail' | 'playlists' | 'playlist-detail' | 'social' | 'uploads' | 'admin-requests';

export interface UserProfile {
  id: string;
  display_name: string;
  username?: string;
  avatar_url: string | null;
  role: 'user' | 'owner';
  created_at?: string;
}

export interface UserStat {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'user' | 'owner';
  upload_count: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  audioPath?: string;
  coverPath?: string;
  duration: number; // in seconds
  type: 'audio' | 'video';
  uploadedAt: number;
  ownerId?: string;
  ownerEmail?: string;
  localId?: string;
  albumId?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre?: string;
  coverUrl?: string;
  coverPath?: string;
  ownerId?: string;
  createdAt?: string;
}

export interface AlbumTrack {
  id: string;
  albumId: string;
  trackId: string;
  trackNumber: number;
  track?: Track; // joined
}

export interface PlaylistMeta {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  coverPath?: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  trackId: string;
  position: number;
  addedAt: string;
  addedBy?: string;
  track?: Track; // joined
}

export interface Playlist {
  id: string;
  name: string;
  coverUrl: string;
  tracks: Track[];
}

/**
 * Playback context — tells the Player what queue it's currently playing from.
 */
export interface PlaybackContext {
  type: 'album' | 'playlist' | 'library' | 'single';
  id?: string;
  name?: string;
  tracks: Track[];
  currentIndex: number;
  isShuffled: boolean;
  /** The original (unshuffled) order, so we can un-shuffle. */
  originalOrder?: Track[];
}

export interface Notification {
  id: string;
  created_at: string;
  content: string;
  author_id: string;
}

export interface SongRequest {
  id: string;
  title: string;
  user_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
