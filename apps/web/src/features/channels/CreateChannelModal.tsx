'use client';

import * as React from 'react';
import { Modal, Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useCommunityStore } from '@/stores/communityStore';
import { ChannelDTO } from '@mivo/shared';

export interface CreateChannelModalProps {
  communityId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ communityId, isOpen, onClose }) => {
  const selectCommunity = useCommunityStore((s) => s.selectCommunity);

  const [name, setName] = React.useState('');
  const [topic, setTopic] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await api.post<ChannelDTO>(`/api/v1/communities/${communityId}/channels`, {
      name: name.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      topic: topic || undefined,
    });

    setIsLoading(false);

    if (res.success) {
      await selectCommunity(communityId);
      onClose();
      setName('');
      setTopic('');
    } else {
      setError(res.error?.message || 'Failed to create space');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Space" description="Organize your community with collaborative spaces.">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Space Name"
          placeholder="e.g. design-critique"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Topic / Purpose"
          placeholder="What is this space for?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Space
          </Button>
        </div>
      </form>
    </Modal>
  );
};
