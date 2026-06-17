import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Shuffle, ArrowLeft, Clock, Music, MoreHorizontal,
  GripVertical, X, Trash2, Settings, Globe, Lock, ListPlus, Search
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback, DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { PlaylistMeta, PlaylistTrack, Track } from '../types';
import {
  fetchPlaylistTracks, removeTrackFromPlaylist,
  reorderPlaylistTracks, updatePlaylist, deletePlaylist
} from '../lib/supabase';
import { useComingSoon } from './ComingSoonToast';

interface PlaylistDetailViewProps {
  playlist: PlaylistMeta;
  currentTrack: Track | null;
  onBack: () => void;
  onPlayAll: (tracks: Track[], name: string, playlistId: string) => void;
  onShuffleAll: (tracks: Track[], name: string, playlistId: string) => void;
  onPlayTrack: (track: Track, allTracks: Track[], name: string, playlistId: string) => void;
  onPlaylistUpdated: (playlist: PlaylistMeta) => void;
  onPlaylistDeleted: (playlistId: string) => void;
  onBrowseMusic: () => void;
}

export default function PlaylistDetailView({
  playlist,
  currentTrack,
  onBack,
  onPlayAll,
  onShuffleAll,
  onPlayTrack,
  onPlaylistUpdated,
  onPlaylistDeleted,
  onBrowseMusic,
}: PlaylistDetailViewProps) {
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleValue, setTitleValue] = useState(playlist.title);
  const [descValue, setDescValue] = useState(playlist.description);
  const [showSettings, setShowSettings] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);
  const { triggerComingSoon } = useComingSoon();

  const loadTracks = useCallback(async () => {
    setLoading(true);
    const tracks = await fetchPlaylistTracks(playlist.id);
    setPlaylistTracks(tracks);
    setLoading(false);
  }, [playlist.id]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  useEffect(() => {
    setTitleValue(playlist.title);
    setDescValue(playlist.description);
  }, [playlist]);

  const tracks = playlistTracks.filter(pt => pt.track).map(pt => pt.track!);

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

  // ─── Inline Editing ─────────────────────────────────

  const saveTitle = async () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue.trim() !== playlist.title) {
      const updated = await updatePlaylist(playlist.id, { title: titleValue.trim() });
      if (updated) onPlaylistUpdated(updated);
    } else {
      setTitleValue(playlist.title);
    }
  };

  const saveDesc = async () => {
    setEditingDesc(false);
    if (descValue.trim() !== playlist.description) {
      const updated = await updatePlaylist(playlist.id, { description: descValue.trim() });
      if (updated) onPlaylistUpdated(updated);
    }
  };

  // ─── Track Removal ──────────────────────────────────

  const handleRemoveTrack = async (trackId: string) => {
    const success = await removeTrackFromPlaylist(playlist.id, trackId);
    if (success) {
      setPlaylistTracks(prev => prev.filter(pt => pt.trackId !== trackId));
    }
  };

  // ─── Drag & Drop ────────────────────────────────────

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    const newOrder = [...playlistTracks];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(dropIdx, 0, moved);

    setPlaylistTracks(newOrder);
    setDragIdx(null);
    setDragOverIdx(null);

    // Persist new order
    const orderedTrackIds = newOrder.map(pt => pt.trackId);
    await reorderPlaylistTracks(playlist.id, orderedTrackIds);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // ─── Settings ───────────────────────────────────────

  const handleTogglePublic = async () => {
    const updated = await updatePlaylist(playlist.id, { isPublic: !playlist.isPublic });
    if (updated) onPlaylistUpdated(updated);
  };

  const handleDeletePlaylist = async () => {
    if (confirm('Are you sure you want to delete this playlist? This cannot be undone.')) {
      const success = await deletePlaylist(playlist.id);
      if (success) onPlaylistDeleted(playlist.id);
    }
  };

  // ─── Cover collage ─────────────────────────────────

  const coverCovers = tracks.slice(0, 4).map(t => t.coverUrl).filter(Boolean);

  const renderCover = () => {
    if (playlist.coverUrl) {
      return <img src={playlist.coverUrl} alt={playlist.title} className="w-full h-full object-cover" />;
    }
    if (coverCovers.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/30 to-emerald-500/30">
          <Music size={64} className="text-white/20" />
        </div>
      );
    }
    if (coverCovers.length < 4) {
      return <img src={coverCovers[0]} alt={playlist.title} className="w-full h-full object-cover" />;
    }
    return (
      <div className="w-full h-full grid grid-cols-2 grid-rows-2">
        {coverCovers.map((src, i) => (
          <img key={i} src={src} alt="" className="w-full h-full object-cover" />
        ))}
      </div>
    );
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
        <span className="tracking-wide">Playlists</span>
      </motion.button>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10 pb-8 border-b border-white/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
          className="w-48 h-48 md:w-56 md:h-56 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex-shrink-0"
        >
          {renderCover()}
        </motion.div>

        <div className="text-center md:text-left flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-spotify-text-muted mb-2">Playlist</p>

          {/* Editable Title */}
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              className="text-3xl md:text-5xl font-black tracking-tight text-spotify-text bg-transparent border-b-2 border-spotify-green focus:outline-none mb-2 w-full"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => { setEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 50); }}
              className="text-3xl md:text-5xl font-black tracking-tight text-spotify-text mb-2 cursor-pointer hover:text-spotify-green transition-colors"
            >
              {playlist.title}
            </h1>
          )}

          {/* Editable Description */}
          {editingDesc ? (
            <textarea
              ref={descInputRef}
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onBlur={saveDesc}
              rows={2}
              className="text-sm text-spotify-text-muted font-medium bg-transparent border-b border-white/20 focus:outline-none mb-4 w-full resize-none"
              autoFocus
            />
          ) : (
            <p
              onClick={() => { setEditingDesc(true); setTimeout(() => descInputRef.current?.focus(), 50); }}
              className="text-sm text-spotify-text-muted font-medium mb-4 cursor-pointer hover:text-spotify-text transition-colors"
            >
              {playlist.description || 'Add a description...'}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-spotify-text-muted opacity-60 justify-center md:justify-start">
            {playlist.isPublic ? <Globe size={12} /> : <Lock size={12} />}
            <span>{playlist.isPublic ? 'Public' : 'Private'}</span>
            <span>·</span>
            <span>{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</span>
            <span>·</span>
            <span>{formatTotalDuration(totalDuration)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-6 justify-center md:justify-start flex-wrap">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => tracks.length > 0 && onPlayAll(tracks, playlist.title, playlist.id)}
              disabled={tracks.length === 0}
              className="flex items-center gap-2 text-black px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all accent-shimmer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--accent-glow)' }}
            >
              <Play fill="currentColor" size={16} />
              Play All
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => tracks.length > 0 && onShuffleAll(tracks, playlist.title, playlist.id)}
              disabled={tracks.length === 0}
              className="flex items-center gap-2 text-spotify-text px-5 py-3 rounded-full text-xs font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 transition-all border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Shuffle size={16} />
              Shuffle
            </motion.button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-full transition-all ${showSettings ? 'bg-white/10 text-spotify-text' : 'text-spotify-text-muted hover:text-spotify-text hover:bg-white/5'}`}
            >
              <Settings size={18} />
            </button>
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
                    onClick={handleTogglePublic}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-white/5 rounded-xl transition-all text-spotify-text font-medium"
                  >
                    {playlist.isPublic ? <Lock size={16} /> : <Globe size={16} />}
                    <span>{playlist.isPublic ? 'Make Private' : 'Make Public'}</span>
                  </button>
                  <button
                    onClick={handleDeletePlaylist}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-red-500/10 rounded-xl transition-all text-red-400 font-medium"
                  >
                    <Trash2 size={16} />
                    <span>Delete Playlist</span>
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
          <p className="text-spotify-text-muted text-lg font-medium mb-2">This playlist is empty</p>
          <p className="text-spotify-text-muted text-sm opacity-60 mb-6">Start adding tracks to build your playlist.</p>
          <button
            onClick={onBrowseMusic}
            className="text-black px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--accent-glow)' }}
          >
            <Search size={16} />
            Browse Music
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-0.5">
          {/* Header row */}
          <div className="grid grid-cols-[1.5rem_2rem_1fr_auto_auto_auto] md:grid-cols-[1.5rem_2rem_1fr_1fr_auto_auto_auto] items-center gap-3 px-4 py-2 text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest border-b border-white/5">
            <span />
            <span className="text-center">#</span>
            <span>Title</span>
            <span className="hidden md:block">Album</span>
            <span className="flex items-center gap-1"><Clock size={12} /></span>
            <span className="w-8" />
            <span className="w-8" />
          </div>

          {playlistTracks.map((pt, i) => {
            if (!pt.track) return null;
            const track = pt.track;
            const isPlaying = currentTrack?.id === track.id;
            const isDragging = dragIdx === i;
            const isDragOver = dragOverIdx === i;

            return (
              <motion.div
                key={pt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e: any) => handleDragOver(e, i)}
                onDrop={(e: any) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                onClick={() => onPlayTrack(track, tracks, playlist.title, playlist.id)}
                className={`group grid grid-cols-[1.5rem_2rem_1fr_auto_auto_auto] md:grid-cols-[1.5rem_2rem_1fr_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer ${isPlaying ? 'bg-white/5' : ''} ${isDragging ? 'opacity-40 scale-[0.98]' : ''} ${isDragOver ? 'border-t-2 border-spotify-green' : ''}`}
              >
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-spotify-text-muted opacity-0 group-hover:opacity-50 transition-opacity">
                  <GripVertical size={14} />
                </div>

                {/* Track number / play icon */}
                <div className="flex items-center justify-center">
                  {isPlaying ? (
                    <span className="text-spotify-green text-xs font-bold">♪</span>
                  ) : (
                    <>
                      <span className="text-xs text-spotify-text-muted font-medium group-hover:hidden">{i + 1}</span>
                      <Play size={14} className="text-spotify-text hidden group-hover:block" fill="currentColor" />
                    </>
                  )}
                </div>

                {/* Title + cover */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg overflow-hidden shrink-0 shadow-lg">
                    <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="truncate">
                    <h4 className={`font-bold text-sm truncate transition-colors ${isPlaying ? 'text-spotify-green' : 'text-spotify-text group-hover:text-spotify-green'}`}>
                      {track.title}
                    </h4>
                    <p className="text-[10px] text-spotify-text-muted font-medium truncate">{track.artist}</p>
                  </div>
                </div>

                {/* Album */}
                <div className="hidden md:block truncate text-xs text-spotify-text-muted font-medium opacity-60">
                  {track.album || '—'}
                </div>

                {/* Duration */}
                <span className="text-xs text-spotify-text-muted font-medium opacity-60 tabular-nums">
                  {formatDuration(track.duration || 0)}
                </span>

                {/* Remove */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveTrack(track.id); }}
                  className="p-1.5 hover:bg-red-500/10 rounded-full transition-all text-spotify-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>

                {/* More menu */}
                <button
                  onClick={(e) => { e.stopPropagation(); triggerComingSoon(); }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-all text-spotify-text-muted hover:text-spotify-text opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal size={14} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
