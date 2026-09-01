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
        className="fixed bottom-6 left-20 z-40 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#090B10]/90 border border-violet-500/40 backdrop-blur-xl text-white text-xs font-bold shadow-2xl hover:bg-violet-600 hover:border-violet-400 transition-all duration-200 group select-none"
        title="Open User Guide & Interactive Docs"
      >
        <BookOpen className="w-4 h-4 text-violet-400 group-hover:text-white transition-colors" />
        <span className="hidden sm:inline">User Docs</span>
      </button>

      {/* Interactive Folderized Documentation Modal */}
      <InteractiveDocsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
