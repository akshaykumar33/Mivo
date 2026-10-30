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
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [isGeneratingStatus, setIsGeneratingStatus] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleGenerateStatus = async () => {
    setIsGeneratingStatus(true);
    try {
      const savedKey = typeof window !== 'undefined' ? localStorage.getItem('mivo_gemini_api_key') : null;
      const cleanTopic = customStatus.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '').trim();

      const res = await api.post<{ statusText: string; engine: string }>('/api/v1/ai/generate-status', {
        topic: cleanTopic || undefined,
        availability: user?.status,
        apiKey: savedKey || undefined,
      });

      if (res.success && res.data?.statusText) {
        setCustomStatus(res.data.statusText);
      } else {
        const fallbacks = [
          'Deep work on deliverables',
          'In flow state — slow to reply',
          'Quick coffee recharge & planning',
          'Deploying updates & monitoring',
          'Syncing in collaborative reviews',
          'Squashing bugs & refactoring',
        ];
        setCustomStatus(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
      }
    } catch {
      const fallbacks = [
        'Deep work on sprint items',
        'In flow state — ping for urgent',
        'Quick coffee recharge',
        'Deploying updates',
      ];
      setCustomStatus(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
    } finally {
      setIsGeneratingStatus(false);
    }
  };

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

    setUploadError(null);
    setIsUploading(true);
    try {
      const uploaded = await storageClient.uploadFile(file, 'avatars');
      setAvatarUrl(uploaded.url);
    } catch (err: any) {
      console.error('Failed to upload avatar:', err);
      setUploadError(err.message || 'Failed to upload avatar');
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
      const cleanCustomStatus = customStatus
        .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D\u200E\u200B]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

      const payload: UpdateProfileInput = {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        customStatus: cleanCustomStatus || null,
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] relative custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary,#dc2626)]/15 border border-[var(--brand-primary,#dc2626)]/30 flex items-center justify-center text-[var(--brand-primary,#dc2626)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 id="edit-profile-title" className="text-base font-bold text-[var(--text-primary)] font-display">Edit Profile</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Custom avatar, display name & status</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
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
                className="w-20 h-20 rounded-2xl ring-2 ring-[var(--border-subtle)] shadow-lg object-cover"
              />
              <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
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
              className="text-xs font-semibold text-[var(--brand-primary,#dc2626)] hover:underline cursor-pointer disabled:opacity-50"
            >
              {isUploading ? 'Uploading avatar...' : 'Change Avatar'}
            </button>
            {uploadError && (
              <p className="text-[11px] text-rose-500 font-medium text-center">{uploadError}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] focus:ring-1 focus:ring-[var(--brand-primary,#dc2626)]/20 shadow-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Custom Status
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="e.g. In an architecture sync"
                className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] focus:ring-1 focus:ring-[var(--brand-primary,#dc2626)]/20 shadow-xs"
              />
              <button
                type="button"
                onClick={handleGenerateStatus}
                disabled={isGeneratingStatus}
                title="Generate status with AI"
                className="px-3 py-2 rounded-xl bg-[var(--brand-primary,#dc2626)]/10 hover:bg-[var(--brand-primary,#dc2626)]/15 border border-[var(--brand-primary,#dc2626)]/25 text-[var(--brand-primary,#dc2626)] flex items-center gap-1.5 flex-shrink-0 active:scale-95 transition-all cursor-pointer group disabled:opacity-60 shadow-xs"
              >
                {isGeneratingStatus ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--brand-primary,#dc2626)]" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary,#dc2626)]" />
                )}
                <span className="text-xs font-semibold hidden sm:inline">
                  {isGeneratingStatus ? 'Generating...' : 'Suggest'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Tell others what you are working on..."
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] focus:ring-1 focus:ring-[var(--brand-primary,#dc2626)]/20 resize-none shadow-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-5 py-2 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.985] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
