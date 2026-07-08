import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Track, UserProfile } from '../types';
import { fetchUserTracks, createSongRequest } from '../lib/supabase';
import { ArrowLeft, Loader2, Music, Edit, Plus, X, Send } from 'lucide-react';

interface UploadsDashboardProps {
  userProfile: UserProfile;
  onBack: () => void;
  onEditTrack: (track: Track) => void;
}

export default function UploadsDashboard({ userProfile, onBack, onEditTrack }: UploadsDashboardProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTitle.trim()) return;
    setIsSubmitting(true);
    
    // Split by newlines and filter out empty lines
    const titles = requestTitle.split('\n').map(t => t.trim()).filter(t => t);
    
    if (titles.length === 0) {
      setIsSubmitting(false);
      return;
    }

    const success = await createSongRequest(titles, userProfile.display_name);
    setIsSubmitting(false);
    if (success) {
      setShowRequestModal(false);
      setRequestTitle('');
    } else {
      setError('Failed to submit song request.');
    }
  };

  const handleMigrateCovers = async () => {
    setMigrating(true);
    try {
      const tracksToMigrate = tracks.filter(t => t.coverUrl?.includes('drive.google.com'));
      if (tracksToMigrate.length === 0) {
        alert('No covers to migrate!');
        return;
      }

      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-drive-token');
      if (tokenError || !tokenData?.accessToken) throw new Error('Failed to get Google Drive token');
      const accessToken = tokenData.accessToken;

      for (const track of tracksToMigrate) {
        const match = track.coverUrl!.match(/id=([^&]+)/);
        if (!match || !match[1]) continue;
        const driveId = match[1];

        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveId}?alt=media`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!res.ok) continue;

        const blob = await res.blob();
        const ext = blob.type.split('/')[1] || 'jpg';
        const file = new File([blob], `cover.${ext}`, { type: blob.type });

        const path = `covers/${track.ownerId}-${Date.now()}-migrated.${ext}`;
        const { error: uploadError } = await supabase.storage.from('songs').upload(path, file, { upsert: true });

        if (uploadError) {
          console.error('Upload failed for', track.id, uploadError);
          continue;
        }

        const { data: publicUrlData } = supabase.storage.from('songs').getPublicUrl(path);
        
        await supabase.from('tracks').update({ 
          coverUrl: publicUrlData.publicUrl,
          coverPath: path 
        }).eq('id', track.id);
      }

      alert('Covers successfully migrated to Supabase!');
      // Reload tracks
      const data = await fetchUserTracks(userProfile.id);
      setTracks(data);
    } catch (err: any) {
      console.error(err);
      alert('Migration failed: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    const loadTracks = async () => {
      try {
        const data = await fetchUserTracks(userProfile.id);
        setTracks(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load uploads.');
      } finally {
        setIsLoading(false);
      }
    };
    loadTracks();
  }, [userProfile.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-spotify-text-muted hover:text-spotify-text transition-colors text-sm font-medium mb-4"
          >
            <ArrowLeft size={18} />
            <span className="tracking-wide">Back</span>
          </button>
          <h1 className="text-4xl font-black tracking-tight text-spotify-text mb-2">Your Uploads</h1>
          <p className="text-spotify-text-muted text-sm font-medium opacity-60">Manage your published frequencies.</p>
        </div>
        <div className="flex items-center gap-3">
          {userProfile.role === 'owner' && (
            <button 
              onClick={handleMigrateCovers}
              disabled={migrating}
              className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {migrating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Rescue Covers
            </button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-sm transition-colors border border-white/10"
          >
            <Plus size={16} />
            <span>Request a Song</span>
          </motion.button>
        </div>
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[#121212] rounded-3xl p-6 border border-white/10 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Request a Song</h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-2 text-spotify-text-muted hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-spotify-text-muted uppercase tracking-wider mb-2">
                  Song Names (One per line)
                </label>
                <textarea
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  placeholder="Song 1&#10;Song 2&#10;Song 3..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-spotify-green focus:bg-white/10 transition-all min-h-[120px] resize-none"
                  autoFocus
                />
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={!requestTitle.trim() || isSubmitting}
                className="w-full py-3 bg-spotify-green hover:bg-spotify-green-hover text-black rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    <span>Submit Request</span>
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-spotify-green" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
          {error}
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-20 liquid-glass rounded-[2.5rem] border border-white/5">
          <Music size={48} className="mx-auto text-spotify-text-muted mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-spotify-text mb-2">No uploads yet</h3>
          <p className="text-sm text-spotify-text-muted">When you publish sounds, they will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track) => (
            <div key={track.id} className="liquid-glass rounded-3xl p-4 flex gap-4 items-center group border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-white/5">
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music size={24} className="text-spotify-text-muted" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-spotify-text truncate">{track.title}</h4>
                <p className="text-[10px] text-spotify-text-muted truncate uppercase tracking-widest mt-1">{track.artist}</p>
              </div>
              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEditTrack(track)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-spotify-text-muted hover:text-white transition-colors"
                >
                  <Edit size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
