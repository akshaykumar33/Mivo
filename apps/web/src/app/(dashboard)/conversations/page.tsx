'use client';

import * as React from 'react';
import { ConversationsSidebar } from '@/features/conversations/ConversationsSidebar';
import { ConversationView } from '@/features/conversations/ConversationView';
import { useConversationStore } from '@/stores/conversationStore';

export default function ConversationsPage() {
  const { activeConversationId } = useConversationStore();

  return (
    <div className="flex-1 flex bg-[var(--bg-canvas)] overflow-hidden relative w-full h-full">
      {/* Direct Messages & Custom Groups Sidebar (Full width on mobile when no conversation selected; side-by-side on desktop) */}
      <div
        className={`h-full ${
          activeConversationId
            ? 'hidden md:flex md:w-64 flex-shrink-0'
            : 'w-full md:w-64 flex flex-shrink-0'
        }`}
      >
        <ConversationsSidebar />
      </div>

      {/* Main Conversation Stream View (Full width on mobile when conversation selected; side-by-side on desktop) */}
      <div
        className={`h-full flex-1 ${
          !activeConversationId ? 'hidden md:flex' : 'flex'
        } min-w-0`}
      >
        <ConversationView />
      </div>
    </div>
  );
}
