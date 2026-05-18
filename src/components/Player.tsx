import { 
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, 
  Volume2, Maximize2, Mic2, ListMusic, Laptop2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef, useEffect } from 'react';
import { Track, UserProfile, PlaybackContext } from '../types';
import { isFounder, isOwner } from '../constants';
import AuroraBadge from './AuroraBadge';
import { useComingSoon } from './ComingSoonToast';
import { supabase } from '../lib/supabase';

interface PlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  userProfile?: UserProfile | null;
  playbackContext?: PlaybackContext | null;
}

const ScrollingText = ({ text, className, speed = 30 }: { text: string; className: string; speed?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      setShouldScroll(textRef.current.offsetWidth > containerRef.current.offsetWidth);
    }
  }, [text]);

  return (
    <div ref={containerRef} className={`${className} overflow-hidden whitespace-nowrap relative`}>
      <motion.div
        animate={shouldScroll ? { x: [0, -(textRef.current?.offsetWidth || 0) - 40] } : { x: 0 }}
        transition={{
          duration: shouldScroll ? ((textRef.current?.offsetWidth || 0) / speed) : 0,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 1.5
        }}
        className="inline-block"
      >
        <span ref={textRef} className="inline-block pr-10">{text}</span>
        {shouldScroll && <span className="inline-block pr-10">{text}</span>}
      </motion.div>
    </div>
  );
};

