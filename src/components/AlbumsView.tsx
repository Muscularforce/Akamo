import { motion, AnimatePresence } from 'motion/react';
import { Search, Disc3, Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Album } from '../types';
import AlbumCard from './AlbumCard';

interface AlbumsViewProps {
  albums: Album[];
  onAlbumClick: (album: Album) => void;
  onCreateAlbum?: () => void;
  canCreate?: boolean;
}

export default function AlbumsView({ albums, onAlbumClick, onCreateAlbum, canCreate }: AlbumsViewProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return albums;
    const q = search.toLowerCase();
    return albums.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.artist.toLowerCase().includes(q) ||
      (a.genre || '').toLowerCase().includes(q)
    );
  }, [albums, search]);

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
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl flex items-center justify-center flex-shrink-0 accent-glow" style={{ background: 'var(--accent-gradient)' }}>
            <Disc3 size={28} className="md:w-[40px] md:h-[40px] text-black" />
          </div>
          <div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-spotify-text">Albums</h2>
            <p className="text-xs font-bold text-spotify-text-muted uppercase tracking-widest opacity-60 mt-2">
              {albums.length} {albums.length === 1 ? 'Album' : 'Albums'}
            </p>
          </div>
        </div>

        {canCreate && onCreateAlbum && (
          <button
            onClick={onCreateAlbum}
            className="text-black px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl self-start md:self-auto"
            style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--accent-glow)' }}
          >
            <Plus size={16} />
            Create Album
          </button>
        )}
      </header>

      {/* Search */}
      <div className="relative max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-spotify-text-muted group-focus-within:text-spotify-green transition-colors" size={16} />
        <input
          type="text"
          placeholder="Search albums..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 bg-white/5 border border-white/5 rounded-xl pl-11 pr-4 text-sm font-medium text-spotify-text placeholder:text-spotify-text-muted focus:outline-none focus:bg-white/10 focus:border-white/10 transition-all focus:ring-2 focus:ring-spotify-green/20"
        />
      </div>

      {/* Grid */}
      <div className="mobile-track-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
        <AnimatePresence mode="popLayout">
          {filtered.map((album, i) => (
            <AlbumCard key={album.id} album={album} onClick={onAlbumClick} index={i} />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <Disc3 size={48} className="mx-auto text-spotify-text-muted opacity-20 mb-4" />
            <p className="text-spotify-text-muted text-lg font-medium">
              {search ? 'No albums match your search.' : 'No albums yet.'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
