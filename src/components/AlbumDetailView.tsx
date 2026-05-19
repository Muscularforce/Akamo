import { motion, AnimatePresence } from 'motion/react';
import { Play, Shuffle, ArrowLeft, Clock, Music, MoreHorizontal, ListPlus, Settings, Trash2, X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Album, AlbumTrack, Track, PlaylistMeta } from '../types';
import { fetchAlbumTracks } from '../lib/supabase';
import { useComingSoon } from './ComingSoonToast';

interface AlbumDetailViewProps {
  album: Album;
  currentTrack: Track | null;
  onBack: () => void;
  onPlayAll: (tracks: Track[], albumName: string, albumId: string) => void;
  onShuffleAll: (tracks: Track[], albumName: string, albumId: string) => void;
  onPlayTrack: (track: Track, allTracks: Track[], albumName: string, albumId: string) => void;
  playlists: PlaylistMeta[];
  onAddToPlaylist: (trackId: string, playlistId: string) => void;
  onCreatePlaylistWithTrack?: (trackId: string) => void;
  isOwner?: boolean;
  onAlbumDeleted?: (albumId: string) => void;
  onRemoveTrackFromAlbum?: (trackId: string, albumId: string) => void;
}

function TrackRowMenu({
  track,
  playlists,
  onAddToPlaylist,
  onCreatePlaylistWithTrack,
}: {
  track: Track;
  playlists: PlaylistMeta[];
  onAddToPlaylist: (trackId: string, playlistId: string) => void;
  onCreatePlaylistWithTrack?: (trackId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const { triggerComingSoon } = useComingSoon();

  const updateMenuPos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.min(rect.right - 200, window.innerWidth - 212),
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPos();
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setShowPlaylists(false);
      }
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', () => { setOpen(false); setShowPlaylists(false); }, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', () => { setOpen(false); setShowPlaylists(false); }, true);
    };
  }, [open, updateMenuPos]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); setShowPlaylists(false); }}
        className="p-2 hover:bg-white/10 rounded-full transition-all text-spotify-text-muted hover:text-spotify-text opacity-0 group-hover:opacity-100 flex-shrink-0"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && createPortal(
        <div ref={menuRef} className="fixed z-[9999]" style={{ top: menuPos.top, left: menuPos.left }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="min-w-[200px] py-1.5 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-white/10"
            style={{
              background: 'linear-gradient(135deg, rgba(40, 40, 40, 0.98) 0%, rgba(25, 25, 25, 0.98) 100%)',
              backdropFilter: 'blur(40px)',
            }}
          >
            {!showPlaylists ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowPlaylists(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 transition-colors font-medium"
                >
                  <ListPlus size={16} className="text-white/50" />
                  <span>Add to Playlist</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpen(false); triggerComingSoon(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 transition-colors font-medium"
                >
                  <Music size={16} className="text-white/50" />
                  <span>Add to Queue</span>
                </button>
              </>
            ) : (
              <>
                <p className="px-4 py-2 text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest">Add to playlist</p>
                <div className="max-h-48 overflow-y-auto no-scrollbar">
                  {playlists.map(pl => (
                    <button
                      key={pl.id}
                      onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track.id, pl.id); setOpen(false); setShowPlaylists(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors font-medium truncate"
                    >
                      <span className="truncate">{pl.title}</span>
                    </button>
                  ))}
                </div>
                {onCreatePlaylistWithTrack && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpen(false); setShowPlaylists(false); onCreatePlaylistWithTrack(track.id); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-spotify-green hover:bg-white/10 transition-colors font-medium border-t border-white/5"
                  >
                    <span>+ Create New Playlist</span>
                  </button>
                )}
              </>
            )}
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function AlbumDetailView({
  album,
  currentTrack,
  onBack,
  onPlayAll,
  onShuffleAll,
  onPlayTrack,
  playlists,
  onAddToPlaylist,
  onCreatePlaylistWithTrack,
  isOwner,
  onAlbumDeleted,
  onRemoveTrackFromAlbum,
}: AlbumDetailViewProps) {
  const [albumTracks, setAlbumTracks] = useState<AlbumTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAlbumTracks(album.id).then(tracks => {
      setAlbumTracks(tracks);
      setLoading(false);
    });
  }, [album.id]);

  const handleDeleteAlbum = async () => {
    if (confirm('Are you sure you want to delete this album? This cannot be undone.')) {
      // In App.tsx we already passed deleteAlbum via onAlbumDeleted maybe? Actually no, App.tsx just filters the state.
      // Wait, we need to call deleteAlbum from supabase here, or in App.tsx. App.tsx passes onAlbumDeleted but doesn't call deleteAlbum itself!
      // I should import deleteAlbum here. Wait, deleteAlbum is not imported in AlbumDetailView.
      // I will import it at the top. Let's just call onAlbumDeleted(album.id) and assume it will be handled, OR I can handle it here.
    }
  };

  const tracks = albumTracks.filter(at => at.track).map(at => at.track!);
  const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs} hr ${mins} min`;
    return `${mins} min`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-8"
    >
      {/* Back */}
      <motion.button
        onClick={onBack}
        whileHover={{ x: -4 }}
        className="flex items-center gap-2 text-spotify-text-muted hover:text-spotify-text transition-colors text-sm font-medium"
      >
        <ArrowLeft size={18} />
        <span className="tracking-wide">Albums</span>
      </motion.button>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10 pb-8 border-b border-white/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
          className="w-48 h-48 md:w-56 md:h-56 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex-shrink-0"
        >
          {album.coverUrl ? (
            <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/30 to-spotify-green/30">
              <Music size={64} className="text-white/20" />
            </div>
          )}
        </motion.div>

        <div className="text-center md:text-left flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-spotify-text-muted mb-2">Album</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-spotify-text mb-2">{album.title}</h1>
          <p className="text-sm text-spotify-text-muted font-medium mb-4">
            <span className="text-spotify-text font-bold">{album.artist}</span>
            {album.year ? ` · ${album.year}` : ''}
            {album.genre ? ` · ${album.genre}` : ''}
          </p>
          <div className="flex items-center gap-2 text-xs text-spotify-text-muted opacity-60 justify-center md:justify-start">
            <span>{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</span>
            <span>·</span>
            <span>{formatTotalDuration(totalDuration)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-6 justify-center md:justify-start">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => tracks.length > 0 && onPlayAll(tracks, album.title, album.id)}
              className="flex items-center gap-2 text-black px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all accent-shimmer"
              style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--accent-glow)' }}
            >
              <Play fill="currentColor" size={16} />
              Play All
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => tracks.length > 0 && onShuffleAll(tracks, album.title, album.id)}
              className="flex items-center gap-2 text-spotify-text px-5 py-3 rounded-full text-xs font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 transition-all border border-white/10"
            >
              <Shuffle size={16} />
              Shuffle
            </motion.button>
            {isOwner && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-3 rounded-full transition-all ${showSettings ? 'bg-white/10 text-spotify-text' : 'text-spotify-text-muted hover:text-spotify-text hover:bg-white/5'}`}
              >
                <Settings size={18} />
              </button>
            )}
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="liquid-glass rounded-2xl p-4 space-y-3 border border-white/5">
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this album? This cannot be undone.')) {
                        const { deleteAlbum } = await import('../lib/supabase');
                        const success = await deleteAlbum(album.id);
                        if (success && onAlbumDeleted) onAlbumDeleted(album.id);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-red-500/10 rounded-xl transition-all text-red-400 font-medium"
                  >
                    <Trash2 size={16} />
                    <span>Delete Album</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tracklist */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-20">
          <Music size={48} className="mx-auto text-spotify-text-muted opacity-20 mb-4" />
          <p className="text-spotify-text-muted text-lg">This album has no tracks yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-0.5">
          {/* Header row */}
          <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] md:grid-cols-[2rem_1fr_1fr_auto_auto_auto] items-center gap-4 px-4 py-2 text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest border-b border-white/5">
            <span className="text-center">#</span>
            <span>Title</span>
            <span className="hidden md:block">Artist</span>
            <span className="flex items-center gap-1"><Clock size={12} /></span>
            <span className="w-8" />
            <span className="w-8" />
          </div>

          {albumTracks.map((at, i) => {
            if (!at.track) return null;
            const track = at.track;
            const isPlaying = currentTrack?.id === track.id;

            return (
              <motion.div
                key={at.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onPlayTrack(track, tracks, album.title, album.id)}
                className={`group grid grid-cols-[2rem_1fr_auto_auto_auto] md:grid-cols-[2rem_1fr_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer ${isPlaying ? 'bg-white/5' : ''}`}
              >
                {/* Track number / play icon */}
                <div className="flex items-center justify-center">
                  {isPlaying ? (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <span className="text-spotify-green text-xs font-bold">♪</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-spotify-text-muted font-medium group-hover:hidden">{at.trackNumber}</span>
                      <Play size={14} className="text-spotify-text hidden group-hover:block" fill="currentColor" />
                    </>
                  )}
                </div>

                {/* Title + cover */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-lg hidden sm:block">
                    <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="truncate">
                    <h4 className={`font-bold text-sm truncate transition-colors ${isPlaying ? 'text-spotify-green' : 'text-spotify-text group-hover:text-spotify-green'}`}>
                      {track.title}
                    </h4>
                  </div>
                </div>

                {/* Artist */}
                <div className="hidden md:block truncate text-xs text-spotify-text-muted font-medium opacity-60">
                  {track.artist}
                </div>

                {/* Duration */}
                <span className="text-xs text-spotify-text-muted font-medium opacity-60 tabular-nums">
                  {formatDuration(track.duration || 0)}
                </span>

                {/* Remove (if owner) */}
                {isOwner ? (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (onRemoveTrackFromAlbum) {
                        onRemoveTrackFromAlbum(track.id, album.id);
                        setAlbumTracks(prev => prev.filter(pt => pt.trackId !== track.id));
                      }
                    }}
                    className="p-1.5 hover:bg-red-500/10 rounded-full transition-all text-spotify-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <span />
                )}

                {/* Menu */}
                <TrackRowMenu
                  track={track}
                  playlists={playlists}
                  onAddToPlaylist={onAddToPlaylist}
                  onCreatePlaylistWithTrack={onCreatePlaylistWithTrack}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer — total track count and cumulative duration for quick reference */}
      {!loading && tracks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="pt-6 border-t border-white/5 flex items-center justify-between px-4"
        >
          <p className="text-xs text-spotify-text-muted font-medium opacity-60">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} · {formatTotalDuration(totalDuration)}
          </p>
          <p className="text-[10px] text-spotify-text-muted font-bold uppercase tracking-widest opacity-40">
            {album.artist}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
