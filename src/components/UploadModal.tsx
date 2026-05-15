import { X, Upload, Music, CheckCircle2, Image as ImageIcon, AlertCircle, RefreshCw, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef, useEffect } from 'react';
import { Track, UserProfile } from '../types';
import { supabase } from '../lib/supabase';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (track: Omit<Track, 'id'>) => void;
  userProfile: UserProfile | null;
}

type ValidationErrors = {
  audio?: string;
  cover?: string;
  title?: string;
};

export default function UploadModal({ isOpen, onClose, onUpload, userProfile }: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'preflight' | 'cover' | 'audio' | 'saving'>('preflight');
  const [step, setStep] = useState<'upload' | 'details'>('upload');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Clear field-level error when user fixes it
  useEffect(() => {
    if (title && validationErrors.title) setValidationErrors(prev => ({ ...prev, title: undefined }));
  }, [title]);
  useEffect(() => {
    if (coverFile && validationErrors.cover) setValidationErrors(prev => ({ ...prev, cover: undefined }));
  }, [coverFile]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleAudioSelect = (file: File) => {
    setAudioFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ""));
    setValidationErrors(prev => ({ ...prev, audio: undefined }));
    setStep('details');
  };

  const handleCoverSelect = (file: File) => {
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploaderName = userProfile?.display_name || 'Unknown';

  const handlePublish = async () => {
    // Validation
    const errors: ValidationErrors = {};
    if (!audioFile) errors.audio = 'Audio file is required';
    if (!coverFile) errors.cover = 'Cover image is required';
    if (!title.trim()) errors.title = 'Title is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      triggerShake();
      return;
    }

    if (!userProfile) {
      setErrorMessage('Profile not loaded. Please try again.');
      triggerShake();
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage('You need to be logged in to publish.');
      triggerShake();
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);
    setErrorDetail(null);
    
    try {
      const timestamp = Date.now();
      const userId = user.id;

      // Upload Cover
      setUploadPhase('cover');
      setUploadProgress(10);
      const coverExt = coverFile!.name.split('.').pop() || 'jpg';
      const coverPath = `${userId}/${timestamp}-cover.${coverExt}`;
      const { error: coverError } = await supabase.storage.from('songs').upload(coverPath, coverFile!, { upsert: true });
      if (coverError) throw coverError;
      setUploadProgress(40);

      // Upload Audio
      setUploadPhase('audio');
      setUploadProgress(45);
      const audioExt = audioFile!.name.split('.').pop() || 'mp3';
      const audioPath = `${userId}/${timestamp}-audio.${audioExt}`;
      const { error: audioError } = await supabase.storage.from('songs').upload(audioPath, audioFile!, { upsert: true });
      if (audioError) throw audioError;
      setUploadProgress(85);

      // Get Public URLs
      const coverUrl = supabase.storage.from('songs').getPublicUrl(coverPath).data.publicUrl;
      const audioUrl = supabase.storage.from('songs').getPublicUrl(audioPath).data.publicUrl;

      // Step 3: Save to Database
      setUploadPhase('saving');
      setUploadProgress(92);

      const isVideo = audioFile!.type.startsWith('video/');
      
      const newTrack: Omit<Track, 'id'> = {
        title: title.trim(),
        artist: uploaderName,
        album: 'Akamo Upload',
        coverUrl,
        audioUrl,
        coverPath,
        audioPath,
        duration: 240, 
        type: isVideo ? 'video' : 'audio',
        uploadedAt: timestamp,
      };

      await onUpload(newTrack);
      setUploadProgress(100);
      setUploading(false);
      setSuccess(true);
      
      setTimeout(() => {
        resetForm();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error("Upload pipeline failed:", error);
      setErrorMessage(error?.message || 'Upload failed. Please try again.');
      setErrorDetail(error?.code ? `Error code: ${error.code}` : null);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setUploading(false);
    setErrorMessage(null);
    setErrorDetail(null);
    setUploadProgress(0);
    setValidationErrors({});
    setAudioFile(null);
    setCoverFile(null);
    setTitle('');
    setCoverPreview(null);
    setStep('upload');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAudioSelect(e.dataTransfer.files[0]);
    }
  };

  const phaseLabel = uploadPhase === 'cover' ? 'Uploading cover...' 
    : uploadPhase === 'audio' ? 'Uploading audio...' 
    : 'Saving track...';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!uploading ? onClose : undefined}
            className="absolute inset-0 bg-spotify-black/80 backdrop-blur-3xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              x: shake ? [0, -8, 8, -6, 6, -3, 3, 0] : 0 
            }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={shake 
              ? { x: { duration: 0.5, ease: 'easeInOut' } }
              : { type: "spring", damping: 20, stiffness: 300 }
            }
            className="relative w-full max-w-2xl liquid-glass rounded-[3rem] p-8 md:p-10 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-spotify-green/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <button
              onClick={!uploading ? onClose : undefined}
              className={`absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-spotify-text-muted hover:text-spotify-text hover:bg-white/10 transition-all z-20 ${uploading ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <X size={24} />
            </button>

            <div className="relative z-10 text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-2 tracking-tighter text-spotify-text">Publish Sound</h2>
              <p className="text-spotify-text-muted opacity-60 font-medium text-sm">Broadcast your frequency to the global network.</p>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="relative z-10 mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-red-300 font-medium">{errorMessage}</p>
                      {errorDetail && (
                        <p className="text-[10px] text-red-400/50 font-mono mt-1.5 break-all">{errorDetail}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 ml-7">
                    <button 
                      onClick={() => { setErrorMessage(null); setErrorDetail(null); }}
                      className="text-[10px] text-red-400/60 hover:text-red-400 uppercase tracking-widest font-bold transition-colors"
                    >
                      Dismiss
                    </button>
                    <button 
                      onClick={handlePublish}
                      className="text-[10px] text-spotify-green hover:text-white uppercase tracking-widest font-bold transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={10} /> Retry
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
              {step === 'upload' ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => audioInputRef.current?.click()}
                  className={`col-span-1 md:col-span-5 aspect-video md:aspect-auto md:h-64 group border-2 border-dashed rounded-[2.5rem] p-10 md:p-16 flex flex-col items-center justify-center gap-6 transition-all duration-500 cursor-pointer ${
                    dragActive 
                      ? 'border-spotify-green bg-spotify-green/10 scale-105' 
                      : 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*,video/mp4"
                    onChange={(e) => e.target.files?.[0] && handleAudioSelect(e.target.files[0])}
                    className="hidden"
                  />
                  <div className="w-20 h-20 liquid-glass rounded-3xl flex items-center justify-center text-spotify-text-muted group-hover:text-spotify-green transition-all shadow-xl group-hover:rotate-12">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-xl md:text-2xl tracking-tighter text-spotify-text">Synchronize Audio</span>
                    <span className="text-sm text-spotify-text-muted font-medium opacity-60">Drag assets here or select manually</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
                    <div 
                      onClick={() => coverInputRef.current?.click()}
                      className={`aspect-square relative rounded-3xl overflow-hidden cursor-pointer group bg-white/5 border transition-all ${
                        validationErrors.cover ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-white/10'
                      }`}
                    >
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-spotify-text-muted gap-2">
                           <ImageIcon size={40} />
                           <span className="text-[10px] font-bold uppercase tracking-widest">Upload Cover</span>
                           {validationErrors.cover && (
                             <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest mt-1">Required</span>
                           )}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <Upload size={24} className="text-white" />
                      </div>
                      <input 
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleCoverSelect(e.target.files[0])}
                      />
                    </div>
                    <div className="p-4 liquid-glass rounded-2xl border border-white/5 overflow-hidden">
                       <span className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2">Selected File</span>
                       <div className="flex items-center gap-3">
                          <Music size={16} className="text-spotify-green" />
                          <span className="text-xs text-spotify-text font-medium truncate">{audioFile?.name}</span>
                       </div>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-3 space-y-4 md:space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">Sound Title <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="What's the track called?"
                          className={`w-full h-14 bg-white/5 rounded-2xl px-6 text-spotify-text focus:outline-none focus:ring-2 border transition-all ${
                            validationErrors.title ? 'border-red-500/50 focus:ring-red-500/30' : 'border-white/5 focus:ring-spotify-green/20'
                          }`}
                        />
                        {validationErrors.title && (
                          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="text-[10px] text-red-400 font-bold mt-1.5 ml-4 uppercase tracking-widest"
                          >{validationErrors.title}</motion.p>
                        )}
                      </div>

                      {/* Uploading as — read-only identity pill */}
                      <div>
                        <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">Publishing As</label>
                        <div className="w-full h-14 bg-white/[0.03] rounded-2xl px-6 flex items-center gap-3 border border-white/5">
                          <div className="w-8 h-8 rounded-full bg-spotify-green/20 flex items-center justify-center flex-shrink-0">
                            {userProfile?.avatar_url ? (
                              <img src={userProfile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <UserIcon size={14} className="text-spotify-green" />
                            )}
                          </div>
                          <span className="text-sm text-spotify-text font-medium truncate">{uploaderName}</span>
                          <span className="ml-auto text-[9px] text-spotify-text-muted uppercase tracking-widest font-bold opacity-40">Auto</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 md:pt-4 space-y-4">
                      {/* Upload progress bar */}
                      {uploading && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest">{phaseLabel}</span>
                            <span className="text-[10px] font-bold text-spotify-green tabular-nums">{Math.round(uploadProgress)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-spotify-green rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </motion.div>
                      )}

                      <button 
                         disabled={uploading || success || !title.trim() || !audioFile || !coverFile}
                         onClick={handlePublish}
                         className="w-full h-14 md:h-16 bg-spotify-green text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl accent-glow disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                      >
                         {uploading ? (
                           <>
                             <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                             <span>Transmitting...</span>
                           </>
                         ) : success ? (
                           <>
                             <CheckCircle2 size={20} />
                             <span>Mission Success</span>
                           </>
                         ) : (
                           <span>Publish Frequency</span>
                         )}
                      </button>
                      <button 
                        onClick={!uploading ? resetForm : undefined}
                        className={`w-full text-xs font-bold text-spotify-text-muted hover:text-white transition-colors ${uploading ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        Cancel Transmission
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
