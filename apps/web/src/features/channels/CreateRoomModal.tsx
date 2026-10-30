'use client';

import * as React from 'react';
import { Modal, Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useCommunityStore } from '@/stores/communityStore';
import { RoomCommunicationMode, RoomDTO } from '@mivo/shared';
import { MessageSquare, Mic, Video, Monitor, Radio } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface CreateRoomModalProps {
  communityId: string;
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  communityId,
  channelId,
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const selectCommunity = useCommunityStore((s) => s.selectCommunity);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [activeMode, setActiveMode] = React.useState<RoomCommunicationMode>('TEXT');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await api.post<RoomDTO>(`/api/v1/rooms/channels/${channelId}`, {
      name,
      description: description || undefined,
      activeMode,
      maxCapacity: 100,
    });

    setIsLoading(false);

    if (res.success && res.data) {
      await selectCommunity(communityId);
      onClose();
      router.push(`/communities/${communityId}/rooms/${res.data.id}`);
    } else {
      setError(res.error?.message || 'Failed to create room');
    }
  };

  const modes = [
    { id: 'TEXT', label: 'Chat', icon: MessageSquare },
    { id: 'VOICE', label: 'Voice', icon: Mic },
    { id: 'VIDEO', label: 'Video', icon: Video },
    { id: 'SCREEN_SHARE', label: 'Screen', icon: Monitor },
    { id: 'STREAM', label: 'Stage', icon: Radio },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Unified Room" description="Create a room with dynamic communication modes.">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Initial Mode Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Initial Mode
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {modes.map((item) => {
              const Icon = item.icon;
              const isSelected = activeMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMode(item.id as RoomCommunicationMode)}
                  className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border transition-all text-[10px] sm:text-xs font-semibold cursor-pointer ${
                    isSelected
                      ? 'bg-red-500/15 border-red-500 text-red-700 shadow-sm shadow-red-500/10'
                      : 'bg-[var(--bg-surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-red-400 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mb-1 ${isSelected ? 'text-red-600' : 'text-[var(--text-muted)]'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Room Name"
          placeholder="e.g. Daily Standup Stage"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Description"
          placeholder="What happens in this room?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Room
          </Button>
        </div>
      </form>
    </Modal>
  );
};
