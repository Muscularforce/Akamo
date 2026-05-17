import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useComingSoon } from './components/ComingSoonToast';
import { Play } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import Header from './components/Header';
import TrackCard from './components/TrackCard';
import UploadModal from './components/UploadModal';
import MobileNav from './components/MobileNav';
import ExploreView from './components/ExploreView';
import LibraryView from './components/LibraryView';
import AuthPage from './components/AuthPage';
import AboutSection from './components/AboutSection';
import VerifiedPage from './components/VerifiedPage';
import AccountSettings from './components/AccountSettings';
import { Track, View, UserProfile } from './types';
import { supabase, fetchProfile } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { isFounder, isOwner } from './constants';
import { ComingSoonProvider } from './components/ComingSoonToast';

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [theme, setTheme] = useState<'dark' | 'pink'>('dark');
  const [currentView, setCurrentView] = useState<View>('home');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const hasSetInitialTrack = useRef(false);
  const userRef = useRef<User | null>(null);
  const { triggerComingSoon } = useComingSoon();

  const filteredTracks = useMemo(() => {
    if (!searchQuery) return tracks;
    const q = searchQuery.toLowerCase();
    return tracks.filter(track => 
      track.title.toLowerCase().includes(q) || 
      track.artist.toLowerCase().includes(q) ||
      track.album.toLowerCase().includes(q)
    );
  }, [tracks, searchQuery]);

  // Keep userRef in sync so callbacks can read fresh user
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Fetch user profile when user changes
  useEffect(() => {
    if (user) {
      fetchProfile(user.id).then(profile => {
        if (profile) {
          setUserProfile(profile);
        } else {
          // Profile doesn't exist yet (trigger may not have fired). Create a minimal one.
          setUserProfile({
            id: user.id,
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || null,
            role: 'user',
          });
        }
      });
    } else {
      setUserProfile(null);
    }
  }, [user]);

  // Auth + Supabase subscriptions — runs ONCE on mount
  useEffect(() => {
    // Check if user came from a verification email
    const href = window.location.href;
    if (href.includes('type=signup') || href.includes('type=recovery') || href.includes('type=magiclink')) {
      setCurrentView('verified');
      // Clean up the URL so it doesn't trigger again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      userRef.current = session?.user ?? null;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      userRef.current = session?.user ?? null;
    });

    const fetchTracks = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('uploadedAt', { ascending: false });
        
      if (error) {
        console.error("Supabase Error:", error);
        return;
      }
      
      if (data) {
        setTracks(data as Track[]);
        if (data.length > 0 && !hasSetInitialTrack.current) {
          hasSetInitialTrack.current = true;
          setCurrentTrack(data[0] as Track);
        }
      }
    };
    
    fetchTracks();

    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracks' }, fetchTracks)
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const handlePlay = useCallback((track: Track) => {
    setCurrentTrack(prev => {
      if (prev?.id === track.id) {
        setIsPlaying(p => !p);
        return prev;
      } else {
        setIsPlaying(true);
        return track;
      }
    });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentTrack(prev => {
      const currentIndex = tracks.findIndex(t => t.id === prev?.id);
      const nextIndex = (currentIndex + 1) % tracks.length;
      setIsPlaying(true);
      return tracks[nextIndex];
    });
  }, [tracks]);

  const handlePrev = useCallback(() => {
    setCurrentTrack(prev => {
      const currentIndex = tracks.findIndex(t => t.id === prev?.id);
      const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
      setIsPlaying(true);
      return tracks[prevIndex];
    });
  }, [tracks]);

  // Auto-redirect authenticated users away from auth page
  useEffect(() => {
    if (user && currentView === 'auth') {
      setCurrentView('home');
    }
  }, [user, currentView]);

  const handleLoginClick = () => {
    setCurrentView('auth');
  };

  const handleUploadClick = () => {
    if (!user) {
      setCurrentView('auth');
      return;
    }
    setIsUploadModalOpen(true);
  };

  const handleUpload = async (newTrack: Omit<Track, 'id'>) => {
    if (!user) throw new Error('You must be logged in to upload.');

    try {
      const { error } = await supabase.from('tracks').insert({
        ...newTrack,
        ownerId: user.id,
        ownerEmail: user.email,
        uploadedAt: Date.now(),
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving track:", error);
      throw new Error(error.message || 'Failed to save track to library. Please try again.');
    }
  };

  const handleDeleteTrack = async (track: Track) => {
    if (!user) {
      alert("Please log in to delete tracks.");
      return;
    }
    // Owner role can delete any track; regular users can only delete their own
    if (track.ownerId !== user.id && !isOwner(userProfile?.role) && !isFounder(user.email)) {
      alert("You don't have permission to delete this track.");
      return;
    }

    try {
      // 1. Delete from storage if paths exist
      const storagePaths = [];
      if (track.audioPath) storagePaths.push(track.audioPath);
      if (track.coverPath) storagePaths.push(track.coverPath);

      if (storagePaths.length > 0) {
        await supabase.storage.from('songs').remove(storagePaths);
      }

      // 2. Delete from DB
      const { error } = await supabase.from('tracks').delete().eq('id', track.id);
      if (error) throw error;
      
      // If deleted track was playing, stop it
      if (currentTrack?.id === track.id) {
        setIsPlaying(false);
        setCurrentTrack(null);
      }
    } catch (error) {
      console.error("Failed to delete track:", error);
      alert("Failed to delete track. Please try again.");
    }
  };

  const handleEditTrack = (track: Track) => {
    setEditingTrack(track);
  };

  const handleUpdateTrack = async (updatedTrack: Partial<Track>) => {
    if (!user || !editingTrack) throw new Error('Cannot update track.');
    try {
      const { error } = await supabase
        .from('tracks')
        .update(updatedTrack)
        .eq('id', editingTrack.id);
        
      if (error) throw error;
      
      // Update local state immediately for snappy UI
      setTracks(prev => prev.map(t => t.id === editingTrack.id ? { ...t, ...updatedTrack } : t));
      if (currentTrack?.id === editingTrack.id) {
        setCurrentTrack(prev => prev ? { ...prev, ...updatedTrack } : null);
      }
      setEditingTrack(null);
    } catch (error: any) {
      console.error("Error updating track:", error);
      throw new Error(error.message || 'Failed to update track. Please try again.');
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'explore':
        return <ExploreView tracks={filteredTracks} onPlay={handlePlay} />;
      case 'library':
        return <LibraryView tracks={filteredTracks} onPlay={handlePlay} onUploadClick={handleUploadClick} onDelete={handleDeleteTrack} onEdit={handleEditTrack} user={user} />;
      case 'favorites':
        return <LibraryView tracks={filteredTracks.slice(0, 3)} onPlay={handlePlay} onUploadClick={handleUploadClick} onDelete={handleDeleteTrack} onEdit={handleEditTrack} user={user} />;
      case 'account':
        return user && userProfile ? (
          <AccountSettings
            user={user}
            userProfile={userProfile}
            onProfileUpdate={(updated) => setUserProfile(updated)}
            onBack={() => setCurrentView('home')}
          />
        ) : null;
      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-4xl md:text-6xl font-black mb-10 tracking-tight text-spotify-text">
              {searchQuery ? `Search results for "${searchQuery}"` : 'Good afternoon'}
            </h1>
            
            {!searchQuery && (
              <div className="mobile-quick-cards grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16">
                {tracks.slice(0, 6).map((track, i) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="liquid-glass group rounded-2xl md:rounded-3xl overflow-hidden flex items-center cursor-pointer p-0 h-20 md:h-24 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(29,185,84,0.1)]"
                    onClick={() => handlePlay(track)}
                  >
                    <div className="h-full aspect-square relative overflow-hidden shrink-0">
                      <img 
                        src={track.coverUrl} 
                        alt={track.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <div className="w-10 h-10 rounded-full bg-spotify-green flex items-center justify-center text-black accent-glow scale-0 group-hover:scale-100 transition-transform duration-300">
                            <Play fill="currentColor" size={20} className="ml-1" />
                         </div>
                      </div>
                    </div>
                    <div className="flex-1 px-3 md:px-6 py-2 truncate">
                      <h3 className="font-bold text-base truncate text-spotify-text tracking-tight group-hover:text-spotify-green transition-colors">{track.title}</h3>
                      <p className="text-xs text-spotify-text-muted font-medium opacity-60 mt-1">{track.artist}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            <section className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-spotify-text">
                  {searchQuery ? 'Found Tracks' : 'Focus'}
                </h2>
                {!searchQuery && (
                  <button onClick={triggerComingSoon} className="text-[10px] font-bold text-spotify-text-muted hover:text-spotify-text transition-colors uppercase tracking-widest">
                    Show all
                  </button>
                )}
              </div>
              
              <div className="mobile-track-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
                <AnimatePresence mode="popLayout">
                  {filteredTracks.map((track) => (
                    <TrackCard 
                      key={track.id}
                      track={track}
                      isActive={currentTrack?.id === track.id}
                      onPlay={handlePlay}
                      onDelete={handleDeleteTrack}
                      onEdit={handleEditTrack}
                      user={user}
                    />
                  ))}
                </AnimatePresence>
                {filteredTracks.length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <p className="text-spotify-text-muted text-lg">No tracks found matching your search.</p>
                  </div>
                )}
              </div>
            </section>

            {!searchQuery && <AboutSection />}
          </motion.div>
        );
    }
  };

  return (
    <ComingSoonProvider>
    <div 
      className="flex h-screen bg-spotify-black overflow-clip relative selection:bg-spotify-green selection:text-black"
      data-theme={theme}
    >
      {/* Immersive Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-30 blur-[120px] animate-fluid-blob" 
             style={{ background: 'var(--accent-gradient)' }} />
        <div className="absolute bottom-[5%] right-[-5%] w-[40%] h-[40%] rounded-full opacity-20 blur-[100px] animate-fluid-blob" 
             style={{ background: 'var(--accent-gradient)', animationDelay: '-5s' }} />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full opacity-10 blur-[80px] animate-fluid-blob" 
             style={{ background: 'var(--accent-gradient)', animationDelay: '-12s' }} />
      </div>

      <div className="hidden md:block relative z-20">
        <Sidebar activeView={currentView} onViewChange={setCurrentView} />
      </div>
      
      <main className="flex-1 flex flex-col relative z-10 overflow-y-auto no-scrollbar">
        <Header 
          onUploadClick={handleUploadClick}
          onLoginClick={handleLoginClick}
          currentTheme={theme}
          onThemeChange={setTheme}
          user={user}
          userProfile={userProfile}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onViewChange={setCurrentView}
        />
        
        <div className="mobile-content-padding px-4 md:px-12 py-6 md:py-10">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>

        <div className="mobile-bottom-spacer h-60 md:h-48" /> {/* Spacer for player + mobile nav */}
      </main>

      <div className="fixed bottom-0 left-0 md:left-72 right-0 z-50">
        <Player 
          currentTrack={currentTrack} 
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onNext={handleNext}
          onPrev={handlePrev}
          userProfile={userProfile}
        />
        <MobileNav activeView={currentView} onViewChange={setCurrentView} />
      </div>

      <AnimatePresence>
        {(isUploadModalOpen || editingTrack) && (
          <UploadModal 
            isOpen={isUploadModalOpen || !!editingTrack} 
            onClose={() => { setIsUploadModalOpen(false); setEditingTrack(null); }} 
            onUpload={handleUpload}
            onUpdate={handleUpdateTrack}
            userProfile={userProfile}
            editTrack={editingTrack}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentView === 'auth' && (
          <AuthPage
            onBack={() => setCurrentView('home')}
            onSuccess={() => setCurrentView('home')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentView === 'verified' && (
          <VerifiedPage onContinue={() => setCurrentView('home')} />
        )}
      </AnimatePresence>
    </div>
    </ComingSoonProvider>
  );
}
