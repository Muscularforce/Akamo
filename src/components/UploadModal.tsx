import { X, Upload, Music, CheckCircle2, Image as ImageIcon, AlertCircle, RefreshCw, User as UserIcon, ChevronDown, ChevronUp, Plus, Trash2, Mic, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef, useEffect } from 'react';
import { Track, UserProfile } from '../types';
import { supabase, uploadCover, fetchAllProfiles } from '../lib/supabase';

const encodeAudioToBase64 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Use Web Audio API to decode
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Extract 5 seconds
  const duration = Math.min(5, audioBuffer.duration);
  const sampleRate = 44100;
  const length = duration * sampleRate;
  
  const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  
  const renderedBuffer = await offlineCtx.startRendering();
  const channelData = renderedBuffer.getChannelData(0);
  
  const buffer = new ArrayBuffer(channelData.length * 2);
  const view = new DataView(buffer);
  
  for (let i = 0; i < channelData.length; i++) {
    let s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return window.btoa(binary);
};

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (track: Omit<Track, 'id'> | Omit<Track, 'id'>[]) => void;
  onUpdate?: (track: Partial<Track>) => Promise<void>;
  userProfile: UserProfile | null;
  editTrack?: Track | null;
}

type ValidationErrors = {
  audio?: string;
  cover?: string;
  title?: string;
  artist?: string;
};

interface DraftTrack {
  id: string;
  audioFile: File | null;
  coverFile: File | null;
  title: string;
  artist: string;
  coverPreview: string | null;
  validationErrors: ValidationErrors;
}

