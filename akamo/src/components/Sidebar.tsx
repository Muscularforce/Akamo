import { Home, Search, Library, PlusCircle, Heart, Music2 } from 'lucide-react';
import { motion } from 'motion/react';
import { View } from '../types';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

const navItems: { icon: any; label: string; view: View }[] = [
  { icon: Home, label: 'Home', view: 'home' },
  { icon: Search, label: 'Explore', view: 'explore' },
  { icon: Library, label: 'Library', view: 'library' },
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <div className="w-72 h-full flex flex-col p-8 gap-10 sticky top-0 bg-spotify-black/30 backdrop-blur-3xl border-r border-white/5 transition-all duration-500">
      <div 
        className="flex items-center gap-4 px-2 group cursor-pointer transition-all duration-300"
        onClick={() => onViewChange('home')}
      >
        <img 
          src="/logo.png" 
          alt="Akamo Logo" 
          className="h-10 w-auto object-contain"
          onError={(e) => {
            // Fallback to stylized text if logo fails to load
            (e.target as any).style.display = 'none';
            (e.target as any).nextSibling.style.display = 'flex';
          }}
        />
        <div className="hidden flex items-center gap-4">
           <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 accent-glow bg-[var(--accent-gradient)]"
          >
              <span className="text-black font-black text-lg italic tracking-tighter">A</span>
          </div>
          <span className="text-3xl font-display font-bold tracking-tighter group-hover:text-glow transition-all">Akamo</span>
        </div>
      </div>

      <nav className="flex flex-col gap-6">
        <p className="text-[10px] font-bold text-spotify-text-muted uppercase tracking-[0.2em] px-2 mb-2">Menu</p>
        <div className="space-y-4">
          {navItems.map((item) => {
            const isActive = activeView === item.view;
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
                {isActive && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-spotify-green accent-glow" />}
              </motion.div>
            );
          })}
        </div>
      </nav>

      <div className="flex flex-col gap-6">
        <p className="text-[10px] font-bold text-spotify-text-muted uppercase tracking-[0.2em] px-2 mb-2">Collection</p>
        <div className="space-y-4">
          <motion.div 
              whileHover={{ x: 8 }}
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

          <motion.div 
              whileHover={{ x: 8 }}
              className="flex items-center gap-5 px-3 py-2 cursor-pointer text-spotify-text-muted hover:text-spotify-text hover:bg-white/5 rounded-2xl transition-all"
          >
            <Music2 size={22} />
            <span className="text-sm font-medium tracking-wide">Recently Played</span>
          </motion.div>
        </div>
      </div>

      <div className="mt-auto p-6 rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-spotify-green/20 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
        <h4 className="text-sm font-bold mb-2 relative z-10">Premium Experience</h4>
        <p className="text-[10px] text-spotify-text-muted mb-4 leading-relaxed relative z-10">Unlock spatial audio and advanced equalizers for your journey.</p>
        <button className="w-full py-2.5 bg-white text-black text-[10px] font-bold rounded-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest relative z-10">
          Upgrade Now
        </button>
      </div>
    </div>
  );
}
