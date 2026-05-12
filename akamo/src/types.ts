export type View = 'home' | 'explore' | 'library' | 'favorites';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number; // in seconds
  type: 'audio' | 'video';
  uploadedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  coverUrl: string;
  tracks: Track[];
}
