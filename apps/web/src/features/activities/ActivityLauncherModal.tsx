'use client';

import * as React from 'react';
import { X, Play, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { MiniAppManifest, MiniAppType, REALTIME_EVENTS } from '@mivo/shared';
import { realtime } from '@/lib/socket-client';

export interface ActivityLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onLaunch: (type: MiniAppType, initialPayload?: any) => void;
}

const ACTIVITIES: MiniAppManifest[] = [
  {
    id: 'activity-chess',
    type: 'CHESS',
    title: 'Multiplayer Speed Chess',
    description: 'Real-time collaborative chessboard with blitz timers, piece animation, and move history.',
    icon: '♟️',
    sandboxFlags: 'allow-scripts allow-forms allow-same-origin',
  },
  {
    id: 'activity-figma',
    type: 'FIGMA_EMBED',
    title: 'Figma Live Stage Review',
    description: 'Inspect UI/UX design prototypes, pin inline annotations, and review layouts simultaneously.',
    icon: '🎨',
    initialUrl: 'https://www.figma.com/embed?community_demo=1',
    sandboxFlags: 'allow-scripts allow-forms allow-same-origin allow-popups',
  },
  {
    id: 'activity-github-pr',
    type: 'GITHUB_PR',
    title: 'GitHub PR Live Diff Review',
    description: 'Inspect code diffs side-by-side, discuss commits, and submit peer review approvals.',
    icon: '🐙',
    sandboxFlags: 'allow-scripts allow-forms allow-same-origin',
  },
];

export const ActivityLauncherModal: React.FC<ActivityLauncherModalProps> = ({
  isOpen,
  onClose,
  roomId,
  onLaunch,
}) => {
  if (!isOpen) return null;

  const handleLaunchActivity = (type: MiniAppType) => {
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.ACTIVITY_LAUNCH, {
        roomId,
        type,
      });
    }
    onLaunch(type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] font-display flex items-center gap-2">
              Launch Mini-App Activity
              <span className="px-2 py-0.5 rounded-full bg-[#5E5CE6]/20 text-[#64D2FF] text-[10px] font-bold">
                Sandboxed Extensibility
              </span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Interactive multiplayer activities synchronized across all room participants
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Catalog */}
        <div className="p-6 space-y-3">
          {ACTIVITIES.map((act) => (
            <div
              key={act.id}
              className="p-4 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-[#5E5CE6]/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 transition-transform">
                  {act.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] font-display group-hover:text-[#64D2FF] transition-colors">
                    {act.title}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
                    {act.description}
                  </p>
                  <span className="text-[10px] text-[#30D158] font-mono font-semibold flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-3 h-3" />
                    Isolated iframe sandbox
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleLaunchActivity(act.type)}
                className="px-4 py-2 rounded-xl bg-[#5E5CE6] hover:bg-[#5E5CE6]/90 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer flex-shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Launch</span>
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-1)] text-center text-[11px] text-[var(--text-muted)]">
          Activities run in secure browser sandboxes similar to Discord Activities.
        </div>
      </div>
    </div>
  );
};
