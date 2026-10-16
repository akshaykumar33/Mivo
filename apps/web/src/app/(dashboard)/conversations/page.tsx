'use client';

import * as React from 'react';
import { ConversationsSidebar } from '@/features/conversations/ConversationsSidebar';
import { ConversationView } from '@/features/conversations/ConversationView';
import { IncomingCallModal } from '@/features/conversations/IncomingCallModal';
import { ActiveCallOverlay } from '@/features/conversations/ActiveCallOverlay';

export default function ConversationsPage() {
  return (
    <div className="flex-1 flex bg-[var(--bg-canvas)] overflow-hidden relative">
      {/* Direct Messages & Custom Groups Sidebar */}
      <ConversationsSidebar />

      {/* Main Conversation Stream View */}
      <ConversationView />

      {/* Global Realtime Audio Calling Modals */}
      <IncomingCallModal />
      <ActiveCallOverlay />
    </div>
  );
}
