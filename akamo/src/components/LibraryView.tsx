import { motion } from 'motion/react';
import { Music, Plus, ListMusic, Clock, Filter } from 'lucide-react';
import { Track } from '../types';

interface LibraryViewProps {
  onPlay: (track: Track) => void;
  tracks: Track[];
  onUploadClick: () => void;
}

export default function LibraryView({ onPlay, tracks, onUploadClick }: LibraryViewProps) {
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
                className="group flex items-center gap-6 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer relative overflow-hidden"
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
              </motion.div>
          ))}
      </div>
    </motion.div>
  );
}
