import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserProfile, SongRequest } from '../types';
import { fetchSongRequests, updateSongRequestStatus } from '../lib/supabase';
import { ArrowLeft, Loader2, Check, X, Inbox } from 'lucide-react';

interface AdminRequestsProps {
  userProfile: UserProfile;
  onBack: () => void;
}

export default function AdminRequests({ userProfile, onBack }: AdminRequestsProps) {
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSongRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load requests.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const success = await updateSongRequestStatus(id, status);
    if (success) {
      setRequests(requests.map(req => req.id === id ? { ...req, status } : req));
    } else {
      alert('Failed to update status.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-4xl mx-auto pb-24"
    >
      <motion.button
        onClick={onBack}
        whileHover={{ x: -4 }}
        className="flex items-center gap-2 text-spotify-text-muted hover:text-spotify-text transition-colors text-sm font-medium mb-8"
      >
        <ArrowLeft size={18} />
        <span className="tracking-wide">Back</span>
      </motion.button>

      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight text-spotify-text mb-2">Song Requests</h1>
        <p className="text-spotify-text-muted text-sm font-medium opacity-60">Manage community requests for new frequencies.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-spotify-green" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
          {error}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 liquid-glass rounded-[2.5rem] border border-white/5">
          <Inbox size={48} className="mx-auto text-spotify-text-muted mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-spotify-text mb-2">No pending requests</h3>
          <p className="text-sm text-spotify-text-muted">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="liquid-glass rounded-3xl p-5 flex items-center justify-between gap-4 border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-bold text-spotify-text truncate">{req.title}</h4>
                <div className="flex items-center gap-2 mt-2">
                  {req.user_name && (
                    <span className="text-[10px] uppercase tracking-widest text-spotify-text-muted font-bold mr-2 border border-white/10 px-2 py-0.5 rounded-full">
                      By <span className="text-white">{req.user_name}</span>
                    </span>
                  )}
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                    req.status === 'approved' ? 'bg-spotify-green/20 text-spotify-green' :
                    req.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                    'bg-white/10 text-spotify-text-muted'
                  }`}>
                    {req.status}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleUpdateStatus(req.id, 'approved')}
                  disabled={req.status === 'approved'}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1db954]/10 hover:bg-[#1db954]/20 text-[#1db954] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Check size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleUpdateStatus(req.id, 'rejected')}
                  disabled={req.status === 'rejected'}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <X size={20} />
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
