import { Play, Disc3 } from 'lucide-react';
import { motion } from 'motion/react';
import { Album } from '../types';

interface AlbumCardProps {
  album: Album;
  onClick: (album: Album) => void;
  index?: number;
}

export default function AlbumCard({ album, onClick, index = 0 }: AlbumCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.5 }}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      className="relative group cursor-pointer rounded-[2rem] bg-[#181818] hover:bg-[#282828] transition-all shadow-2xl"
      onClick={() => onClick(album)}
    >
      <div className="flex flex-col h-full overflow-hidden rounded-[2rem]">
        <div className="relative aspect-square overflow-hidden bg-black/20">
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt={album.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/30 to-spotify-green/30">
              <Disc3 size={48} className="text-white/20" />
            </div>
          )}

          {/* Play button on hover */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 z-10">
            <div className="w-12 h-12 rounded-full bg-spotify-green flex items-center justify-center text-black shadow-xl accent-glow hover:scale-110 active:scale-95 transition-transform">
              <Play fill="currentColor" size={24} className="ml-1" />
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>

        <div className="p-4 pt-3">
          <h3 className="font-bold truncate text-sm text-spotify-text group-hover:text-spotify-green transition-colors leading-snug">
            {album.title}
          </h3>
          <p className="text-xs text-spotify-text-muted truncate font-medium opacity-70 mt-0.5">
            {album.artist} {album.year ? `· ${album.year}` : ''}
          </p>
          {album.genre && (
            <span className="inline-block mt-2 text-[9px] font-bold uppercase tracking-widest text-spotify-text-muted bg-white/5 px-2 py-0.5 rounded-full">
              {album.genre}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
