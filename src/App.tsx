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
import AlbumsView from './components/AlbumsView';
import AlbumDetailView from './components/AlbumDetailView';
import PlaylistsView from './components/PlaylistsView';
import PlaylistDetailView from './components/PlaylistDetailView';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import CreateAlbumModal from './components/CreateAlbumModal';
import { Track, View, UserProfile, Album, PlaylistMeta, PlaybackContext } from './types';
import { supabase, fetchProfile, fetchAlbums, fetchPlaylists, createPlaylist, addTrackToPlaylist, createAlbum, addTrackToAlbum, deleteAlbum, removeTrackFromAlbum } from './lib/supabase';
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

  // ─── Albums & Playlists State ────────────────────────
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistMeta[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistMeta | null>(null);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [pendingPlaylistTrackId, setPendingPlaylistTrackId] = useState<string | null>(null);
  // Album creation modal — mirrors the playlist pattern
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);

  // ─── Playback Context ────────────────────────────────
  const [playbackContext, setPlaybackContext] = useState<PlaybackContext | null>(null);

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

    // Fetch albums
    fetchAlbums().then(setAlbums);

    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracks' }, fetchTracks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'albums' }, () => fetchAlbums().then(setAlbums))
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch playlists when user changes
  useEffect(() => {
    if (user) {
      fetchPlaylists(user.id).then(setPlaylists);

      // Subscribe to playlist changes
      const channel = supabase.channel('playlist-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, () => {
          if (userRef.current) fetchPlaylists(userRef.current.id).then(setPlaylists);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else {
      setPlaylists([]);
    }
  }, [user]);

  // ─── Playback Handlers ──────────────────────────────

  const handlePlay = useCallback((track: Track) => {
    setCurrentTrack(prev => {
      if (prev?.id === track.id) {
        setIsPlaying(p => !p);
        return prev;
      } else {
        setIsPlaying(true);
        setPlaybackContext({
          type: 'single',
          tracks: [track],
          currentIndex: 0,
          isShuffled: false,
        });
        return track;
      }
    });
  }, []);

  const handlePlayFromContext = useCallback((
    track: Track,
    allTracks: Track[],
    contextName: string,
    contextId: string,
    contextType: 'album' | 'playlist'
  ) => {
    const index = allTracks.findIndex(t => t.id === track.id);
    setPlaybackContext({
      type: contextType,
      id: contextId,
      name: contextName,
      tracks: allTracks,
      currentIndex: index >= 0 ? index : 0,
      isShuffled: false,
      originalOrder: allTracks,
    });
    setCurrentTrack(track);
    setIsPlaying(true);
  }, []);

  const handlePlayAll = useCallback((
    contextTracks: Track[],
    contextName: string,
    contextId: string,
    contextType: 'album' | 'playlist'
  ) => {
    if (contextTracks.length === 0) return;
    setPlaybackContext({
      type: contextType,
      id: contextId,
      name: contextName,
      tracks: contextTracks,
      currentIndex: 0,
      isShuffled: false,
      originalOrder: contextTracks,
    });
    setCurrentTrack(contextTracks[0]);
    setIsPlaying(true);
  }, []);

  const handleShuffleAll = useCallback((
    contextTracks: Track[],
    contextName: string,
    contextId: string,
    contextType: 'album' | 'playlist'
  ) => {
    if (contextTracks.length === 0) return;
    const shuffled = [...contextTracks].sort(() => Math.random() - 0.5);
    setPlaybackContext({
      type: contextType,
      id: contextId,
      name: contextName,
      tracks: shuffled,
      currentIndex: 0,
      isShuffled: true,
      originalOrder: contextTracks,
    });
    setCurrentTrack(shuffled[0]);
    setIsPlaying(true);
  }, []);

  const handleNext = useCallback(() => {
    if (playbackContext && playbackContext.tracks.length > 0) {
      const nextIndex = (playbackContext.currentIndex + 1) % playbackContext.tracks.length;
      setPlaybackContext(prev => prev ? { ...prev, currentIndex: nextIndex } : null);
      setCurrentTrack(playbackContext.tracks[nextIndex]);
      setIsPlaying(true);
    } else {
      setCurrentTrack(prev => {
        const currentIndex = tracks.findIndex(t => t.id === prev?.id);
        const nextIndex = (currentIndex + 1) % tracks.length;
        setIsPlaying(true);
        return tracks[nextIndex];
      });
    }
  }, [tracks, playbackContext]);

  const handlePrev = useCallback(() => {
    if (playbackContext && playbackContext.tracks.length > 0) {
      const prevIndex = (playbackContext.currentIndex - 1 + playbackContext.tracks.length) % playbackContext.tracks.length;
      setPlaybackContext(prev => prev ? { ...prev, currentIndex: prevIndex } : null);
      setCurrentTrack(playbackContext.tracks[prevIndex]);
      setIsPlaying(true);
    } else {
      setCurrentTrack(prev => {
        const currentIndex = tracks.findIndex(t => t.id === prev?.id);
        const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
        setIsPlaying(true);
        return tracks[prevIndex];
      });
    }
  }, [tracks, playbackContext]);

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
    if (track.ownerId !== user.id && !isOwner(userProfile?.role) && !isFounder(user.email)) {
      alert("You don't have permission to delete this track.");
      return;
    }

    try {
      const storagePaths = [];
      if (track.audioPath) storagePaths.push(track.audioPath);
      if (track.coverPath) storagePaths.push(track.coverPath);

      if (storagePaths.length > 0) {
        await supabase.storage.from('songs').remove(storagePaths);
      }

      const { error } = await supabase.from('tracks').delete().eq('id', track.id);
      if (error) throw error;

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

  // ─── Playlist Handlers ──────────────────────────────

  const handleCreatePlaylist = async (title: string, description: string, isPublic: boolean) => {
    if (!user) return;
    const newPlaylist = await createPlaylist({
      title,
      description,
      ownerId: user.id,
      isPublic,
    });

    if (newPlaylist) {
      setPlaylists(prev => [newPlaylist, ...prev]);

      // If there's a pending track, add it
      if (pendingPlaylistTrackId) {
        await addTrackToPlaylist(newPlaylist.id, pendingPlaylistTrackId, user.id);
        setPendingPlaylistTrackId(null);
      }

      setIsCreatePlaylistOpen(false);
    }
  };

  const handleAddToPlaylist = async (trackId: string, playlistId: string) => {
    if (!user) return;
    const success = await addTrackToPlaylist(playlistId, trackId, user.id);
    if (success) {
      // Refresh playlists to update timestamps
      fetchPlaylists(user.id).then(setPlaylists);
    }
  };

  const handleCreatePlaylistWithTrack = (trackId: string) => {
    setPendingPlaylistTrackId(trackId);
    setIsCreatePlaylistOpen(true);
  };

  // ─── View Navigation Helpers ────────────────────────

  const handleAlbumClick = (album: Album) => {
    setSelectedAlbum(album);
    setCurrentView('album-detail');
  };

  const handlePlaylistClick = (playlist: PlaylistMeta) => {
    setSelectedPlaylist(playlist);
    setCurrentView('playlist-detail');
  };

  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
    if (view !== 'album-detail') setSelectedAlbum(null);
    if (view !== 'playlist-detail') setSelectedPlaylist(null);
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'explore':
        return <ExploreView tracks={filteredTracks} onPlay={handlePlay} />;
      case 'library':
        return (
          <LibraryView
            tracks={filteredTracks}
            onPlay={handlePlay}
            onUploadClick={handleUploadClick}
            onDelete={handleDeleteTrack}
            onEdit={handleEditTrack}
            user={user}
            playlists={playlists}
            onAddToPlaylist={handleAddToPlaylist}
            onCreatePlaylistWithTrack={handleCreatePlaylistWithTrack}
          />
        );
      case 'favorites':
        return (
          <LibraryView
            tracks={filteredTracks.slice(0, 3)}
            onPlay={handlePlay}
            onUploadClick={handleUploadClick}
            onDelete={handleDeleteTrack}
            onEdit={handleEditTrack}
            user={user}
            playlists={playlists}
            onAddToPlaylist={handleAddToPlaylist}
            onCreatePlaylistWithTrack={handleCreatePlaylistWithTrack}
          />
        );
      case 'albums':
        return (
          <AlbumsView
            albums={albums}
            onAlbumClick={handleAlbumClick}
            onCreateAlbum={() => {
              // Gate album creation behind auth — same pattern as playlist creation
              if (!user) { setCurrentView('auth'); return; }
              setIsCreateAlbumOpen(true);
            }}
            canCreate={true}
          />
        );
      case 'album-detail':
        return selectedAlbum ? (
          <AlbumDetailView
            album={selectedAlbum}
            currentTrack={currentTrack}
            onBack={() => handleViewChange('albums')}
            onPlayAll={(t, n, id) => handlePlayAll(t, n, id, 'album')}
            onShuffleAll={(t, n, id) => handleShuffleAll(t, n, id, 'album')}
            onPlayTrack={(t, all, n, id) => handlePlayFromContext(t, all, n, id, 'album')}
            playlists={playlists}
            onAddToPlaylist={handleAddToPlaylist}
            onCreatePlaylistWithTrack={handleCreatePlaylistWithTrack}
            isOwner={user?.id === selectedAlbum.ownerId}
            onAlbumDeleted={(id) => {
              setAlbums(prev => prev.filter(a => a.id !== id));
              handleViewChange('albums');
            }}
            onRemoveTrackFromAlbum={async (trackId, albumId) => {
              const success = await removeTrackFromAlbum(albumId, trackId);
              if (success) {
                // Not returning anything, but component state will update if needed
              }
            }}
          />
        ) : null;
      case 'playlists':
        return (
          <PlaylistsView
            playlists={playlists}
            onPlaylistClick={handlePlaylistClick}
            onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
          />
        );
      case 'playlist-detail':
        return selectedPlaylist ? (
          <PlaylistDetailView
            playlist={selectedPlaylist}
            currentTrack={currentTrack}
            onBack={() => handleViewChange('playlists')}
            onPlayAll={(t, n, id) => handlePlayAll(t, n, id, 'playlist')}
            onShuffleAll={(t, n, id) => handleShuffleAll(t, n, id, 'playlist')}
            onPlayTrack={(t, all, n, id) => handlePlayFromContext(t, all, n, id, 'playlist')}
            onPlaylistUpdated={(updated) => {
              setSelectedPlaylist(updated);
              setPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
            }}
            onPlaylistDeleted={(id) => {
              setPlaylists(prev => prev.filter(p => p.id !== id));
              handleViewChange('playlists');
            }}
            onBrowseMusic={() => handleViewChange('library')}
          />
        ) : null;
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
                      playlists={playlists}
                      onAddToPlaylist={handleAddToPlaylist}
                      onCreatePlaylistWithTrack={handleCreatePlaylistWithTrack}
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
        <Sidebar
          activeView={currentView}
          onViewChange={handleViewChange}
          onCreatePlaylist={() => {
            if (!user) { setCurrentView('auth'); return; }
            setIsCreatePlaylistOpen(true);
          }}
        />
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
          playbackContext={playbackContext}
        />
        <MobileNav activeView={currentView} onViewChange={handleViewChange} />
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

      <AnimatePresence>
        {isCreatePlaylistOpen && (
          <CreatePlaylistModal
            isOpen={isCreatePlaylistOpen}
            onClose={() => { setIsCreatePlaylistOpen(false); setPendingPlaylistTrackId(null); }}
            onCreate={handleCreatePlaylist}
            pendingTrackId={pendingPlaylistTrackId}
          />
        )}
      </AnimatePresence>

      {/* Album creation modal — same rendering pattern as playlist modal */}
      <AnimatePresence>
        {isCreateAlbumOpen && (
          <CreateAlbumModal
            isOpen={isCreateAlbumOpen}
            onClose={() => setIsCreateAlbumOpen(false)}
            onCreate={async (albumData, trackIds) => {
              if (!user) return;
              // Create the album record first
              const newAlbum = await createAlbum({
                ...albumData,
                ownerId: user.id,
              });
              if (!newAlbum) throw new Error('Failed to create album');

              // Then link each selected track — sequential to preserve order
              for (const trackId of trackIds) {
                await addTrackToAlbum(newAlbum.id, trackId);
              }

              // Refresh albums list — realtime subscription will also fire
              const fresh = await fetchAlbums();
              setAlbums(fresh);
            }}
            tracks={tracks}
          />
        )}
      </AnimatePresence>
    </div>
    </ComingSoonProvider>
  );
}
