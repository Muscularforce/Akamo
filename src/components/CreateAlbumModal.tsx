// CreateAlbumModal — mirrors CreatePlaylistModal's design + UploadModal's cover upload flow
// Uses the same liquid-glass aesthetic, shake validation, and accent-gradient buttons

import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Upload, Music, Check, Disc3 } from 'lucide-react';
import { useState, useRef } from 'react';
import { Track } from '../types';
import { supabase } from '../lib/supabase';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Callback receives all metadata + selected track IDs so App.tsx can persist
  onCreate: (album: {
    title: string;
    artist: string;
    year: number;
    genre: string;
    coverUrl: string;
    coverPath: string;
  }, trackIds: string[]) => Promise<void>;
  // Existing tracks available for selection — only show the user's own library
  tracks: Track[];
}

export default function CreateAlbumModal({ isOpen, onClose, onCreate, tracks }: CreateAlbumModalProps) {
  // ─── Form State ───────────────────────────────────────
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [genre, setGenre] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);

  // ─── UI State ─────────────────────────────────────────
  // Two-step flow: metadata first, then pick tracks — reduces cognitive load
  const [step, setStep] = useState<'details' | 'tracks'>('details');
  const [shake, setShake] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);

  // ─── Validation Errors ────────────────────────────────
  const [errors, setErrors] = useState<{ title?: string; artist?: string; cover?: string }>({});

  const handleCoverSelect = (file: File) => {
    setCoverFile(file);
    // Instant preview via FileReader — same pattern as UploadModal
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
    // Clear cover error when user fixes it
    if (errors.cover) setErrors(prev => ({ ...prev, cover: undefined }));
  };

  const handleNextStep = () => {
    // Validate required fields before allowing track selection
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = 'Album name is required';
    if (!artist.trim()) newErrors.artist = 'Artist is required';
    if (!coverFile) newErrors.cover = 'Cover art is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    setStep('tracks');
  };

  const toggleTrack = (trackId: string) => {
    setSelectedTrackIds(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

  // Filter tracks by search query for the track picker step
  const filteredTracks = tracks.filter(t => {
    if (!trackSearch) return true;
    const q = trackSearch.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
  });

  const handleSubmit = async () => {
    if (selectedTrackIds.length === 0) {
      // Allow creating empty albums — user can add tracks later
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in.');

      const timestamp = Date.now();

      // Upload cover art to Supabase Storage — same bucket/path convention as UploadModal
      const coverExt = coverFile!.name.split('.').pop() || 'jpg';
      const coverPath = `${user.id}/${timestamp}-album-cover.${coverExt}`;
      const { error: coverError } = await supabase.storage
        .from('songs')
        .upload(coverPath, coverFile!, { upsert: true });

      if (coverError) throw coverError;

      const coverUrl = supabase.storage.from('songs').getPublicUrl(coverPath).data.publicUrl;

      await onCreate(
        {
          title: title.trim(),
          artist: artist.trim(),
          year,
          genre: genre.trim(),
          coverUrl,
          coverPath,
        },
        selectedTrackIds,
      );

      // Reset everything and close
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('[Akamo] CreateAlbumModal submit failed:', error);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setYear(new Date().getFullYear());
    setGenre('');
    setCoverFile(null);
    setCoverPreview(null);
    setSelectedTrackIds([]);
    setStep('details');
    setErrors({});
    setTrackSearch('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop — same opacity + blur as every other modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!uploading ? handleClose : undefined}
            className="absolute inset-0 bg-spotify-black/80 backdrop-blur-3xl"
          />

          {/* Modal panel — liquid-glass, rounded-[3rem], same max-w as UploadModal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              // Shake animation on validation failure — identical to CreatePlaylistModal
              x: shake ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={shake
              ? { x: { duration: 0.5, ease: 'easeInOut' } }
              : { type: 'spring', damping: 20, stiffness: 300 }
            }
            className="relative w-full max-w-lg liquid-glass rounded-[3rem] p-8 md:p-10 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            {/* Decorative glow — matches CreatePlaylistModal */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-spotify-green/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Close button */}
            <button
              onClick={!uploading ? handleClose : undefined}
              className={`absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-spotify-text-muted hover:text-spotify-text hover:bg-white/10 transition-all z-20 ${uploading ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <X size={24} />
            </button>

            <div className="relative z-10">
              {/* Header — step indicator doubles as title */}
              <h2 className="text-2xl md:text-3xl font-bold mb-1 tracking-tighter text-spotify-text">
                {step === 'details' ? 'New Album' : 'Add Tracks'}
              </h2>
              <p className="text-spotify-text-muted opacity-60 font-medium text-sm mb-8">
                {step === 'details'
                  ? 'Set up your album details and cover art.'
                  : `Select tracks to include · ${selectedTrackIds.length} selected`}
              </p>

              {step === 'details' ? (
                /* ──────── STEP 1: Album Metadata ──────── */
                <div className="space-y-5">
                  {/* Cover Art Upload — mirrors UploadModal's cover picker */}
                  <div className="flex items-start gap-5">
                    <div
                      onClick={() => coverInputRef.current?.click()}
                      className={`relative w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden cursor-pointer group flex-shrink-0 transition-all border ${
                        errors.cover ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-white/10'
                      } bg-white/5`}
                    >
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-spotify-text-muted gap-2">
                          <ImageIcon size={32} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Cover Art</span>
                          {errors.cover && (
                            <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Required</span>
                          )}
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                        <Upload size={20} className="text-white" />
                      </div>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleCoverSelect(e.target.files[0])}
                      />
                    </div>

                    {/* Right column: title + artist stacked beside cover */}
                    <div className="flex-1 space-y-4 min-w-0">
                      <div>
                        <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">
                          Album Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors(prev => ({ ...prev, title: undefined })); }}
                          placeholder="Enter album name"
                          className={`w-full h-12 bg-white/5 rounded-2xl px-5 text-sm text-spotify-text focus:outline-none focus:ring-2 border transition-all ${
                            errors.title ? 'border-red-500/50 focus:ring-red-500/30' : 'border-white/5 focus:ring-spotify-green/20'
                          }`}
                          autoFocus
                        />
                        {errors.title && (
                          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="text-[10px] text-red-400 font-bold mt-1.5 ml-4 uppercase tracking-widest"
                          >{errors.title}</motion.p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">
                          Artist <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={artist}
                          onChange={(e) => { setArtist(e.target.value); if (errors.artist) setErrors(prev => ({ ...prev, artist: undefined })); }}
                          placeholder="Artist or band name"
                          className={`w-full h-12 bg-white/5 rounded-2xl px-5 text-sm text-spotify-text focus:outline-none focus:ring-2 border transition-all ${
                            errors.artist ? 'border-red-500/50 focus:ring-red-500/30' : 'border-white/5 focus:ring-spotify-green/20'
                          }`}
                        />
                        {errors.artist && (
                          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="text-[10px] text-red-400 font-bold mt-1.5 ml-4 uppercase tracking-widest"
                          >{errors.artist}</motion.p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Year + Genre row — side by side for compact layout */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">
                        Year
                      </label>
                      <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                        min={1900}
                        max={2100}
                        className="w-full h-12 bg-white/5 rounded-2xl px-5 text-sm text-spotify-text focus:outline-none focus:ring-2 focus:ring-spotify-green/20 border border-white/5 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">
                        Genre
                      </label>
                      <input
                        type="text"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder="e.g. R&B, Pop"
                        className="w-full h-12 bg-white/5 rounded-2xl px-5 text-sm text-spotify-text focus:outline-none focus:ring-2 focus:ring-spotify-green/20 border border-white/5 transition-all"
                      />
                    </div>
                  </div>

                  {/* Next button — accent gradient, same style as CreatePlaylistModal's submit */}
                  <button
                    onClick={handleNextStep}
                    className="w-full h-14 text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl accent-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'var(--accent-gradient)' }}
                  >
                    Next — Add Tracks
                  </button>
                </div>
              ) : (
                /* ──────── STEP 2: Track Selection ──────── */
                <div className="space-y-5">
                  {/* Search within existing tracks */}
                  <input
                    type="text"
                    value={trackSearch}
                    onChange={(e) => setTrackSearch(e.target.value)}
                    placeholder="Search your tracks..."
                    className="w-full h-12 bg-white/5 rounded-2xl px-5 text-sm text-spotify-text focus:outline-none focus:ring-2 focus:ring-spotify-green/20 border border-white/5 transition-all"
                    autoFocus
                  />

                  {/* Track list with checkboxes — max-height scroll to keep modal bounded */}
                  <div className="max-h-[40vh] overflow-y-auto no-scrollbar space-y-1 -mx-2">
                    {filteredTracks.length === 0 ? (
                      <div className="text-center py-10">
                        <Music size={32} className="mx-auto text-spotify-text-muted opacity-20 mb-3" />
                        <p className="text-spotify-text-muted text-sm font-medium">
                          {tracks.length === 0
                            ? 'No tracks in your library yet.'
                            : 'No tracks match your search.'}
                        </p>
                      </div>
                    ) : (
                      filteredTracks.map((track) => {
                        const isSelected = selectedTrackIds.includes(track.id);
                        return (
                          <motion.div
                            key={track.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleTrack(track.id)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-spotify-green/10 border border-spotify-green/20'
                                : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            {/* Mini cover art */}
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-md">
                              <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                            </div>

                            {/* Track info */}
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-spotify-green' : 'text-spotify-text'}`}>
                                {track.title}
                              </h4>
                              <p className="text-[10px] text-spotify-text-muted font-medium truncate">{track.artist}</p>
                            </div>

                            {/* Selection indicator */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                              isSelected
                                ? 'bg-spotify-green text-black'
                                : 'border border-white/20'
                            }`}>
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    {/* Back button — lets user fix metadata without losing track selection */}
                    <button
                      onClick={() => setStep('details')}
                      disabled={uploading}
                      className="h-14 px-6 text-spotify-text-muted hover:text-spotify-text font-bold text-xs uppercase tracking-widest rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 disabled:opacity-30"
                    >
                      Back
                    </button>

                    {/* Create button */}
                    <button
                      onClick={handleSubmit}
                      disabled={uploading}
                      className="flex-1 h-14 text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl accent-glow disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                      style={{ background: 'var(--accent-gradient)' }}
                    >
                      {uploading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Disc3 size={16} />
                          <span>Create Album{selectedTrackIds.length > 0 ? ` · ${selectedTrackIds.length} tracks` : ''}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
