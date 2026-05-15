import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Check, Loader2, ArrowLeft, User as UserIcon, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import { uploadAvatar, upsertProfile } from '../lib/supabase';
import { isOwner } from '../constants';
import AuroraBadge from './AuroraBadge';
import { User } from '@supabase/supabase-js';

interface AccountSettingsProps {
  user: User;
  userProfile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
  onBack: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

export default function AccountSettings({ user, userProfile, onProfileUpdate, onBack }: AccountSettingsProps) {
  const [displayName, setDisplayName] = useState(userProfile.display_name || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userProfile.avatar_url);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);

  const owner = isOwner(userProfile.role);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }
    pendingFile.current = file;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    setError('');
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Display name cannot be empty.');
      return;
    }
    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      let newAvatarUrl = userProfile.avatar_url;

      // Upload avatar if a new file was selected
      if (pendingFile.current) {
        const url = await uploadAvatar(user.id, pendingFile.current);
        if (url) {
          newAvatarUrl = url;
        } else {
          throw new Error('Avatar upload failed.');
        }
      }

      // Update profile in DB
      const updated = await upsertProfile(user.id, {
        display_name: displayName.trim(),
        avatar_url: newAvatarUrl,
      });

      if (!updated) throw new Error('Profile update failed.');

      onProfileUpdate(updated);
      pendingFile.current = null;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = displayName.trim() !== userProfile.display_name || pendingFile.current !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-2xl mx-auto"
    >
      {/* Back Button */}
      <motion.button
        onClick={onBack}
        whileHover={{ x: -4 }}
        className="flex items-center gap-2 text-spotify-text-muted hover:text-spotify-text transition-colors text-sm font-medium mb-8"
      >
        <ArrowLeft size={18} />
        <span className="tracking-wide">Back</span>
      </motion.button>

      <h1 className="text-4xl font-black tracking-tight text-spotify-text mb-2">Account Settings</h1>
      <p className="text-spotify-text-muted text-sm font-medium opacity-60 mb-10">Manage your identity on Akamo.</p>

      {/* ─── Avatar Section ─── */}
      <div className="liquid-glass rounded-[2.5rem] p-8 mb-6 border border-white/5">
        <h2 className="text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-6">Profile Photo</h2>
        
        <div className="flex items-center gap-8">
          {/* Avatar Circle */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-28 h-28 rounded-full cursor-pointer group flex-shrink-0 transition-all duration-300 ${
              isDragging ? 'scale-110 ring-4 ring-spotify-green/50' : ''
            } ${owner ? 'p-[3px] aurora-gradient' : ''}`}
          >
            <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${owner ? 'bg-[#121212]' : 'bg-white/5'}`}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-spotify-green/30 to-purple-500/30">
                  <span className="text-2xl font-black text-white/80">
                    {getInitials(displayName || userProfile.display_name || user.email || '')}
                  </span>
                </div>
              )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={24} className="text-white" />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-spotify-text font-medium mb-1">
              {avatarPreview ? 'Looking good!' : 'Add a profile photo'}
            </p>
            <p className="text-xs text-spotify-text-muted opacity-60">
              Click or drag an image. Max 5MB. JPG, PNG, or WebP.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Profile Info Section ─── */}
      <div className="liquid-glass rounded-[2.5rem] p-8 mb-6 border border-white/5">
        <h2 className="text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-6">Profile Info</h2>

        <div className="space-y-6">
          {/* Display Name */}
          <div>
            <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="w-full h-14 bg-white/5 rounded-2xl px-6 text-spotify-text focus:outline-none focus:ring-2 focus:ring-spotify-green/20 border border-white/5 transition-all"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">
              Email Address
            </label>
            <div className="w-full h-14 bg-white/[0.03] rounded-2xl px-6 flex items-center text-spotify-text-muted border border-white/5">
              <span className="text-sm truncate">{user.email}</span>
              <span className="ml-auto text-[9px] uppercase tracking-widest font-bold opacity-30">Read Only</span>
            </div>
          </div>

          {/* Role Badge */}
          <div>
            <label className="block text-[10px] font-bold text-spotify-text-muted uppercase tracking-widest mb-2 ml-4">
              Account Role
            </label>
            <div className="w-full h-14 bg-white/[0.03] rounded-2xl px-6 flex items-center gap-3 border border-white/5">
              <Shield size={16} className={owner ? 'text-spotify-green' : 'text-spotify-text-muted'} />
              {owner ? (
                <div className="flex items-center gap-3">
                  <AuroraBadge size="md" showTitle />
                </div>
              ) : (
                <span className="text-sm text-spotify-text-muted font-medium">Member</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Error / Save ─── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleSave}
        disabled={isSaving || !hasChanges}
        whileHover={!isSaving && hasChanges ? { y: -2, scale: 1.01 } : {}}
        whileTap={!isSaving && hasChanges ? { scale: 0.98 } : {}}
        className="w-full h-14 rounded-2xl text-sm font-bold tracking-widest uppercase overflow-hidden transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{
          background: hasChanges ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
          color: hasChanges ? 'black' : 'rgba(255,255,255,0.3)',
          boxShadow: hasChanges ? '0 8px 30px rgba(29, 185, 84, 0.25)' : 'none',
        }}
      >
        {isSaving ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Saving...</span>
          </>
        ) : saveSuccess ? (
          <>
            <Check size={16} />
            <span>Saved!</span>
          </>
        ) : (
          <span>Save Changes</span>
        )}
      </motion.button>
    </motion.div>
  );
}
