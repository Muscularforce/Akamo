import { ChevronLeft, ChevronRight, Bell, User as UserIcon, LogOut, Upload, Settings, Moon, Heart, Search as SearchIcon, Send, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase, fetchNotifications, createNotification } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { isOwner } from '../constants';
import { UserProfile, Notification } from '../types';
import AuroraBadge from './AuroraBadge';
import { useComingSoon } from './ComingSoonToast';

interface HeaderProps {
    onUploadClick: () => void;
    onLoginClick: () => void;
    currentTheme: 'dark' | 'pink' | 'crimson';
    onThemeChange: (theme: 'dark' | 'pink' | 'crimson') => void;
    user: User | null;
    userProfile: UserProfile | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onViewChange: (view: 'account') => void;
    onSocialClick: () => void;
}

export default function Header({ onUploadClick, onLoginClick, currentTheme, onThemeChange, user, userProfile, searchQuery, onSearchChange, onViewChange, onSocialClick }: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const isCreator = isOwner(userProfile?.role);
  const { triggerComingSoon } = useComingSoon();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expandedNotifs, setExpandedNotifs] = useState<Set<string>>(new Set());
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Read/unread notification tracking
  const [lastSeenTime, setLastSeenTime] = useState<number>(() => {
    const stored = localStorage.getItem('akamo_last_seen_notification_time');
    return stored ? parseInt(stored, 10) : 0;
  });

  const [hasSeenUploadTooltip, setHasSeenUploadTooltip] = useState(() => localStorage.getItem('akamo_seen_upload') === 'true');
  const [hasSeenRequestTooltip, setHasSeenRequestTooltip] = useState(() => localStorage.getItem('akamo_seen_request') === 'true');

  const handleUploadClick = () => {
    if (!hasSeenUploadTooltip) {
      localStorage.setItem('akamo_seen_upload', 'true');
      setHasSeenUploadTooltip(true);
    }
    onUploadClick();
  };

  const toggleProfile = () => {
    if (!hasSeenRequestTooltip) {
      localStorage.setItem('akamo_seen_request', 'true');
      setHasSeenRequestTooltip(true);
    }
    setIsProfileOpen(!isProfileOpen);
  };

  const unreadCount = useMemo(() => {
    if (notifications.length === 0) return 0;
    return notifications.filter(n => new Date(n.created_at).getTime() > lastSeenTime).length;
  }, [notifications, lastSeenTime]);

  const toggleNotifications = () => {
    const nextState = !isNotificationsOpen;
    setIsNotificationsOpen(nextState);
    if (nextState && notifications.length > 0) {
      const newestTime = new Date(notifications[0].created_at).getTime();
      localStorage.setItem('akamo_last_seen_notification_time', newestTime.toString());
      setLastSeenTime(newestTime);
    }
  };

  useEffect(() => {
    fetchNotifications().then(setNotifications);

    const channel = supabase.channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications().then(setNotifications);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={`h-16 md:h-20 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 transition-all duration-500 gap-3 md:gap-8 ${isScrolled ? 'bg-spotify-black/95 supports-[backdrop-filter]:bg-spotify-black/60 backdrop-blur-3xl border-b border-white/5' : 'bg-gradient-to-b from-spotify-black/80 to-transparent md:bg-transparent'}`}>
      {/* Nav arrows — hidden on mobile */}
      <div className="hidden md:flex items-center gap-4 shrink-0">
        <button onClick={triggerComingSoon} className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-spotify-text-muted hover:text-spotify-text transition-colors border border-white/5">
          <ChevronLeft size={24} />
        </button>
        <button onClick={triggerComingSoon} className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-spotify-text-muted hover:text-spotify-text transition-colors border border-white/5">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Search bar — responsive */}
      <div className="flex-1 max-w-xl group relative">
        <SearchIcon className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 text-spotify-text-muted group-focus-within:text-spotify-green transition-colors" size={16} />
        <input 
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 md:h-12 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl pl-9 md:pl-12 pr-4 md:pr-12 text-sm font-medium text-spotify-text placeholder:text-spotify-text-muted focus:outline-none focus:bg-white/10 focus:border-white/10 transition-all focus:ring-2 focus:ring-spotify-green/20"
        />
        {/* Keyboard shortcut — hidden on mobile */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2">
            <span className="text-[10px] font-bold text-spotify-text-muted bg-white/5 px-2 py-1 rounded border border-white/5">⌘ K</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-6 shrink-0">
        {user ? (
          <>
            {/* Social Button */}
            <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSocialClick}
                className="liquid-glass flex items-center gap-1.5 md:gap-2 text-white px-2.5 sm:px-3 md:px-4 py-2 rounded-full text-[11px] font-bold transition-all border border-spotify-green/70 shadow-[0_0_15px_rgba(29,185,84,0.4)] hover:shadow-[0_0_25px_rgba(29,185,84,0.7)] hover:border-spotify-green relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-spotify-green/10 animate-pulse pointer-events-none" />
                <Users size={14} className="relative z-10" />
                <span className="gpu-accelerated relative z-10 text-shadow-sm hidden sm:inline">Social</span>
            </motion.button>

            {/* Upload button */}
            <div className="relative">
              <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUploadClick}
                  className="accent-shimmer flex items-center gap-1.5 md:gap-2 text-black px-2.5 sm:px-3 md:px-5 py-2 rounded-full text-[11px] font-bold transition-all"
                  style={!hasSeenUploadTooltip ? {
                    background: 'var(--accent-gradient)',
                    boxShadow: '0 0 0 2.5px rgba(239,68,68,0.9), 0 0 16px rgba(239,68,68,0.7), 0 0 32px rgba(239,68,68,0.35)',
                    transition: 'box-shadow 0.4s ease',
                  } : { background: 'var(--accent-gradient)' }}
              >
                  <Upload size={14} />
                  <span className="uppercase tracking-widest hidden sm:inline">Upload</span>
              </motion.button>

              {/* Floating text sign below the upload button */}
              {!hasSeenUploadTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute top-full right-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto mt-2.5 pointer-events-none z-50"
                >
                  {/* Caret arrow */}
                  <div
                    className="w-2 h-2 rotate-45 absolute -top-1 right-6 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto"
                    style={{
                      background: 'rgba(239,68,68,0.25)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      borderBottom: 'none',
                      borderRight: 'none',
                    }}
                  />
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, rgba(20,5,5,0.92) 0%, rgba(30,8,8,0.88) 100%)',
                      border: '1px solid rgba(239,68,68,0.45)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(239,68,68,0.25)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"
                      style={{ boxShadow: '0 0 5px rgba(239,68,68,1)', animation: 'red-badge-breathe 2s ease-in-out infinite' }}
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-300 leading-none">
                      New: Autofill Feature
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Bell */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={toggleNotifications} 
                className={`relative text-spotify-text-muted hover:text-spotify-text transition-all p-1.5 sm:p-2 rounded-full flex items-center justify-center ${isNotificationsOpen ? 'bg-white/10 text-spotify-text' : 'hover:bg-white/5'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[#030303] animate-pulse leading-none shadow-[0_2px_8px_rgba(239,68,68,0.4)]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 top-14 w-80 md:w-96 liquid-glass rounded-2xl p-4 z-50 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col max-h-[70vh]"
                  >
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <h3 className="font-bold text-lg text-spotify-text tracking-tight">Updates</h3>
                    </div>

                    {isCreator && (
                      <div className="mb-4 shrink-0">
                        <textarea
                          value={newUpdateContent}
                          onChange={(e) => setNewUpdateContent(e.target.value)}
                          placeholder="Share an update..."
                          className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-spotify-text placeholder:text-spotify-text-muted focus:outline-none focus:border-spotify-green focus:ring-1 focus:ring-spotify-green resize-none transition-all"
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            disabled={!newUpdateContent.trim() || isSubmittingUpdate}
                            onClick={async () => {
                              if (!user || !newUpdateContent.trim()) return;
                              setIsSubmittingUpdate(true);
                              const success = await createNotification(newUpdateContent.trim(), user.id);
                              if (success) setNewUpdateContent('');
                              setIsSubmittingUpdate(false);
                            }}
                            className="bg-spotify-green text-black px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-1.5"
                          >
                            <Send size={12} />
                            Post
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 -mx-2 px-2 pb-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-spotify-text-muted text-sm">
                          No updates yet
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const isExpanded = expandedNotifs.has(n.id);
                          const toggleExpand = () => {
                            const next = new Set(expandedNotifs);
                            if (next.has(n.id)) next.delete(n.id);
                            else next.add(n.id);
                            setExpandedNotifs(next);
                          };
                          
                          const lines = n.content.trim().split('\n');
                          const titleLine = lines[0];
                          const hasLogs = lines.length > 1;
                          
                          return (
                          <div key={n.id} className="bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <AuroraBadge size="sm" />
                              <span className="text-[10px] text-spotify-text-muted flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(n.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <p className="text-sm font-bold text-white mb-2">{titleLine}</p>
                            
                            {hasLogs && (
                              <button 
                                onClick={toggleExpand}
                                className="text-[10px] uppercase tracking-widest text-spotify-green hover:text-white transition-colors font-bold mb-2 flex items-center gap-1"
                              >
                                {isExpanded ? 'Hide Logs' : 'View Logs'}
                              </button>
                            )}

                            <AnimatePresence>
                              {isExpanded && hasLogs && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="bg-[#1e1e1e] border border-white/10 rounded-lg p-3 font-mono text-xs space-y-1 shadow-inner mt-2">
                                    {lines.slice(1).map((line, i) => {
                                      if (!line.trim()) return <div key={i} className="h-2" />;
                                      const isAdd = line.trim().startsWith('+');
                                      const isRemove = line.trim().startsWith('-');
                                      return (
                                        <div key={i} className={`whitespace-pre-wrap ${isAdd ? 'text-green-400' : isRemove ? 'text-red-400' : 'text-gray-300'}`}>
                                          {line}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )})
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Settings dropdown */}
            <div className="relative" ref={settingsRef}>
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`text-spotify-text-muted hover:text-spotify-text transition-all p-1.5 sm:p-2 rounded-full flex items-center justify-center ${isSettingsOpen ? 'bg-white/10 text-spotify-text' : 'hover:bg-white/5'}`}
              >
                <Settings size={18} className={isSettingsOpen ? 'rotate-90 transition-transform duration-500' : 'transition-transform duration-500'} />
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
                      <button 
                        onClick={() => { onThemeChange('crimson'); setIsSettingsOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-xs rounded-xl transition-all flex items-center gap-4 ${currentTheme === 'crimson' ? 'bg-spotify-green text-black font-bold accent-glow' : 'hover:bg-white/10 text-spotify-text'}`}
                      >
                        <Heart size={16} className="text-[#DC143C] fill-current" />
                        <span className="tracking-wide">Crimson Aura</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile dropdown — red ring on avatar */}
            <div className="relative" ref={profileRef}>
              {/* Permanent Pulsing red ring around avatar */}
              {!hasSeenRequestTooltip && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-[-4px] rounded-full pointer-events-none z-10"
                  style={{
                    border: '2px solid rgba(239,68,68,0.9)',
                    boxShadow: '0 0 10px rgba(239,68,68,0.8), 0 0 24px rgba(239,68,68,0.4)',
                    animation: 'red-badge-breathe 2s ease-in-out infinite',
                  }}
                />
              )}
              <button 
                onClick={toggleProfile}
                className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center overflow-hidden hover:scale-105 transition-transform p-0.5 ${
                  isCreator ? 'aurora-gradient' : 'liquid-glass'
                }`}
              >
                <div className="relative w-full h-full rounded-full overflow-hidden bg-black" onContextMenu={(e) => e.preventDefault()}>
                  {userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt={userProfile.display_name || 'User'} className="w-full h-full rounded-full object-cover pointer-events-none" />
                  ) : user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt={user.user_metadata?.full_name || 'User'} className="w-full h-full rounded-full object-cover pointer-events-none" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center pointer-events-none">
                      <UserIcon size={18} className="text-spotify-text-muted" />
                    </div>
                  )}
                  <div className="absolute inset-0 z-10" />
                </div>
              </button>

              {/* Floating text sign below the profile picture */}
              {!hasSeenRequestTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute top-full right-0 mt-2.5 pointer-events-none z-50"
                >
                  {/* Caret arrow */}
                  <div
                    className="w-2 h-2 rotate-45 absolute -top-1 right-4"
                    style={{
                      background: 'rgba(239,68,68,0.25)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      borderBottom: 'none',
                      borderRight: 'none',
                    }}
                  />
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, rgba(20,5,5,0.92) 0%, rgba(30,8,8,0.88) 100%)',
                      border: '1px solid rgba(239,68,68,0.45)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(239,68,68,0.25)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"
                      style={{ boxShadow: '0 0 5px rgba(239,68,68,1)', animation: 'red-badge-breathe 2s ease-in-out infinite' }}
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-300 leading-none">
                      New: Request Songs
                    </span>
                  </div>
                </motion.div>
              )}
              
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
                        <p className={`text-xs font-bold truncate max-w-[120px] ${isCreator ? 'aurora-text drop-shadow-[0_0_10px_rgba(255,0,110,0.6)] text-[13px] tracking-wide' : 'text-spotify-text'}`}>
                          {userProfile?.display_name || user.user_metadata?.full_name || 'User'}
                        </p>
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
                    <div className="relative">
                      <button
                        onClick={() => { setIsProfileOpen(false); onViewChange('uploads'); }}
                        className="w-full text-left px-4 py-2.5 text-[11px] hover:bg-white/10 rounded-xl transition-all flex items-center justify-between group"
                      >
                          <span className="group-hover:translate-x-1 transition-transform">Your Uploads</span>
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-[8px] font-black uppercase tracking-wide text-red-400"
                            style={{ textShadow: '0 0 8px rgba(239,68,68,0.8)' }}
                          >
                            New
                          </motion.span>
                      </button>
                    </div>
                    <button
                      onClick={() => { setIsProfileOpen(false); onViewChange('account'); }}
                      className="w-full text-left px-4 py-2.5 text-[11px] hover:bg-white/10 rounded-xl transition-all flex items-center justify-between group"
                    >
                        <span className="group-hover:translate-x-1 transition-transform">Account Settings</span>
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
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-block text-[10px] text-spotify-text-muted font-bold tracking-widest uppercase">
              Log in to upload songs
            </span>
            <motion.button
              onClick={onLoginClick}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden text-black px-5 md:px-7 py-2.5 rounded-full text-[11px] font-bold tracking-widest uppercase accent-shimmer"
              style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 20px rgba(29, 185, 84, 0.3)' }}
            >
              Login
            </motion.button>
          </div>
        )}
      </div>
    </header>
  );
}
