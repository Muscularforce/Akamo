import { ChevronLeft, ChevronRight, Bell, User as UserIcon, LogOut, Upload, Settings, Moon, Heart, Search as SearchIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { isFounder } from '../constants';
import AuroraBadge from './AuroraBadge';

interface HeaderProps {
    onUploadClick: () => void;
    onLoginClick: () => void;
    currentTheme: 'dark' | 'pink';
    onThemeChange: (theme: 'dark' | 'pink') => void;
    user: User | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export default function Header({ onUploadClick, onLoginClick, currentTheme, onThemeChange, user, searchQuery, onSearchChange }: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const isCreator = isFounder(user?.email);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    const handleScroll = () => {
      if (mainElement) {
        setIsScrolled(mainElement.scrollTop > 10);
      }
    };
    mainElement?.addEventListener('scroll', handleScroll);
    return () => mainElement?.removeEventListener('scroll', handleScroll);
  }, []);



  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsProfileOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={`h-20 flex items-center justify-between px-8 sticky top-0 z-40 transition-all duration-500 gap-8 ${isScrolled ? 'bg-spotify-black/60 backdrop-blur-3xl border-b border-white/5 h-20' : 'bg-transparent'}`}>
      <div className="flex items-center gap-4 shrink-0">
        <button className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-spotify-text-muted hover:text-spotify-text transition-colors border border-white/5">
          <ChevronLeft size={24} />
        </button>
        <button className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-spotify-text-muted hover:text-spotify-text transition-colors border border-white/5">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="flex-1 max-w-xl group relative">
        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-spotify-text-muted group-focus-within:text-spotify-green transition-colors" size={18} />
        <input 
            type="text"
            placeholder="Search audio, assets, or creators..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl px-12 text-sm font-medium text-spotify-text placeholder:text-spotify-text-muted focus:outline-none focus:bg-white/10 focus:border-white/10 transition-all focus:ring-2 focus:ring-spotify-green/20"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-[10px] font-bold text-spotify-text-muted bg-white/5 px-2 py-1 rounded border border-white/5">⌘ K</span>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {user ? (
          <>
            <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onUploadClick}
                className="accent-shimmer flex items-center gap-2 bg-spotify-green text-black px-5 py-2 rounded-full text-[11px] font-bold transition-all accent-glow"
            >
                <Upload size={14} />
                <span className="uppercase tracking-widest">Upload</span>
            </motion.button>

            <button className="text-spotify-text-muted hover:text-spotify-text transition-all p-2 hover:bg-white/5 rounded-full">
                <Bell size={20} />
            </button>

            <div className="relative" ref={settingsRef}>
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`text-spotify-text-muted hover:text-spotify-text transition-all p-2 rounded-full ${isSettingsOpen ? 'bg-white/10 text-spotify-text' : 'hover:bg-white/5'}`}
              >
                <Settings size={20} className={isSettingsOpen ? 'rotate-90 transition-transform duration-500' : 'transition-transform duration-500'} />
              </button>

              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 top-14 w-64 liquid-glass rounded-2xl p-2 z-50 overflow-hidden"
                  >
                    <p className="text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest px-4 py-3">Experience</p>
                    <div className="space-y-1">
                      <button 
                        onClick={() => { onThemeChange('dark'); setIsSettingsOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-xs rounded-xl transition-all flex items-center gap-4 ${currentTheme === 'dark' ? 'bg-spotify-green text-black font-bold accent-glow' : 'hover:bg-white/10 text-spotify-text'}`}
                      >
                        <Moon size={16} />
                        <span className="tracking-wide">Deep Obsidian</span>
                      </button>
                      <button 
                        onClick={() => { onThemeChange('pink'); setIsSettingsOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-xs rounded-xl transition-all flex items-center gap-4 ${currentTheme === 'pink' ? 'bg-spotify-green text-black font-bold accent-glow' : 'hover:bg-white/10 text-spotify-text'}`}
                      >
                        <Heart size={16} className="fill-current" />
                        <span className="tracking-wide">Neon Flamingo</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden hover:scale-105 transition-transform p-0.5 ${
                  isCreator ? 'aurora-gradient' : 'liquid-glass'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-black">
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt={user.user_metadata?.full_name || user.user_metadata?.name || 'User'} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserIcon size={20} className="text-spotify-text-muted" />
                    </div>
                  )}
                </div>
              </button>
              
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 top-14 w-64 liquid-glass rounded-2xl p-2 z-50"
                  >
                    <div className="px-4 py-3 mb-2 border-b border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-bold text-spotify-text truncate">{user.user_metadata?.full_name || user.user_metadata?.name || 'User'}</p>
                        {isCreator && <AuroraBadge size="sm" />}
                      </div>
                      <p className="text-[10px] text-spotify-text-muted truncate opacity-60 tracking-wider uppercase">{user.email}</p>
                      {isCreator && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="mt-2 flex items-center gap-2"
                        >
                          <AuroraBadge size="md" showTitle />
                        </motion.div>
                      )}
                    </div>
                    <button className="w-full text-left px-4 py-2.5 text-[11px] hover:bg-white/10 rounded-xl transition-all flex items-center justify-between group">
                        <span className="group-hover:translate-x-1 transition-transform">Account</span>
                    </button>
                    <button className="w-full text-left px-4 py-2.5 text-[11px] hover:bg-white/10 rounded-xl transition-all flex items-center justify-between group">
                        <span className="group-hover:translate-x-1 transition-transform">Profile</span>
                    </button>
                    <div className="h-[1px] bg-white/5 my-2" />
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-[11px] hover:bg-red-500/20 rounded-xl transition-all flex items-center justify-between text-red-400 font-bold group"
                    >
                        <span className="group-hover:translate-x-1 transition-transform uppercase tracking-widest">Sign Out</span>
                        <LogOut size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <motion.button
            onClick={onLoginClick}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            className="relative overflow-hidden text-black px-7 py-2.5 rounded-full text-[11px] font-bold tracking-widest uppercase accent-shimmer"
            style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 20px rgba(29, 185, 84, 0.3)' }}
          >
            Login
          </motion.button>
        )}
      </div>
    </header>
  );
}
