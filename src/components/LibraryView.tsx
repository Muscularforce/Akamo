import { motion, AnimatePresence } from 'motion/react';
import { Music, Plus, ListMusic, Clock, Filter, Trash2, Heart, MoreHorizontal } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Track } from '../types';
import { User } from '@supabase/supabase-js';
import { isFounder } from '../constants';

interface LibraryViewProps {
  onPlay: (track: Track) => void;
  tracks: Track[];
  onUploadClick: () => void;
  onDelete?: (track: Track) => void;
  user?: User | null;
}

function TrackRowMenu({ track, user, onDelete }: { track: Track; user?: User | null; onDelete?: (track: Track) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const canDelete = user && (track.ownerId === user.id || isFounder(user.email));

  const updateMenuPos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.right - 180,
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
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 transition-colors font-medium"
            >
              <Heart size={16} className="text-white/50" />
              <span>Save to Liked</span>
            </button>

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

export default function LibraryView({ onPlay, tracks, onUploadClick, onDelete, user }: LibraryViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="space-y-10"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-spotify-green/20 flex items-center justify-center text-spotify-green accent-glow">
                <Music size={40} />
            </div>
            <div>
                <h2 className="text-4xl font-black tracking-tighter text-spotify-text">Your Library</h2>
                <div className="flex items-center gap-4 mt-2 text-xs font-bold text-spotify-text-muted uppercase tracking-widest opacity-60">
                    <span className="flex items-center gap-1.5"><ListMusic size={12} /> {tracks.length} Tracks</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} /> Syncing in real-time</span>
                </div>
            </div>
        </div>
        <button 
            onClick={onUploadClick}
            className="bg-white text-black px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
            <Plus size={16} />
            Add to Collection
        </button>
      </header>

      <div className="flex items-center gap-4 py-4 overflow-x-auto no-scrollbar">
          <button className="px-5 py-2 rounded-full bg-spotify-green text-black text-[10px] font-bold uppercase tracking-widest accent-glow">All Assets</button>
          <button className="px-5 py-2 rounded-full bg-white/5 text-spotify-text-muted text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">Audio</button>
          <button className="px-5 py-2 rounded-full bg-white/5 text-spotify-text-muted text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">Motion</button>
          <button className="px-5 py-2 rounded-full bg-white/5 text-spotify-text-muted text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">Playlists</button>
          <div className="ml-auto flex items-center gap-2 px-4 py-2 text-spotify-text-muted">
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
                className="group flex items-center gap-6 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer relative overflow-visible"
              >
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-lg">
                      <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-3 items-center gap-4">
                      <div className="truncate">
                          <h4 className="font-bold text-spotify-text truncate group-hover:text-spotify-green transition-colors">{track.title}</h4>
                          <p className="text-[10px] text-spotify-text-muted font-bold uppercase tracking-widest mt-0.5">{track.artist}</p>
                      </div>
                      <div className="hidden md:block truncate text-xs text-spotify-text-muted font-medium opacity-60">
                          {track.album}
                      </div>
                      <div className="text-right text-[10px] text-spotify-text-muted font-bold opacity-40">
                          {new Date(track.uploadedAt).toLocaleDateString()}
                      </div>
                  </div>
                  <TrackRowMenu track={track} user={user} onDelete={onDelete} />
              </motion.div>
          ))}
      </div>
    </motion.div>
  );
}