export default function Player({ currentTrack, isPlaying, onTogglePlay, onNext, onPrev, userProfile, playbackContext }: PlayerProps) {
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isLooping, setIsLooping] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Check if the track's uploader is the founder
  const isCreator = isFounder(currentTrack?.ownerEmail);
  const { triggerComingSoon } = useComingSoon();
  const [uploaderName, setUploaderName] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTrack?.ownerId) {
      setUploaderName(currentTrack?.ownerEmail ? currentTrack.ownerEmail.split('@')[0] : null);
      return;
    }
    const fetchUploader = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', currentTrack.ownerId)
        .single();
      
      if (data && data.display_name) {
        setUploaderName(data.display_name);
      } else if (currentTrack.ownerEmail) {
        setUploaderName(currentTrack.ownerEmail.split('@')[0]);
      } else {
        setUploaderName(null);
      }
    };
    fetchUploader();
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.play().catch(() => {});
        } else {
            audioRef.current.pause();
        }
    }
  }, [isPlaying, currentTrack]);

  // Keep loop attribute in sync with state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping, currentTrack]);

  const handleToggleLoop = () => {
    setIsLooping(prev => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.loop = next;
      }
      return next;
    });
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (audioRef.current) {
      audioRef.current.currentTime = (val / 100) * audioRef.current.duration;
    }
  };

  const handleEnded = () => {
    // If looping, the audio element handles replay natively via .loop = true
    // If not looping, advance to the next track
    if (!isLooping) {
      onNext();
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex justify-center px-2 md:px-4 pb-2 md:pb-6 z-50">
      <div className="mobile-player liquid-glass rounded-[1.5rem] md:rounded-[2.5rem] px-3 md:px-8 h-[4.5rem] md:h-24 flex items-center justify-between gap-2 md:gap-8 relative overflow-hidden group/player w-full max-w-6xl">
        {/* Glow behind cover */}
        <div className="absolute left-0 top-0 w-40 h-full bg-spotify-green/10 blur-3xl pointer-events-none" />
        
        {/* Track Info */}
        <div className="flex items-center gap-2 md:gap-5 w-[30%] md:w-[30%] min-w-0 md:min-w-[240px] relative z-10">
          <AnimatePresence mode="wait">
            {currentTrack ? (
              <motion.div
                key={currentTrack.id}
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                className="flex items-center gap-2 md:gap-5 w-full"
              >
                <div className="player-cover w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex-shrink-0 group-hover/player:scale-105 transition-transform duration-500 relative"
                >
                  <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <ScrollingText 
                    text={currentTrack.title} 
                    className="text-xs md:text-base font-bold text-spotify-text hover:text-spotify-green transition-colors cursor-pointer tracking-tight" 
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <ScrollingText 
                        text={currentTrack.artist} 
                        className="text-[10px] md:text-xs text-spotify-text-muted hover:text-spotify-text transition-colors cursor-pointer opacity-70 tracking-wide font-medium min-w-0" 
                        speed={20}
                      />
                      {isCreator && (
                        <div className="flex-shrink-0 flex items-center hidden md:flex">
                          <AuroraBadge size="sm" />
                        </div>
                      )}
                    </div>
                    {uploaderName && (
                      <p className="text-[8px] md:text-[9px] text-spotify-text-muted opacity-60 font-medium truncate mt-0.5 hidden md:block">
                        Uploaded by <span className={isCreator ? 'aurora-text font-bold tracking-wide drop-shadow-md' : ''}>{uploaderName}</span>
                      </p>
                    )}
                  </div>
                  {playbackContext?.name && (playbackContext.type === 'album' || playbackContext.type === 'playlist') && (
                    <p className="text-[8px] md:text-[9px] text-spotify-text-muted opacity-50 font-medium truncate mt-0.5 hidden md:block">
                      From: <span className="text-spotify-green/80">{playbackContext.name}</span>
                    </p>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center gap-3 md:gap-5 opacity-20">
                 <div className="w-11 h-11 md:w-16 md:h-16 bg-white/10 rounded-xl md:rounded-2xl" />
                 <div className="flex flex-col gap-2">
                   <div className="w-20 md:w-32 h-3 md:h-4 bg-white/10 rounded-full" />
                   <div className="w-14 md:w-20 h-2 md:h-3 bg-white/10 rounded-full" />
                 </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-1 md:gap-2.5 flex-1 max-w-[500px] relative z-10">
          <div className="flex items-center gap-3 md:gap-8">
            <button onClick={triggerComingSoon} className="text-spotify-text-muted hover:text-spotify-text transition-all scale-90 hover:scale-110 active:scale-95 hidden md:flex items-center justify-center">
              <Shuffle size={18} />
            </button>
            <button onClick={onPrev} className="text-spotify-text-muted hover:text-spotify-text transition-all hover:scale-110 active:scale-90 flex items-center justify-center">
              <SkipBack size={18} className="md:w-[22px] md:h-[22px] fill-current" />
            </button>
            <motion.button
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={onTogglePlay}
              className="w-10 h-10 md:w-14 md:h-14 bg-white text-black rounded-full flex items-center justify-center hover:bg-spotify-green transition-all shadow-[0_8px_25px_rgba(29,185,84,0.3)] group/play"
            >
              {isPlaying ? (
                <Pause size={20} className="md:w-[28px] md:h-[28px] fill-current" />
              ) : (
                <Play size={20} className="md:w-[28px] md:h-[28px] fill-current ml-0.5" />
              )}
            </motion.button>
            <button onClick={onNext} className="text-spotify-text-muted hover:text-spotify-text transition-all hover:scale-110 active:scale-90 flex items-center justify-center">
              <SkipForward size={18} className="md:w-[22px] md:h-[22px] fill-current" />
            </button>
            <button 
              onClick={handleToggleLoop} 
              className={`transition-all scale-90 hover:scale-110 active:scale-95 hidden md:flex items-center justify-center ${
                isLooping 
                  ? 'text-spotify-green drop-shadow-[0_0_8px_rgba(29,185,84,0.6)]' 
                  : 'text-spotify-text-muted hover:text-spotify-text'
              }`}
              title={isLooping ? 'Loop: On' : 'Loop: Off'}
            >
              <Repeat size={18} />
              {isLooping && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-spotify-green rounded-full" />
              )}
            </button>
          </div>

          <div className="w-full flex items-center gap-2 md:gap-4 group">
            <span className="text-[9px] md:text-[10px] text-spotify-text-muted font-bold w-6 md:w-10 text-right tabular-nums opacity-60 hidden md:block">
              {audioRef.current ? formatTime(audioRef.current.currentTime) : '0:00'}
            </span>
            <div className="flex-1 relative h-1.5 flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={handleProgressChange}
                className="absolute w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-spotify-text group-hover:accent-spotify-green transition-all z-10 opacity-0"
              />
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden absolute">
                <motion.div 
                  className="h-full bg-white group-hover:bg-spotify-green rounded-full relative" 
                  style={{ width: `${progress}%` }} 
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl" />
                </motion.div>
              </div>
            </div>
            <span className="text-[9px] md:text-[10px] text-spotify-text-muted font-bold w-6 md:w-10 tabular-nums opacity-60 hidden md:block">
              {currentTrack ? formatTime(currentTrack.duration) : '0:00'}
            </span>
          </div>
        </div>

        {/* Volume & Extras — hidden on mobile */}
        <div className="hidden md:flex items-center justify-end gap-5 w-[30%] min-w-[200px] relative z-10">
          <div className="flex items-center gap-1">
            <button onClick={triggerComingSoon} className="text-spotify-text-muted hover:text-spotify-text hover:bg-white/10 p-2 rounded-full transition-all md:block hidden">
                <Mic2 size={16} />
            </button>
            <button onClick={triggerComingSoon} className="text-spotify-text-muted hover:text-spotify-text hover:bg-white/10 p-2 rounded-full transition-all md:block hidden">
                <ListMusic size={18} />
            </button>
            <button onClick={triggerComingSoon} className="text-spotify-text-muted hover:text-spotify-text hover:bg-white/10 p-2 rounded-full transition-all md:block hidden">
                <Laptop2 size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-3 w-32 group/vol">
              <Volume2 size={18} className="text-spotify-text-muted group-hover/vol:text-spotify-text transition-colors" />
              <div className="flex-1 relative h-1 flex items-center">
                  <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setVolume(v);
                          if (audioRef.current) audioRef.current.volume = v;
                      }}
                      className="absolute w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer z-10 opacity-0"
                  />
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden absolute">
                    <div 
                        className="h-full bg-white group-hover/vol:bg-spotify-green rounded-full transition-colors" 
                        style={{ width: `${volume * 100}%` }} 
                    />
                  </div>
              </div>
          </div>
          <button onClick={triggerComingSoon} className="text-spotify-text-muted hover:text-spotify-text transition-all hover:scale-110">
              <Maximize2 size={16} />
          </button>
        </div>

        {/* Mobile-only loop button (visible on small screens) */}
        <button 
          onClick={handleToggleLoop} 
          className={`md:hidden flex items-center justify-center p-2 rounded-full transition-all flex-shrink-0 ${
            isLooping 
              ? 'text-spotify-green bg-spotify-green/10' 
              : 'text-spotify-text-muted'
          }`}
        >
          <Repeat size={16} />
        </button>

        {currentTrack && (
          <audio
            ref={audioRef}
            src={currentTrack.audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            className="hidden"
          />
        )}
      </div>
    </div>
  );
}
