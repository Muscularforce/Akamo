import { motion, AnimatePresence } from 'motion/react';
import { X, Globe, Lock } from 'lucide-react';
import { useState } from 'react';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string, isPublic: boolean) => void;
  /** If provided, the track will be auto-added after creation */
  pendingTrackId?: string | null;
}

export default function CreatePlaylistModal({ isOpen, onClose, onCreate, pendingTrackId }: CreatePlaylistModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    onCreate(title.trim(), description.trim(), isPublic);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setIsPublic(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-spotify-black/80 backdrop-blur-3xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              x: shake ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={shake
              ? { x: { duration: 0.5, ease: 'easeInOut' } }
              : { type: 'spring', damping: 20, stiffness: 300 }
            }
            className="relative w-full max-w-md liquid-glass rounded-[3rem] p-8 md:p-10 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-spotify-green/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <button
              onClick={handleClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-spotify-text-muted hover:text-spotify-text hover:bg-white/10 transition-all z-20"
            >
              <X size={24} />
            </button>

            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tighter text-spotify-text">
                New Playlist
              </h2>
              <p className="text-spotify-text-muted opacity-60 font-medium text-sm mb-8">
                {pendingTrackId ? 'Create a new playlist and add the track.' : 'Create a fresh playlist for your music.'}
              </p>

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">
                    Playlist Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Awesome Playlist"
                    className="w-full h-14 bg-white/5 rounded-2xl px-6 text-spotify-text focus:outline-none focus:ring-2 focus:ring-spotify-green/20 border border-white/5 transition-all"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this playlist about?"
                    rows={3}
                    className="w-full bg-white/5 rounded-2xl px-6 py-4 text-spotify-text text-sm focus:outline-none focus:ring-2 focus:ring-spotify-green/20 border border-white/5 transition-all resize-none"
                  />
                </div>

                {/* Public/Private Toggle */}
                <div className="flex items-center justify-between bg-white/5 rounded-2xl px-6 py-4 border border-white/5">
                  <div className="flex items-center gap-3">
                    {isPublic ? (
                      <Globe size={16} className="text-spotify-green" />
                    ) : (
                      <Lock size={16} className="text-spotify-text-muted" />
                    )}
                    <div>
                      <p className="text-sm text-spotify-text font-medium">
                        {isPublic ? 'Public' : 'Private'}
                      </p>
                      <p className="text-[10px] text-spotify-text-muted opacity-60">
                        {isPublic ? 'Anyone can see this playlist' : 'Only you can see this playlist'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-12 h-7 rounded-full transition-all duration-300 relative ${isPublic ? 'bg-spotify-green' : 'bg-white/10'}`}
                  >
                    <motion.div
                      animate={{ x: isPublic ? 22 : 3 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-md"
                    />
                  </button>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!title.trim()}
                  className="w-full h-14 text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl accent-glow disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'var(--accent-gradient)' }}
                >
                  Create Playlist
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
