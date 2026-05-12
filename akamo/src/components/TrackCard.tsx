import { Play, MoreHorizontal, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { Track } from '../types';

interface TrackCardProps {
  track: Track;
  isActive: boolean;
  onPlay: (track: Track) => void;
}

export default function TrackCard({ track, isActive, onPlay }: TrackCardProps) {
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
          <button 
            className="w-12 h-12 rounded-full bg-spotify-green flex items-center justify-center text-black shadow-xl accent-glow hover:scale-110 active:scale-95 transition-transform"
          >
            <Play fill="currentColor" size={24} className="ml-1" />
          </button>
        </div>
      </div>
      
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold mb-1 truncate text-lg text-spotify-text group-hover:text-spotify-green transition-colors leading-tight">
            {track.title}
          </h3>
          <p className="text-sm text-spotify-text-muted truncate font-medium opacity-70">
            {track.artist}
          </p>
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-spotify-text-muted hover:text-red-400">
            <Heart size={16} />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-spotify-text-muted">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
