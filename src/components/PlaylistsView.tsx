import { motion, AnimatePresence } from 'motion/react';
import { ListMusic, Plus, LayoutGrid, List } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PlaylistMeta, PlaylistTrack } from '../types';
import { fetchPlaylistTracks } from '../lib/supabase';
import PlaylistCard from './PlaylistCard';

interface PlaylistsViewProps {
  playlists: PlaylistMeta[];
  onPlaylistClick: (playlist: PlaylistMeta) => void;
  onCreatePlaylist: () => void;
}

interface PlaylistWithCounts extends PlaylistMeta {
  trackCount: number;
  coverUrls: string[];
}

export default function PlaylistsView({ playlists, onPlaylistClick, onCreatePlaylist }: PlaylistsViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [enrichedPlaylists, setEnrichedPlaylists] = useState<PlaylistWithCounts[]>([]);

  // Fetch track counts and cover URLs for each playlist
  useEffect(() => {
    async function enrich() {
      const enriched = await Promise.all(
        playlists.map(async (pl) => {
          const tracks = await fetchPlaylistTracks(pl.id);
          return {
            ...pl,
            trackCount: tracks.length,
            coverUrls: tracks
              .slice(0, 4)
              .map(t => t.track?.coverUrl)
              .filter(Boolean) as string[],
          };
        })
      );
      setEnrichedPlaylists(enriched);
    }
    enrich();
  }, [playlists]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="space-y-10"
    >
      {/* Header */}
      <header className="mobile-library-header flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)' }}>
            <ListMusic size={28} className="md:w-[40px] md:h-[40px] text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-spotify-text">Playlists</h2>
            <p className="text-xs font-bold text-spotify-text-muted uppercase tracking-widest opacity-60 mt-2">
              {playlists.length} {playlists.length === 1 ? 'Playlist' : 'Playlists'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* View toggle */}
          <div className="flex items-center bg-white/5 rounded-xl overflow-hidden border border-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-all ${viewMode === 'grid' ? 'bg-white/10 text-spotify-text' : 'text-spotify-text-muted hover:text-spotify-text'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 transition-all ${viewMode === 'list' ? 'bg-white/10 text-spotify-text' : 'text-spotify-text-muted hover:text-spotify-text'}`}
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={onCreatePlaylist}
            className="text-black px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
            style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--accent-glow)' }}
          >
            <Plus size={16} />
            New Playlist
          </button>
        </div>
      </header>

      {/* Content */}
      {enrichedPlaylists.length === 0 ? (
        <div className="text-center py-20">
          <ListMusic size={48} className="mx-auto text-spotify-text-muted opacity-20 mb-4" />
          <p className="text-spotify-text-muted text-lg font-medium mb-2">No playlists yet</p>
          <p className="text-spotify-text-muted text-sm opacity-60 mb-6">Create your first playlist to start curating your music.</p>
          <button
            onClick={onCreatePlaylist}
            className="text-black px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--accent-glow)' }}
          >
            <Plus size={16} />
            Create Playlist
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="mobile-track-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
          <AnimatePresence mode="popLayout">
            {enrichedPlaylists.map((pl, i) => (
              <PlaylistCard
                key={pl.id}
                playlist={pl}
                onClick={onPlaylistClick}
                trackCovers={pl.coverUrls}
                trackCount={pl.trackCount}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1">
          {enrichedPlaylists.map((pl, i) => (
            <motion.div
              key={pl.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onPlaylistClick(pl)}
              className="group flex items-center gap-3 md:gap-6 p-3 md:p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-lg">
                {pl.coverUrl ? (
                  <img src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover" />
                ) : pl.coverUrls.length > 0 ? (
                  <img src={pl.coverUrls[0]} alt={pl.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/30 to-emerald-500/30">
                    <ListMusic size={16} className="text-white/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-spotify-text truncate group-hover:text-spotify-green transition-colors">{pl.title}</h4>
                <p className="text-[10px] text-spotify-text-muted font-bold uppercase tracking-widest mt-0.5">
                  {pl.trackCount} {pl.trackCount === 1 ? 'track' : 'tracks'}
                </p>
              </div>
              <div className="text-right text-[10px] text-spotify-text-muted font-bold opacity-40">
                {new Date(pl.updatedAt).toLocaleDateString()}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
