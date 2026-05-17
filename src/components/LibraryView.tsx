import { motion, AnimatePresence } from 'motion/react';
import { Music, Plus, ListMusic, Clock, Filter, Trash2, Heart, MoreHorizontal, Edit3 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Track } from '../types';
import { User } from '@supabase/supabase-js';
import { isFounder } from '../constants';
import { useComingSoon } from './ComingSoonToast';

interface LibraryViewProps {
  onPlay: (track: Track) => void;
  tracks: Track[];
  onUploadClick: () => void;
  onDelete?: (track: Track) => void;
  onEdit?: (track: Track) => void;
  user?: User | null;
}

function TrackRowMenu({ track, user, onDelete, onEdit }: { track: Track; user?: User | null; onDelete?: (track: Track) => void; onEdit?: (track: Track) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const canDelete = user && (track.ownerId === user.id || isFounder(user.email));
  const { triggerComingSoon } = useComingSoon();

  const updateMenuPos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.min(rect.right - 180, window.innerWidth - 192),
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
      }
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', () => setOpen(false), true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', () => setOpen(false), true);
    };
  }, [open, updateMenuPos]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 hover:bg-white/10 rounded-full transition-all text-spotify-text-muted hover:text-spotify-text opacity-0 group-hover:opacity-100 flex-shrink-0"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && createPortal(
        <div ref={menuRef} className="fixed z-[9999]" style={{ top: menuPos.top, left: menuPos.left }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="min-w-[180px] py-1.5 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-white/10"
            style={{
              background: 'linear-gradient(135deg, rgba(40, 40, 40, 0.98) 0%, rgba(25, 25, 25, 0.98) 100%)',
              backdropFilter: 'blur(40px)',
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); triggerComingSoon(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 transition-colors font-medium"
            >
              <Heart size={16} className="text-white/50" />
              <span>Save to Liked</span>
            </button>

            {canDelete && onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onEdit(track);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-spotify-text hover:bg-white/10 transition-colors font-medium"
              >
                <Edit3 size={16} />
                <span>Edit Track</span>
              </button>
            )}

            {canDelete && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onDelete(track);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors font-medium"
              >
                <Trash2 size={16} />
                <span>Delete Track</span>
              </button>
            )}
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function LibraryView({ onPlay, tracks, onUploadClick, onDelete, onEdit, user }: LibraryViewProps) {
  const { triggerComingSoon } = useComingSoon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="space-y-10"
    >
      <header className="mobile-library-header flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4 md:gap-6">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-spotify-green/20 flex items-center justify-center text-spotify-green accent-glow flex-shrink-0">
                <Music size={28} className="md:w-[40px] md:h-[40px]" />
            </div>
            <div>
                <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-spotify-text">Your Library</h2>
                <div className="flex items-center gap-4 mt-2 text-xs font-bold text-spotify-text-muted uppercase tracking-widest opacity-60">
                    <span className="flex items-center gap-1.5"><ListMusic size={12} /> {tracks.length} Tracks</span>
                    <span className="flex items-center gap-1.5 hidden sm:flex"><Clock size={12} /> Syncing in real-time</span>
                </div>
            </div>
        </div>
        {/* Add to Collection button — uses theme color for Pink Flamingo support */}
        <button 
            onClick={onUploadClick}
            className="text-black px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl self-start md:self-auto"
            style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--accent-glow)' }}
        >
            <Plus size={16} />
            Add to Collection
        </button>
      </header>

      <div className="flex items-center gap-3 md:gap-4 py-4 overflow-x-auto no-scrollbar">
          <button className="px-4 md:px-5 py-2 rounded-full bg-spotify-green text-black text-[10px] font-bold uppercase tracking-widest accent-glow whitespace-nowrap">All Assets</button>
          <button onClick={triggerComingSoon} className="px-4 md:px-5 py-2 rounded-full bg-white/5 text-spotify-text-muted text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors whitespace-nowrap">Audio</button>
          <button onClick={triggerComingSoon} className="px-4 md:px-5 py-2 rounded-full bg-white/5 text-spotify-text-muted text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors whitespace-nowrap">Motion</button>
          <button onClick={triggerComingSoon} className="px-4 md:px-5 py-2 rounded-full bg-white/5 text-spotify-text-muted text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors whitespace-nowrap">Playlists</button>
          <div onClick={triggerComingSoon} className="ml-auto flex items-center gap-2 px-4 py-2 text-spotify-text-muted cursor-pointer hover:text-spotify-text transition-colors whitespace-nowrap">
              <Filter size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Filter</span>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-1">
          {tracks.map((track, i) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onPlay(track)}
                className="group flex items-center gap-3 md:gap-6 p-3 md:p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer relative overflow-visible"
              >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden shrink-0 shadow-lg">
                      <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-3 items-center gap-2 md:gap-4">
                      <div className="truncate">
                          <h4 className="font-bold text-sm text-spotify-text truncate group-hover:text-spotify-green transition-colors">{track.title}</h4>
                          <p className="text-[10px] text-spotify-text-muted font-bold uppercase tracking-widest mt-0.5">{track.artist}</p>
                      </div>
                      <div className="hidden md:block truncate text-xs text-spotify-text-muted font-medium opacity-60">
                          {track.album}
                      </div>
                      <div className="text-right text-[10px] text-spotify-text-muted font-bold opacity-40">
                          {new Date(track.uploadedAt).toLocaleDateString()}
                      </div>
                  </div>
                  <TrackRowMenu track={track} user={user} onDelete={onDelete} onEdit={onEdit} />
              </motion.div>
          ))}
      </div>
    </motion.div>
  );
}
