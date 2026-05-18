import { Play, ListMusic } from 'lucide-react';
import { motion } from 'motion/react';
import { PlaylistMeta, Track } from '../types';

interface PlaylistCardProps {
  playlist: PlaylistMeta;
  onClick: (playlist: PlaylistMeta) => void;
  trackCovers?: string[]; // first 4 track cover URLs for collage
  trackCount?: number;
  index?: number;
}

/** Generates a 2×2 collage grid from up to 4 covers */
function CoverCollage({ covers }: { covers: string[] }) {
  if (covers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/30 to-emerald-500/30">
        <ListMusic size={48} className="text-white/20" />
      </div>
    );
  }

  if (covers.length === 1) {
    return <img src={covers[0]} alt="" className="w-full h-full object-cover" />;
  }

  // 2×2 grid
  const slots = [covers[0], covers[1] || covers[0], covers[2] || covers[0], covers[3] || covers[1] || covers[0]];

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2">
      {slots.map((src, i) => (
        <img key={i} src={src} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
}

export default function PlaylistCard({ playlist, onClick, trackCovers = [], trackCount = 0, index = 0 }: PlaylistCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.5 }}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      className="relative group cursor-pointer rounded-[2rem] bg-[#181818] hover:bg-[#282828] transition-all shadow-2xl"
      onClick={() => onClick(playlist)}
    >
      <div className="flex flex-col h-full overflow-hidden rounded-[2rem]">
        <div className="relative aspect-square overflow-hidden bg-black/20">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          ) : (
            <CoverCollage covers={trackCovers} />
          )}

          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 z-10">
            <div className="w-12 h-12 rounded-full bg-spotify-green flex items-center justify-center text-black shadow-xl accent-glow hover:scale-110 active:scale-95 transition-transform">
              <Play fill="currentColor" size={24} className="ml-1" />
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>

        <div className="p-4 pt-3">
          <h3 className="font-bold truncate text-sm text-spotify-text group-hover:text-spotify-green transition-colors leading-snug">
            {playlist.title}
          </h3>
          <p className="text-xs text-spotify-text-muted truncate font-medium opacity-70 mt-0.5">
            {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
