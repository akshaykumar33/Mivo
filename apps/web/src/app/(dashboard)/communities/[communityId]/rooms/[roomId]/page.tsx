'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { ChannelSidebar } from '@/features/channels/ChannelSidebar';
import { UnifiedRoomView } from '@/features/rooms/UnifiedRoomView';
import { useNavigationStore } from '@/stores/navigationStore';

export default function RoomPage() {
  const params = useParams();
  const communityId = params.communityId as string;
  const roomId = params.roomId as string;
  const { isSidebarCollapsed } = useNavigationStore();

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      {/* Channel and Navigation Sidebar (Collapsible Tray) */}
      {!isSidebarCollapsed && (
        <ChannelSidebar
          communityId={communityId}
          className="hidden md:flex w-[270px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] backdrop-blur-2xl flex-col justify-between select-none flex-shrink-0 animate-fade-in"
        />
      )}

      {/* Dynamic Unified Room Stage */}
      <UnifiedRoomView communityId={communityId} roomId={roomId} />
    </div>
  );
}
