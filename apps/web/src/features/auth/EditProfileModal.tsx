'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api-client';
import { storageClient } from '@/lib/storage-client';
import { Avatar, Button, Input } from '@mivo/ui';
import { UserDTO, UpdateProfileInput } from '@mivo/shared';
import { X, Camera, Loader2, Sparkles, Check } from 'lucide-react';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuthStore();
  const [displayName, setDisplayName] = React.useState(user?.displayName || '');
  const [bio, setBio] = React.useState(user?.bio || '');
  const [customStatus, setCustomStatus] = React.useState(user?.customStatus || '');
  const [avatarUrl, setAvatarUrl] = React.useState(user?.avatarUrl || '');
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setCustomStatus(user.customStatus || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  if (!isOpen) return null;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploaded = await storageClient.uploadFile(file, 'avatars');
      setAvatarUrl(uploaded.url);
    } catch (err: any) {
      console.error('Failed to upload avatar:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload: UpdateProfileInput = {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        customStatus: customStatus.trim() || undefined,
        avatarUrl: avatarUrl ? avatarUrl : null,
      };

      const res = await api.patch<UserDTO>('/api/v1/users/me', payload);
      if (res.success && res.data) {
        updateUser(res.data);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#5E5CE6]/20 to-[#0A84FF]/20 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5E5CE6]/15 border border-[#5E5CE6]/30 flex items-center justify-center text-[#64D2FF]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-display">Edit Profile</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Custom avatar, display name & status</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Avatar Upload Container */}
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar
                size="lg"
                src={avatarUrl || undefined}
                fallbackText={displayName || user?.username}
                className="w-20 h-20 rounded-2xl ring-2 ring-[#5E5CE6]/40 shadow-lg object-cover"
              />
              <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#64D2FF]" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-xs font-semibold text-[#64D2FF] hover:underline cursor-pointer disabled:opacity-50"
            >
              {isUploading ? 'Uploading to Supabase Storage...' : 'Change Avatar (Supabase S3)'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#5E5CE6]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Custom Status
            </label>
            <input
              type="text"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="e.g. In a meeting 🎧"
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#5E5CE6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Tell others what you are working on..."
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#5E5CE6] resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-5 py-2 rounded-xl bg-gradient-to-tr from-[#5E5CE6] to-[#0A84FF] text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
