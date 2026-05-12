import { Play, MoreHorizontal, Heart, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { Track } from '../types';
import { isFounder } from '../constants';
import AuroraBadge from './AuroraBadge';
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
  const canDelete = user && (track.ownerId === user.uid || isFounder(user.email));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <motion.div
      layout
      whileHover={{ y: -10 }}
      whileTap={{ scale: 0.98 }}
      className={`liquid-glass group p-5 rounded-[2.5rem] cursor-pointer transition-all ${
        isActive ? 'ring-2 ring-spotify-green accent-glow bg-white/[0.08]' : 'hover:bg-white/[0.08]'
      }`}
      onClick={() => onPlay(track)}
    >
      <div className="relative aspect-square mb-5 rounded-[2rem] overflow-hidden shadow-2xl">
        <img 
          src={track.coverUrl} 
          alt={track.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />

        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-spotify-green flex items-center justify-center text-black shadow-xl accent-glow hover:scale-110 active:scale-95 transition-transform">
            <Play fill="currentColor" size={24} className="ml-1" />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold mb-1 truncate text-lg text-spotify-text group-hover:text-spotify-green transition-colors leading-tight">
            {track.title}
          </h3>
          <div className="flex items-center gap-1.5 overflow-hidden">
            <p className="text-sm text-spotify-text-muted truncate font-medium opacity-70">
              {track.artist}
            </p>
            {isCreator && <AuroraBadge size="sm" />}
          </div>
        </div>
        
        {/* Three-dots menu with dropdown */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button 
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-2 hover:bg-white/10 rounded-full transition-all text-spotify-text-muted hover:text-spotify-text opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal size={18} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-1 z-50 min-w-[180px] py-1.5 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-white/10"
                style={{
                  background: 'linear-gradient(135deg, rgba(40, 40, 40, 0.98) 0%, rgba(25, 25, 25, 0.98) 100%)',
                  backdropFilter: 'blur(40px)',
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-spotify-text hover:bg-white/10 transition-colors font-medium"
                >
                  <Heart size={16} className="text-spotify-text-muted" />
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
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
