export type View = 'home' | 'explore' | 'library' | 'favorites' | 'auth' | 'verified' | 'account';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'user' | 'owner';
  created_at?: string;
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
}

export interface Playlist {
  id: string;
  name: string;
  coverUrl: string;
  tracks: Track[];
}
