import { X, Upload, Music, FileVideo, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef } from 'react';
import { Track } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (track: Track) => void;
}

export default function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setUploading(true);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);
    
    const newTrack: Track = {
      id: Math.random().toString(36).substr(2, 9),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Anonymous Creator',
      album: 'Studio Session',
      coverUrl: isVideo 
        ? 'https://images.unsplash.com/photo-1492691523567-f610403597d6?q=80&w=300&h=300&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&h=300&auto=format&fit=crop',
      audioUrl: url,
      duration: 0, 
      type: isVideo ? 'video' : 'audio',
      uploadedAt: Date.now(),
    };

    onUpload(newTrack);
    setUploading(false);
    setSuccess(true);
    
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-spotify-black/80 backdrop-blur-3xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-xl liquid-glass rounded-[3rem] p-10 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10"
          >
            {/* Background elements for modal */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-spotify-green/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-spotify-text-muted hover:text-spotify-text hover:bg-white/10 transition-all z-20"
            >
              <X size={24} />
            </button>

            <div className="relative z-10 text-center mb-10">
              <h2 className="text-4xl font-bold mb-3 tracking-tighter text-spotify-text">Publish Sound</h2>
              <p className="text-spotify-text-muted opacity-60 font-medium">Broadcast your frequency to the global network.</p>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative z-10 group border-2 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-6 transition-all duration-500 cursor-pointer ${
                dragActive 
                  ? 'border-spotify-green bg-spotify-green/10 scale-105' 
                  : 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/mp4"
                onChange={handleChange}
                className="hidden"
              />

              {success ? (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4 text-spotify-green"
                >
                  <div className="w-20 h-20 rounded-full bg-spotify-green/20 flex items-center justify-center accent-glow">
                    <CheckCircle2 size={48} />
                  </div>
                  <span className="font-bold text-xl tracking-tight uppercase">Transmission Complete</span>
                </motion.div>
              ) : uploading ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                    <div className="absolute inset-0 border-4 border-spotify-green border-t-transparent rounded-full animate-spin accent-glow" />
                  </div>
                  <span className="text-spotify-text font-bold animate-pulse tracking-widest uppercase text-xs">Encoding data...</span>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 liquid-glass rounded-3xl flex items-center justify-center text-spotify-text-muted group-hover:text-spotify-green transition-all shadow-xl group-hover:rotate-12">
                    <Upload size={32} />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-bold text-2xl tracking-tighter text-spotify-text">Synchronize Files</span>
                    <span className="text-sm text-spotify-text-muted font-medium opacity-60">Drag assets here or select manually</span>
                  </div>
                  <div className="flex gap-6 mt-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-[10px] text-spotify-text-muted uppercase tracking-[0.2em] font-black border border-white/5">
                      <Music size={14} className="text-spotify-green" />
                      <span>Audio</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-[10px] text-spotify-text-muted uppercase tracking-[0.2em] font-black border border-white/5">
                      <FileVideo size={14} className="text-indigo-400" />
                      <span>Motion</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-10 relative z-10">
               <div className="p-6 liquid-glass rounded-3xl flex items-start gap-5 border border-white/5">
                 <div className="bg-spotify-green/20 text-spotify-green p-3 rounded-2xl shadow-xl accent-glow">
                    <Music size={24} />
                 </div>
                 <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-spotify-text mb-1">Quality Assurance</h4>
                    <p className="text-[10px] text-spotify-text-muted leading-relaxed font-medium opacity-70">
                        Hi-resolution formats (FLAC/WAV) are prioritized. Standard MP4 containers are recommended for visual sequences.
                    </p>
                 </div>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
