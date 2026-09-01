'use client';

import * as React from 'react';
import { Modal, Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useCommunityStore } from '@/stores/communityStore';
import { CommunityDTO } from '@mivo/shared';
import { useRouter } from 'next/navigation';

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
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await api.post<CommunityDTO>('/api/v1/communities', {
      name,
      slug,
      description: description || undefined,
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
            className="w-full rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
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
