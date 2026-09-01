'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { ChannelSidebar } from '@/features/channels/ChannelSidebar';
import { UnifiedRoomView } from '@/features/rooms/UnifiedRoomView';

export default function RoomPage() {
  const params = useParams();
  const communityId = params.communityId as string;
  const roomId = params.roomId as string;

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Channel and Navigation Sidebar */}
      <ChannelSidebar communityId={communityId} />

      {/* Dynamic Unified Room Stage */}
      <UnifiedRoomView communityId={communityId} roomId={roomId} />
    </div>
  );
}
