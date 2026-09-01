'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChannelSidebar } from '@/features/channels/ChannelSidebar';
import { useCommunityStore } from '@/stores/communityStore';
import { Button } from '@mivo/ui';
import { MessageSquare, Users, Shield } from 'lucide-react';
import Link from 'next/link';

export default function CommunityPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = params.communityId as string;
  const { activeCommunity } = useCommunityStore();

  // Auto-route to first room if present
  React.useEffect(() => {
    if (activeCommunity?.channels?.[0]?.rooms?.[0]) {
      const firstRoom = activeCommunity.channels[0].rooms[0];
      router.replace(`/communities/${communityId}/rooms/${firstRoom.id}`);
    }
  }, [activeCommunity, communityId, router]);

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <ChannelSidebar communityId={communityId} />

      <div className="flex-1 bg-[var(--bg-canvas)] flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-violet-600/20 text-violet-400 flex items-center justify-center mb-4 border border-violet-500/30">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">
          {activeCommunity?.name || 'Community Overview'}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm">
          Select a channel or room from the sidebar to start collaborating.
        </p>
      </div>
    </div>
  );
}
