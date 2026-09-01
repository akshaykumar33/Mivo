'use client';

import * as React from 'react';
import { Modal, Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useCommunityStore } from '@/stores/communityStore';
import { ChannelType, ChannelDTO } from '@mivo/shared';
import { Hash, Volume2, Video } from 'lucide-react';

export interface CreateChannelModalProps {
  communityId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ communityId, isOpen, onClose }) => {
  const selectCommunity = useCommunityStore((s) => s.selectCommunity);

  const [name, setName] = React.useState('');
  const [topic, setTopic] = React.useState('');
  const [type, setType] = React.useState<ChannelType>('GENERAL');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await api.post<ChannelDTO>(`/api/v1/communities/${communityId}/channels`, {
      name: name.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      topic: topic || undefined,
      type,
    });

    setIsLoading(false);

    if (res.success) {
      await selectCommunity(communityId);
      onClose();
      setName('');
      setTopic('');
    } else {
      setError(res.error?.message || 'Failed to create channel');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Channel" description="Organize your community with specialized channels.">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Channel Type Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Channel Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'GENERAL', label: 'General', icon: Hash },
              { id: 'VOICE', label: 'Voice', icon: Volume2 },
              { id: 'MEDIA', label: 'Media', icon: Video },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = type === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id as ChannelType)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-xs font-medium cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600/20 border-violet-500 text-[var(--text-primary)]'
                      : 'bg-[var(--bg-surface-1)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-violet-500/50 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-violet-400' : 'text-[var(--text-muted)]'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Channel Name"
          placeholder="e.g. design-critique"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Topic / Purpose"
          placeholder="What is this channel for?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Channel
          </Button>
        </div>
      </form>
    </Modal>
  );
};
