'use client';

import * as React from 'react';
import { BookOpen } from 'lucide-react';
import { InteractiveDocsModal } from './InteractiveDocsModal';

export const FloatingDocsButton: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      {/* Floating Bottom-Left Docs Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-20 z-40 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[var(--bg-surface-0)] border border-red-500/30 backdrop-blur-xl text-[#111827] text-xs font-bold shadow-xl hover:bg-gradient-to-r hover:from-[#DC2626] hover:to-[#B91C1C] hover:text-white hover:border-red-500 transition-all duration-200 group select-none cursor-pointer"
        title="Open User Guide & Interactive Docs"
      >
        <BookOpen className="w-4 h-4 text-red-600 group-hover:text-white transition-colors" />
        <span className="hidden sm:inline">User Docs</span>
      </button>

      {/* Interactive Folderized Documentation Modal */}
      <InteractiveDocsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
