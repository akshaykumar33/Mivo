'use client';

import * as React from 'react';
import { Modal, Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useCommunityStore } from '@/stores/communityStore';
import { CommunityDTO } from '@mivo/shared';
import { useRouter } from 'next/navigation';
import { storageClient } from '@/lib/storage-client';
import { Camera, Loader2 } from 'lucide-react';

export interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const fetchCommunities = useCommunityStore((s) => s.fetchCommunities);

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [iconUrl, setIconUrl] = React.useState('');
  const [isUploadingIcon, setIsUploadingIcon] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIcon(true);
    try {
      const uploaded = await storageClient.uploadFile(file, 'communities');
      setIconUrl(uploaded.url);
    } catch (err: any) {
      console.error('Failed to upload community icon:', err);
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await api.post<CommunityDTO>('/api/v1/communities', {
      name,
      slug,
      description: description || undefined,
      iconUrl: iconUrl || undefined,
      visibility: 'PUBLIC',
    });

    setIsLoading(false);

    if (res.success && res.data) {
      await fetchCommunities();
      onClose();
      router.push(`/communities/${res.data.id}`);
    } else {
      setError(res.error?.message || 'Failed to create community');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a Community" description="Your community is where you and your friends or team communicate.">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Community Icon Upload */}
        <div className="flex items-center gap-4 p-3 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)]">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-600 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden flex-shrink-0 relative group shadow-sm"
            title="Upload custom icon"
          >
            {iconUrl ? (
              <img src={iconUrl} alt="Community Icon" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-6 h-6 text-red-600" />
            )}
            {isUploadingIcon && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold text-[#111827] font-display">Community Icon</p>
            <p className="text-[11px] text-[#71717A]">Upload an avatar for your space</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingIcon}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer mt-0.5"
            >
              {isUploadingIcon ? 'Uploading...' : 'Choose file...'}
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleIconUpload}
            accept="image/*"
            className="hidden"
          />
        </div>

        <Input
          label="Community Name"
          placeholder="e.g. Design Guild"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />

        <Input
          label="URL Slug"
          placeholder="design-guild"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Tell members what this community is all about..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Community
          </Button>
        </div>
      </form>
    </Modal>
  );
};
