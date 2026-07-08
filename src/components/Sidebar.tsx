import { Home, Search, Library, PlusCircle, Heart, Music2, Disc3, ListMusic } from 'lucide-react';
import { motion } from 'motion/react';
import { View } from '../types';
import { useState } from 'react';
import { useComingSoon } from './ComingSoonToast';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  onCreatePlaylist?: () => void;
}

const navItems: { icon: any; label: string; view: View; isNew?: boolean }[] = [
  { icon: Home, label: 'Home', view: 'home' },
  { icon: Search, label: 'Explore', view: 'explore' },
  { icon: Library, label: 'Library', view: 'library' },
  { icon: Disc3, label: 'Albums', view: 'albums', isNew: true },
  { icon: ListMusic, label: 'Playlists', view: 'playlists', isNew: true },
];

export default function Sidebar({ activeView, onViewChange, onCreatePlaylist }: SidebarProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const { triggerComingSoon } = useComingSoon();

  return (
    <div className="w-72 h-full flex flex-col p-8 gap-8 sticky top-0 bg-spotify-black/30 backdrop-blur-3xl border-r border-white/5 transition-all duration-500">
      <div
        className="flex items-center gap-4 px-2 group cursor-pointer transition-all duration-300"
        onClick={() => onViewChange('home')}
      >
        {!logoFailed ? (
          <div className="flex flex-col items-start gap-1">
            <img
              src="/logo.png"
              alt="Akamo Logo"
              className="h-10 w-auto object-contain"
              onError={() => setLogoFailed(true)}
            />
            <span className="text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest ml-1">v1.4</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 accent-glow"
                style={{ background: 'var(--accent-gradient)' }}
              >
                  <span className="text-black font-black text-lg italic tracking-tighter">A</span>
              </div>
              <span className="text-3xl font-display font-bold tracking-tighter group-hover:text-glow transition-all">Akamo</span>
            </div>
            <span className="text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest ml-14">v1.4</span>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-4">
        <p className="text-[10px] font-bold text-spotify-text-muted uppercase tracking-[0.2em] px-2 mb-1">Menu</p>
        <div className="space-y-2">
          {navItems.map((item) => {
            const isActive = activeView === item.view
              || (item.view === 'albums' && activeView === 'album-detail')
              || (item.view === 'playlists' && activeView === 'playlist-detail');
            return (
              <motion.div
                key={item.label}
                whileHover={{ x: 8 }}
                onClick={() => onViewChange(item.view)}
                className={`flex items-center gap-5 px-3 py-2 cursor-pointer transition-all rounded-2xl ${
                  isActive ? 'bg-white/10 text-spotify-text shadow-xl' : 'text-spotify-text-muted hover:text-spotify-text hover:bg-white/5'
                }`}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-sm tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                {item.isNew && (
                  <span className="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[8px] font-black uppercase tracking-widest leading-none shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                    <span
                      className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0"
                      style={{ boxShadow: '0 0 5px rgba(239,68,68,1)', animation: 'red-badge-breathe 2s ease-in-out infinite' }}
                    />
                    New
                  </span>
                )}
                {isActive && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-spotify-green accent-glow" />}
              </motion.div>
            );
          })}
        </div>
      </nav>

      <div className="flex flex-col gap-4">
        <p className="text-[10px] font-bold text-spotify-text-muted uppercase tracking-[0.2em] px-2 mb-1">Collection</p>
        <div className="space-y-2">
          <motion.div
              whileHover={{ x: 8 }}
              onClick={onCreatePlaylist || triggerComingSoon}
              className="flex items-center gap-5 px-3 py-2 cursor-pointer text-spotify-text-muted hover:text-spotify-text hover:bg-white/5 rounded-2xl transition-all"
          >
            <div className="p-1">
              <PlusCircle size={22} />
            </div>
            <span className="text-sm font-medium tracking-wide">Create Playlist</span>
          </motion.div>

          <motion.div
              whileHover={{ x: 8 }}
              onClick={() => onViewChange('favorites')}
              className={`flex items-center gap-5 px-3 py-2 cursor-pointer transition-all rounded-2xl ${
                activeView === 'favorites' ? 'bg-white/10 text-spotify-text shadow-xl' : 'text-spotify-text-muted hover:text-spotify-text hover:bg-white/5'
              }`}
          >
            <Heart size={22} className={activeView === 'favorites' ? 'text-red-400' : ''} />
            <span className={`text-sm tracking-wide ${activeView === 'favorites' ? 'font-bold' : 'font-medium'}`}>Favorites</span>
            {activeView === 'favorites' && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-spotify-green accent-glow" />}
          </motion.div>

        </div>
      </div>

      <div className="mt-auto p-6 rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 relative overflow-hidden group shrink-0">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
        <h4 className="text-sm font-bold mb-2 relative z-10 flex items-center gap-2">
          <span className="font-display tracking-tight text-white">Discord Server</span>
        </h4>
        <p className="text-[10px] text-spotify-text-muted mb-4 leading-relaxed relative z-10">Join our community server to chat, share music, and get updates.</p>
        <a 
          href="https://discord.gg/cqe3YAPAQ" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block w-full py-2.5 text-center text-white text-[10px] font-bold rounded-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest relative z-10"
          style={{ 
            background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
            boxShadow: '0 4px 15px rgba(88, 101, 242, 0.25)'
          }}
        >
          Join Discord
        </a>
      </div>
    </div>
  );
}
