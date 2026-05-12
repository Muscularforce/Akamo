import { Home, Library, Search, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { View } from '../types';

interface MobileNavProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export default function MobileNav({ activeView, onViewChange }: MobileNavProps) {
  return (
    <nav className="md:hidden flex items-center justify-around px-6 py-3 bg-spotify-black/90 backdrop-blur-3xl border-t border-white/5">
      <motion.button 
        whileTap={{ scale: 0.8 }} 
        onClick={() => onViewChange('home')}
        className={`flex flex-col items-center gap-1.5 transition-colors ${activeView === 'home' ? 'text-spotify-green' : 'text-spotify-text-muted'}`}
      >
        <Home size={22} strokeWidth={activeView === 'home' ? 3 : 2} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
      </motion.button>
      
      <motion.button 
        whileTap={{ scale: 0.8 }} 
        onClick={() => onViewChange('explore')}
        className={`flex flex-col items-center gap-1.5 transition-colors ${activeView === 'explore' ? 'text-spotify-green' : 'text-spotify-text-muted'}`}
      >
        <Search size={22} strokeWidth={activeView === 'explore' ? 3 : 2} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Explore</span>
      </motion.button>

      <motion.button 
        whileTap={{ scale: 0.8 }} 
        onClick={() => onViewChange('library')}
        className={`flex flex-col items-center gap-1.5 transition-colors ${activeView === 'library' ? 'text-spotify-green' : 'text-spotify-text-muted'}`}
      >
        <Library size={22} strokeWidth={activeView === 'library' ? 3 : 2} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Library</span>
      </motion.button>

      <motion.button 
        whileTap={{ scale: 0.8 }} 
        onClick={() => onViewChange('favorites')}
        className={`flex flex-col items-center gap-1.5 transition-colors ${activeView === 'favorites' ? 'text-spotify-green' : 'text-spotify-text-muted'}`}
      >
        <Heart size={22} strokeWidth={activeView === 'favorites' ? 3 : 2} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Saved</span>
      </motion.button>
    </nav>
  );
}
