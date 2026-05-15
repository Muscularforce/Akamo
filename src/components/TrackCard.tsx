import { Play, MoreHorizontal, Heart, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Track } from '../types';
import { isFounder } from '../constants';
import { User } from '@supabase/supabase-js';

interface TrackCardProps {
  track: Track;
  isActive: boolean;
  onPlay: (track: Track) => void;
  onDelete?: (track: Track) => void;
  user?: User | null;
}

export default function TrackCard({ track, isActive, onPlay, onDelete, user }: TrackCardProps) {
  const isCreator = isFounder(track.ownerEmail);
  const canDelete = user && (track.ownerId === user.id || isFounder(user.email));
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  // Compute menu position from trigger button
  const updateMenuPos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.right - 180, // 180 = min-width of dropdown
      });
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPos();
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', () => setMenuOpen(false), true);
    window.addEventListener('resize', () => setMenuOpen(false));
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', () => setMenuOpen(false), true);
      window.removeEventListener('resize', () => setMenuOpen(false));
    };
  }, [menuOpen, updateMenuPos]);

  return (
    <motion.div
      layout
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      className={`relative group cursor-pointer transition-all rounded-[2rem] shadow-2xl ${
        isCreator 
          ? 'p-[3px] aurora-gradient shadow-[0_0_30px_rgba(255,0,110,0.15)]' 
          : isActive ? 'ring-2 ring-spotify-green accent-glow bg-[#181818]' : 'bg-[#181818] hover:bg-[#282828]'
      }`}
      onClick={() => onPlay(track)}
    >
      <div className={`flex flex-col h-full overflow-hidden ${isCreator ? 'bg-[#121212] rounded-[1.8rem] hover:bg-[#181818] transition-colors' : 'rounded-[2rem]'}`}>
        <div className="relative aspect-square overflow-hidden bg-black/20">
          <img 
            src={track.coverUrl} 
            alt={track.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          />

          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 z-10">
            <div className="w-12 h-12 rounded-full bg-spotify-green flex items-center justify-center text-black shadow-xl accent-glow hover:scale-110 active:scale-95 transition-transform">
              <Play fill="currentColor" size={24} className="ml-1" />
            </div>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>
        
        <div className="relative p-4 pt-3">
          <h3 className="font-bold truncate text-sm text-spotify-text group-hover:text-spotify-green transition-colors leading-snug pr-6">
            {track.title}
          </h3>
          <p className="text-xs text-spotify-text-muted truncate font-medium opacity-70 mt-0.5">
            {track.artist}
          </p>
          
          {/* Three-dots menu trigger */}
          <button
            ref={triggerRef}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded-full transition-all text-spotify-text-muted hover:text-spotify-text opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Portal-based dropdown — escapes overflow:hidden clipping */}
      {menuOpen && createPortal(
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
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 transition-colors font-medium"
            >
              <Heart size={16} className="text-white/50" />
              <span>Save to Liked</span>
            </button>

            {canDelete && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
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
    </motion.div>
  );
}