export default function UploadModal({ isOpen, onClose, onUpload, onUpdate, userProfile, editTrack }: UploadModalProps) {
  const isEditing = !!editTrack;
  const [dragActive, setDragActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState<Record<string, boolean>>({});
  const [isAutoFillingAll, setIsAutoFillingAll] = useState(false);
  const [autoFillAllComplete, setAutoFillAllComplete] = useState(false);
  const [autoFillProgress, setAutoFillProgress] = useState(0);
  const [autoFillErrors, setAutoFillErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'preflight' | 'cover' | 'audio' | 'saving'>('preflight');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  
  const [drafts, setDrafts] = useState<DraftTrack[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [customUploaderName, setCustomUploaderName] = useState(
    userProfile?.role === 'owner' ? 'Jovan Fernandes' : (userProfile?.display_name || 'Anonymous')
  );
  
  const [adminProfiles, setAdminProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (isOpen && userProfile?.role === 'owner') {
      fetchAllProfiles().then(profiles => {
        if (profiles.length > 0) setAdminProfiles(profiles);
      });
    }
  }, [isOpen, userProfile]);

  const handleUploaderNameChange = (newName: string) => {
    const oldName = customUploaderName;
    setCustomUploaderName(newName);
    setDrafts(prev => prev.map(d => 
      d.artist === oldName || d.artist === '' ? { ...d, artist: newName } : d
    ));
  };
  // If editing, skip the audio upload step
  const [step, setStep] = useState<'upload' | 'details'>(isEditing ? 'details' : 'upload');

  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editTrack) {
      setDrafts([{
        id: editTrack.id,
        audioFile: null,
        coverFile: null,
        title: editTrack.title,
        artist: editTrack.artist,
        coverPreview: editTrack.coverUrl,
        validationErrors: {}
      }]);
      setExpandedId(editTrack.id);
      setStep('details');
    } else {
      setDrafts([]);
      setExpandedId(null);
      setStep('upload');
    }
  }, [editTrack, isOpen]);

  // Clear field-level error when user fixes it
  const updateDraft = (id: string, updates: Partial<DraftTrack>) => {
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d;
      const updated = { ...d, ...updates };
      // Clear errors if fixed
      if (updates.title !== undefined && updated.validationErrors.title) {
         updated.validationErrors = { ...updated.validationErrors, title: undefined };
      }
      if (updates.artist !== undefined && updated.validationErrors.artist) {
         updated.validationErrors = { ...updated.validationErrors, artist: undefined };
      }
      if (updates.coverFile !== undefined && updated.validationErrors.cover) {
         updated.validationErrors = { ...updated.validationErrors, cover: undefined };
      }
      return updated;
    }));
  };

  const removeDraft = (id: string) => {
    setDrafts(prev => {
      const next = prev.filter(d => d.id !== id);
      if (next.length === 0) setStep('upload');
      else if (expandedId === id) setExpandedId(next[0].id);
      return next;
    });
  };

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

  const handleFilesSelect = (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(f => {
      const name = f.name.toLowerCase();
      const ext = name.split('.').pop() || '';
      const isAudioOrVideoExt = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'mp4', 'webm'].includes(ext);
      return f.type.startsWith('audio/') || f.type.startsWith('video/') || isAudioOrVideoExt;
    });
    if (newFiles.length === 0) return;
    
    const filesToAdd = newFiles;

    const newDrafts: DraftTrack[] = filesToAdd.map(file => ({
      id: Math.random().toString(36).substring(7),
      audioFile: file,
      coverFile: null,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: customUploaderName,
      coverPreview: null,
      validationErrors: {}
    }));

    setDrafts(prev => [...prev, ...newDrafts]);
    if (!expandedId) setExpandedId(newDrafts[0].id);
    setStep('details');
  };

  const autoFillMetadata = async (draftId: string, file: File) => {
    try {
      console.log('Starting Auto-Fill for', file.name);
      setIsRecognizing(prev => ({ ...prev, [draftId]: true }));
      
      // Yield to the browser so "Listening..." renders
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log('Encoding audio...');
      const base64Audio = await encodeAudioToBase64(file);
      console.log('Audio encoded, calling edge function...');
      
      const { data, error } = await supabase.functions.invoke('recognize-audio', {
        body: { base64Audio }
      });
      
      if (error) throw error;
      
      if (data && data.found) {
        console.log('Match found:', data);
        const updates: Partial<DraftTrack> = {};
        if (data.title) updates.title = data.title;
        if (data.artist) updates.artist = data.artist;
        
        if (data.cover) {
           try {
             const res = await fetch(data.cover);
             const blob = await res.blob();
             updates.coverFile = new File([blob], 'cover.jpg', { type: blob.type });
             
             const reader = new FileReader();
             reader.onloadend = () => {
               updates.coverPreview = reader.result as string;
               updateDraft(draftId, updates);
             };
             reader.readAsDataURL(blob);
           } catch (imgError) {
             console.error('Failed to load cover art image:', imgError);
             updateDraft(draftId, updates); // apply title/artist even if cover fails
           }
        } else {
           updateDraft(draftId, updates);
        }
        return true; // Success
      } else {
        console.log('No match found.');
        return false; // Not found
      }
    } catch (error) {
      console.error('Error recognizing audio:', error);
      throw error;
    } finally {
      setIsRecognizing(prev => ({ ...prev, [draftId]: false }));
    }
  };

  const handleAutoFillSingle = async (draftId: string, file: File) => {
    try {
      const success = await autoFillMetadata(draftId, file);
      if (!success) alert('Could not recognize the song.');
    } catch (error) {
      alert('An error occurred during recognition. Check console.');
    }
  };

  const handleAutoFillAll = async () => {
    if (drafts.length === 0) return;
    setIsAutoFillingAll(true);
    setAutoFillAllComplete(false);
    setAutoFillProgress(0);
    setAutoFillErrors([]);
    
    const errors: string[] = [];
    let completed = 0;
    
    for (const draft of drafts) {
      if (!draft.audioFile) continue;
      
      try {
        const success = await autoFillMetadata(draft.id, draft.audioFile);
        if (!success) errors.push(`Could not recognize: ${draft.audioFile.name}`);
      } catch (err) {
        errors.push(`Error on: ${draft.audioFile.name}`);
      }
      completed++;
      setAutoFillProgress(Math.round((completed / drafts.length) * 100));
    }
    
    if (errors.length > 0) {
      setAutoFillErrors(errors);
    }
    setIsAutoFillingAll(false);
    setAutoFillAllComplete(true);
  };

  const handlePublish = async () => {
    let hasErrors = false;
    const validatedDrafts = drafts.map(draft => {
      const errors: ValidationErrors = {};
      if (!isEditing && !draft.audioFile) errors.audio = 'Audio file required';
      if (!isEditing && !draft.coverFile && !draft.coverPreview) errors.cover = 'Cover required';
      if (!draft.title.trim()) errors.title = 'Title required';
      if (!draft.artist.trim()) errors.artist = 'Artist required';
      
      if (Object.keys(errors).length > 0) hasErrors = true;
      return { ...draft, validationErrors: errors };
    });

    if (hasErrors) {
      setDrafts(validatedDrafts);
      // Expand the first draft with an error
      const firstErrorDraft = validatedDrafts.find(d => Object.keys(d.validationErrors).length > 0);
      if (firstErrorDraft) setExpandedId(firstErrorDraft.id);
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
      const userId = user.id;

      if (isEditing && onUpdate && editTrack) {
        // Edit Mode Pipeline
        setUploadPhase('saving');
        setUploadProgress(20);
        
        const draft = drafts[0];
        let newCoverUrl = editTrack.coverUrl;
        let newCoverPath = editTrack.coverPath;

        if (draft.coverFile) {
          setUploadPhase('cover');
          setUploadProgress(40);
          
          const coverRes = await uploadCover(userId, Date.now(), draft.coverFile);
          if (!coverRes) throw new Error('Failed to upload cover to Supabase Storage');
          
          newCoverPath = coverRes.path;
          newCoverUrl = coverRes.url;
        }

        setUploadPhase('saving');
        setUploadProgress(80);

        await onUpdate({
          title: draft.title.trim(),
          artist: draft.artist.trim(),
          ...(draft.coverFile ? { coverUrl: newCoverUrl, coverPath: newCoverPath } : {}),
        });

      } else {
        // Create Mode Pipeline (Multiple Tracks)
        const finalTracks: Omit<Track, 'id'>[] = [];
        const totalDrafts = drafts.length;
        
        for (let i = 0; i < totalDrafts; i++) {
          const draft = drafts[i];
          const baseProgress = (i / totalDrafts) * 100;
          const chunk = 100 / totalDrafts;
          
          setExpandedId(draft.id); // Show progress on current track
          
          const timestamp = Date.now() + i; // unique timestamp

          // 1. Secure Handshake with Google
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-drive-token');
          if (tokenError || !tokenData?.accessToken) throw new Error('Failed to securely handshake with Google Drive.');
          const accessToken = tokenData.accessToken;

          // Helper to upload to Google Drive
          const uploadToDrive = async (file: File, name: string) => {
            const metadata = { name, parents: ['1gVrrtcHtiJuTJpsgvvgl-amY8Pf2Z7ST'] };
            
            // 1. Init resumable upload
            const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Type': file.type || 'application/octet-stream',
                'X-Upload-Content-Length': file.size.toString()
              },
              body: JSON.stringify(metadata)
            });
            
            if (!initRes.ok) throw new Error('Failed to init Google Drive resumable upload');
            const location = initRes.headers.get('Location');
            if (!location) throw new Error('No upload location received from Google Drive');
            
            // 2. Upload file content to the location URL
            const uploadRes = await fetch(location, {
              method: 'PUT',
              headers: { 'Content-Type': file.type || 'application/octet-stream' },
              body: file
            });
            
            if (!uploadRes.ok) throw new Error('Google Drive upload rejected');
            const data = await uploadRes.json();
            
            await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: 'reader', type: 'anyone' })
            });

            return {
              path: data.id,
              url: `https://drive.google.com/uc?export=download&id=${data.id}`
            };
          };

          // Upload Cover
          setUploadPhase('cover');
          setUploadProgress(baseProgress + (chunk * 0.2));
          let coverPath = '';
          let coverUrl = '';
          if (draft.coverFile) {
            const coverRes = await uploadCover(userId, timestamp, draft.coverFile);
            if (!coverRes) throw new Error('Failed to upload cover to Supabase Storage');
            coverPath = coverRes.path;
            coverUrl = coverRes.url;
          }

          // Upload Audio
          setUploadPhase('audio');
          setUploadProgress(baseProgress + (chunk * 0.6));
          const audioExt = draft.audioFile!.name.split('.').pop() || 'mp3';
          const audioRes = await uploadToDrive(draft.audioFile!, `${userId}-${timestamp}-audio.${audioExt}`);
          const audioPath = audioRes.path;
          const audioUrl = `https://olautjilfmaqnwpnvkqa.supabase.co/functions/v1/stream-track?id=${audioRes.path}`;

          // Build track object
          setUploadPhase('saving');
          setUploadProgress(baseProgress + (chunk * 0.9));

          const isVideo = draft.audioFile!.type.startsWith('video/');
          
          finalTracks.push({
            title: draft.title.trim(),
            artist: draft.artist.trim(),
            album: 'Akamo Upload',
            coverUrl,
            audioUrl,
            coverPath,
            audioPath,
            duration: 240, 
            type: isVideo ? 'video' : 'audio',
            uploadedAt: timestamp,
          });
        }

        setUploadProgress(95);
        await onUpload(finalTracks);
      }

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
    setDrafts([]);
    setExpandedId(null);
    setStep('upload');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
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
            className="relative w-full max-w-3xl liquid-glass rounded-[3rem] p-6 md:p-10 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-spotify-green/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <button
              onClick={!uploading ? onClose : undefined}
              className={`absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-spotify-text-muted hover:text-spotify-text hover:bg-white/10 transition-all z-20 ${uploading ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <X size={24} />
            </button>

            <div className="relative z-10 text-center mb-8 shrink-0">
              <h2 className="text-3xl md:text-4xl font-bold mb-2 tracking-tighter text-spotify-text">
                {isEditing ? 'Edit Sound' : 'Publish Sounds'}
              </h2>
              <p className="text-spotify-text-muted opacity-60 font-medium text-sm">
                {isEditing ? 'Update your track details.' : 'Broadcast your frequencies to the global network.'}
              </p>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="relative z-10 mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 shrink-0"
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

            <div className="relative z-10 flex-1 min-h-0 flex flex-col">
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,audio/mpeg,.mp3,.wav,audio/wav,audio/x-wav,audio/flac,.flac,video/mp4"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFilesSelect(e.target.files);
                    // Reset value so selecting the same file again works
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
              {step === 'upload' ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => audioInputRef.current?.click()}
                  className={`flex-1 min-h-[300px] border-2 border-dashed rounded-[2.5rem] p-10 md:p-16 flex flex-col items-center justify-center gap-6 transition-all duration-500 cursor-pointer ${
                    dragActive 
                      ? 'border-spotify-green bg-spotify-green/10 scale-105' 
                      : 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="w-20 h-20 liquid-glass rounded-3xl flex items-center justify-center text-spotify-text-muted group-hover:text-spotify-green transition-all shadow-xl group-hover:rotate-12">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-xl md:text-2xl tracking-tighter text-spotify-text">Synchronize Audio</span>
                    <span className="text-sm text-spotify-text-muted font-medium opacity-60">Drag assets here or select manually</span>
                    <span className="block text-[10px] text-spotify-green font-bold uppercase tracking-widest mt-3 animate-pulse">WAV & FLAC files are now supported</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 no-scrollbar">
{/* Auto-Fill All Tracks */}
                  
                  {!isEditing && (
                    <div className="mb-6">
                      <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">Publishing As</label>
                      <div className="w-full h-14 bg-white/[0.03] rounded-2xl px-6 flex items-center gap-3 border border-white/5 relative">
                        <div className="w-8 h-8 rounded-full bg-spotify-green/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {userProfile?.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={14} className="text-spotify-green" />
                          )}
                        </div>
                        {userProfile?.role === 'owner' ? (
                          <div className="flex-1">
                            <select 
                              value={customUploaderName || 'Jovan Fernandes'}
                              onChange={(e) => handleUploaderNameChange(e.target.value)}
                              className="bg-transparent text-sm text-spotify-text font-medium w-full focus:outline-none appearance-none cursor-pointer"
                            >
                              <option value="Jovan Fernandes" className="bg-spotify-black text-white">Jovan Fernandes</option>
                              <option value="Akamo (Admin)" className="bg-spotify-black text-white">Akamo (Admin)</option>
                              {adminProfiles
                                .filter(p => p.display_name !== 'Jovan Fernandes' && p.display_name !== 'Akamo (Admin)')
                                .map(p => (
                                  <option key={p.id} value={p.display_name} className="bg-spotify-black text-white">
                                    {p.display_name}
                                  </option>
                              ))}
                              <option value="Anonymous" className="bg-spotify-black text-white">Anonymous</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-16 flex items-center px-2 text-spotify-text-muted">
                              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-spotify-text font-medium truncate flex-1">
                            {customUploaderName || 'Jovan Fernandes'}
                          </span>
                        )}
                        <span className="ml-auto text-[9px] text-spotify-text-muted uppercase tracking-widest font-bold opacity-40 shrink-0">
                          {userProfile?.role === 'owner' ? 'Admin' : 'Read Only'}
                        </span>
                      </div>
                    </div>
                  )}

                  {drafts.length > 1 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-spotify-text">Auto-Fill All Tracks</h4>
                          <p className="text-[10px] text-spotify-text-muted mt-1 uppercase tracking-widest">Recognize all {drafts.length} songs automatically</p>
                        </div>
                        <motion.button
                          onClick={handleAutoFillAll}
                          disabled={isAutoFillingAll || autoFillAllComplete}
                          whileHover={!isAutoFillingAll && !autoFillAllComplete ? { scale: 1.04, y: -1 } : {}}
                          whileTap={!isAutoFillingAll && !autoFillAllComplete ? { scale: 0.97 } : {}}
                          className="autofill-btn"
                          style={autoFillAllComplete ? { opacity: 0.45, cursor: 'default' } : {}}
                        >
                          {isAutoFillingAll ? (
                            <>
                              <Loader2 size={13} className="animate-spin opacity-70" />
                              <span>{autoFillProgress}%</span>
                            </>
                          ) : autoFillAllComplete ? (
                            <>
                              <CheckCircle2 size={13} className="text-green-400" />
                              <span>Done</span>
                            </>
                          ) : (
                            <>
                              <Mic size={13} className="relative z-10" />
                              <span className="relative z-10">Identify All Songs</span>
                              <span className="autofill-beta-pill relative z-10">BETA</span>
                            </>
                          )}
                        </motion.button>
                      </div>
                      
                      {isAutoFillingAll && (
                        <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden mt-2">
                          <motion.div 
                            className="bg-spotify-green h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${autoFillProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      )}

                      {autoFillErrors.length > 0 && (
                        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Errors ({autoFillErrors.length}):</p>
                          <ul className="text-[10px] text-red-400/80 list-disc list-inside">
                            {autoFillErrors.map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    {drafts.map((draft, index) => {
                      const isExpanded = expandedId === draft.id;
                      const hasError = Object.keys(draft.validationErrors).length > 0;
                      
                      return (
                        <div key={draft.id} className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                          isExpanded ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5 hover:border-white/10'
                        } ${hasError && !isExpanded ? 'border-red-500/30' : ''}`}>
                          
                          {/* Accordion Header */}
                          <div 
                            onClick={() => setExpandedId(isExpanded ? null : draft.id)}
                            className="p-4 md:px-6 md:py-4 flex items-center gap-4 cursor-pointer select-none"
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isExpanded ? 'bg-spotify-green text-black' : 'bg-white/5 text-spotify-text-muted'
                            } ${hasError && !isExpanded ? 'bg-red-500/20 text-red-400' : ''}`}>
                              {draft.coverPreview ? (
                                <img src={draft.coverPreview} alt="" className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <Music size={18} />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-spotify-text truncate">{draft.title || 'Untitled Track'}</h3>
                              <p className="text-[10px] text-spotify-text-muted truncate uppercase tracking-widest mt-0.5">
                                {draft.audioFile?.name || 'Original Audio'}
                              </p>
                            </div>
                            
                            {hasError && !isExpanded && (
                              <AlertCircle size={16} className="text-red-500 shrink-0" />
                            )}

                            {!isEditing && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeDraft(draft.id); }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-spotify-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}

                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-spotify-text-muted shrink-0">
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                          </div>

                          {/* Accordion Body */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="px-4 pb-6 md:px-6"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
                                  {/* Cover Upload */}
                                  <div className="col-span-1">
                                    <div 
                                      onClick={() => {
                                        const input = document.getElementById(`cover-${draft.id}`);
                                        if(input) input.click();
                                      }}
                                      className={`aspect-square relative rounded-3xl overflow-hidden cursor-pointer group bg-white/5 border transition-all ${
                                        draft.validationErrors.cover ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-white/10'
                                      }`}
                                    >
                                      {draft.coverPreview ? (
                                        <img src={draft.coverPreview} alt="Cover" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-spotify-text-muted gap-2">
                                           <ImageIcon size={40} />
                                           <span className="text-[10px] font-bold uppercase tracking-widest">Upload Cover</span>
                                           {draft.validationErrors.cover && (
                                             <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest mt-1">Required</span>
                                           )}
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                         <Upload size={24} className="text-white" />
                                      </div>
                                      <input 
                                        id={`cover-${draft.id}`}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              updateDraft(draft.id, { coverFile: file, coverPreview: reader.result as string });
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Metadata */}
                                  <div className="col-span-1 md:col-span-2 space-y-4">
                                    <div className="flex justify-end mb-[-8px]">
                                      <motion.button
                                        onClick={() => draft.audioFile && handleAutoFillSingle(draft.id, draft.audioFile)}
                                        disabled={isRecognizing[draft.id]}
                                        whileHover={!isRecognizing[draft.id] ? { scale: 1.04, y: -1 } : {}}
                                        whileTap={!isRecognizing[draft.id] ? { scale: 0.97 } : {}}
                                        className="autofill-btn"
                                      >
                                        {isRecognizing[draft.id] ? (
                                          <>
                                            <Loader2 size={13} className="animate-spin opacity-70" />
                                            <span>Listening...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Mic size={13} className="relative z-10" />
                                            <span className="relative z-10">Identify Song</span>
                                            <span className="autofill-beta-pill relative z-10">BETA</span>
                                          </>
                                        )}
                                      </motion.button>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">Sound Title <span className="text-red-500">*</span></label>
                                      <input 
                                        type="text"
                                        value={draft.title}
                                        onChange={(e) => updateDraft(draft.id, { title: e.target.value })}
                                        placeholder="What's the track called?"
                                        className={`w-full h-14 bg-white/5 rounded-2xl px-6 text-spotify-text focus:outline-none focus:ring-2 border transition-all ${
                                          draft.validationErrors.title ? 'border-red-500/50 focus:ring-red-500/30' : 'border-white/5 focus:ring-spotify-green/20'
                                        }`}
                                      />
                                      {draft.validationErrors.title && (
                                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                          className="text-[10px] text-red-400 font-bold mt-1.5 ml-4 uppercase tracking-widest"
                                        >{draft.validationErrors.title}</motion.p>
                                      )}
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">Artist Name <span className="text-red-500">*</span></label>
                                      <input 
                                        type="text"
                                        value={draft.artist}
                                        onChange={(e) => updateDraft(draft.id, { artist: e.target.value })}
                                        placeholder="Who created this?"
                                        className={`w-full h-14 bg-white/5 rounded-2xl px-6 text-spotify-text focus:outline-none focus:ring-2 border transition-all ${
                                          draft.validationErrors.artist ? 'border-red-500/50 focus:ring-red-500/30' : 'border-white/5 focus:ring-spotify-green/20'
                                        }`}
                                      />
                                      {draft.validationErrors.artist && (
                                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                          className="text-[10px] text-red-400 font-bold mt-1.5 ml-4 uppercase tracking-widest"
                                        >{draft.validationErrors.artist}</motion.p>
                                      )}
                                    </div>

                                    </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {!isEditing && (
                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-white/10 hover:border-white/20 rounded-3xl flex items-center justify-center gap-2 text-spotify-text-muted hover:text-spotify-text transition-colors mt-2"
                    >
                      <Plus size={18} />
                      <span className="text-xs font-bold uppercase tracking-widest">Add another track</span>
                    </button>
                  )}
                  
                  {/* Footer Actions */}
                  <div className="pt-6 space-y-4 shrink-0 mt-auto">
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
                       disabled={uploading || success || drafts.length === 0}
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
                         <span>{isEditing ? 'Save Changes' : `Publish ${drafts.length > 1 ? `${drafts.length} Frequencies` : 'Frequency'}`}</span>
                       )}
                    </button>
                    <button 
                      onClick={!uploading ? resetForm : undefined}
                      className={`w-full text-xs font-bold text-spotify-text-muted hover:text-white transition-colors pb-2 ${uploading ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      {isEditing ? 'Cancel Edit' : 'Cancel Transmission'}
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
