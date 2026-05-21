import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { UserStat } from '../types';
import { fetchUserStats } from '../lib/supabase';
import { Trophy, Users, Shield, Award, Medal } from 'lucide-react';
import AuroraBadge from './AuroraBadge';

export default function SocialView() {
  const [stats, setStats] = useState<UserStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserStats().then(data => {
      setStats(data);
      setIsLoading(false);
    });
  }, []);

  const totalUploads = stats.reduce((acc, user) => acc + user.upload_count, 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: 'spring', 
        stiffness: 400, 
        damping: 30 
      }
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] gpu-accelerated" size={24} />;
      case 1: return <Medal className="text-gray-300 drop-shadow-[0_0_15px_rgba(209,213,219,0.5)] gpu-accelerated" size={24} />;
      case 2: return <Award className="text-amber-600 drop-shadow-[0_0_15px_rgba(217,119,6,0.5)] gpu-accelerated" size={24} />;
      default: return <span className="text-lg font-bold text-spotify-text-muted opacity-50 w-6 text-center tabular-nums">{index + 1}</span>;
    }
  };

  const getRowStyle = (index: number) => {
    switch (index) {
      case 0: return 'bg-gradient-to-r from-yellow-500/10 to-transparent border-l-2 border-yellow-400';
      case 1: return 'bg-gradient-to-r from-gray-400/10 to-transparent border-l-2 border-gray-300';
      case 2: return 'bg-gradient-to-r from-amber-600/10 to-transparent border-l-2 border-amber-600';
      default: return 'hover:bg-white/5 border-l-2 border-transparent';
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-spotify-green border-t-transparent animate-spin gpu-accelerated" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full relative z-10 pb-20">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 relative"
      >
        <div className="absolute inset-0 bg-spotify-green/5 blur-[100px] pointer-events-none rounded-full gpu-accelerated" />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-2 gpu-accelerated" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
              Community
            </h1>
            <p className="text-spotify-text-muted text-lg tracking-wide max-w-lg">
              The heartbeat of Akamo. See who is driving the platform forward.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="liquid-glass rounded-2xl p-4 min-w-[120px] gpu-accelerated">
              <div className="flex items-center gap-2 text-spotify-text-muted mb-1">
                <Users size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Members</span>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{stats.length}</p>
            </div>
            <div className="liquid-glass rounded-2xl p-4 min-w-[120px] gpu-accelerated">
              <div className="flex items-center gap-2 text-spotify-text-muted mb-1">
                <Shield size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Total Assets</span>
              </div>
              <p className="text-3xl font-bold text-spotify-green text-glow tabular-nums">{totalUploads}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Leaderboard */}
      <div className="liquid-glass rounded-3xl p-2 md:p-6 shadow-2xl gpu-accelerated">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 mb-4">
          <h2 className="text-xs font-bold tracking-widest uppercase text-spotify-text-muted">Top Contributors</h2>
          <span className="text-xs font-bold tracking-widest uppercase text-spotify-text-muted">Uploads</span>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-2"
        >
          {stats.map((user, index) => (
            <motion.div 
              key={user.user_id}
              variants={itemVariants}
              className={`flex items-center justify-between p-3 md:p-4 rounded-xl transition-all duration-300 gpu-accelerated ${getRowStyle(index)}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 flex justify-center items-center">
                  {getRankIcon(index)}
                </div>
                
                <div className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-black/50 border border-white/10 shadow-lg shrink-0 gpu-accelerated">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users size={16} className="text-spotify-text-muted" />
                      </div>
                    )}
                  </div>
                  {index === 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-spotify-black animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.8)] gpu-accelerated" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm md:text-base truncate max-w-[120px] md:max-w-[180px] ${user.role === 'owner' ? 'aurora-text drop-shadow-[0_0_10px_rgba(255,0,110,0.6)] text-[15px] tracking-wide' : (index === 0 ? 'text-yellow-400 text-shadow-sm' : 'text-white')}`}>
                      {user.display_name}
                    </span>
                    {user.role === 'owner' && <AuroraBadge size="sm" />}
                  </div>
                  {index === 0 && <span className="text-[10px] text-yellow-500/70 font-bold uppercase tracking-widest mt-0.5">Legend</span>}
                </div>
              </div>

              <div className="flex items-center gap-3 pr-2">
                <div className="h-1.5 w-16 md:w-24 bg-white/5 rounded-full overflow-hidden hidden md:block gpu-accelerated">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((user.upload_count / (stats[0]?.upload_count || 1)) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 + (index * 0.05) }}
                    className={`h-full rounded-full gpu-accelerated ${index === 0 ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-spotify-green'}`}
                  />
                </div>
                <span className={`font-mono text-xl font-bold tabular-nums tracking-tighter ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                  {user.upload_count}
                </span>
              </div>
            </motion.div>
          ))}
          
          {stats.length === 0 && (
            <div className="text-center py-12 text-spotify-text-muted">
              No users found.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
