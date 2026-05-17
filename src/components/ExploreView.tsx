import { motion } from 'motion/react';
import { Search, Compass, Music, Disc, Mic2, Radio } from 'lucide-react';
import { Track } from '../types';
import { useComingSoon } from './ComingSoonToast';

interface ExploreViewProps {
  onPlay: (track: Track) => void;
  tracks: Track[];
}

const categories = [
  { name: 'Pop', color: 'from-pink-500 to-rose-500', icon: Music },
  { name: 'Hip-Hop', color: 'from-orange-500 to-yellow-500', icon: Radio },
  { name: 'Lo-Fi', color: 'from-indigo-500 to-purple-500', icon: Compass },
  { name: 'Rock', color: 'from-red-500 to-orange-600', icon: Disc },
  { name: 'Jazz', color: 'from-blue-500 to-cyan-500', icon: Mic2 },
  { name: 'Electronic', color: 'from-emerald-500 to-teal-500', icon: Search },
];

export default function ExploreView({ onPlay, tracks }: ExploreViewProps) {
  const { triggerComingSoon } = useComingSoon();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="space-y-12"
    >
      <section>
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-3xl font-bold tracking-tight text-spotify-text">Browse Categories</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -8, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative h-28 md:h-40 rounded-2xl md:rounded-[2rem] overflow-hidden cursor-pointer group bg-gradient-to-br ${cat.color} p-4 md:p-6 shadow-2xl`}
              onClick={triggerComingSoon}
            >
              <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <cat.icon size={40} className="md:w-16 md:h-16" />
              </div>
              <h3 className="text-base md:text-xl font-black text-white relative z-10">{cat.name}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-2xl font-bold tracking-tight text-spotify-text">Global Charts</h2>
           <button onClick={triggerComingSoon} className="text-xs font-bold text-spotify-text-muted hover:text-spotify-text uppercase tracking-widest transition-colors">See Trending</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            {tracks.slice(0, 4).map((track, i) => (
                <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    onClick={() => onPlay(track)}
                    className="liquid-glass group rounded-3xl p-4 flex items-center gap-6 cursor-pointer hover:bg-white/10 transition-all"
                >
                    <span className="text-2xl font-black text-spotify-text-muted opacity-30 w-8 text-center">{i + 1}</span>
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-lg">
                        <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-spotify-text truncate">{track.title}</h4>
                        <p className="text-xs text-spotify-text-muted">{track.artist}</p>
                    </div>
                </motion.div>
            ))}
        </div>
      </section>
    </motion.div>
  );
}
