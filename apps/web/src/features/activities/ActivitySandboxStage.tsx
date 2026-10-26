'use client';

import * as React from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Users,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  GitPullRequest,
  RotateCcw,
  Gamepad2,
  Palette,
} from 'lucide-react';
import { ActivityStateBroadcast, MiniAppType, REALTIME_EVENTS } from '@mivo/shared';
import { realtime } from '@/lib/socket-client';

export interface ActivitySandboxStageProps {
  activity: ActivityStateBroadcast;
  roomId: string;
  currentUserId?: string;
  currentUserName?: string;
  onClose: () => void;
}

export const ActivitySandboxStage: React.FC<ActivitySandboxStageProps> = ({
  activity,
  roomId,
  currentUserId,
  currentUserName = 'Participant',
  onClose,
}) => {
  const [state, setState] = React.useState<any>(activity.state);
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  // Sync state from server
  React.useEffect(() => {
    setState(activity.state);
  }, [activity.state]);

  React.useEffect(() => {
    const socket = realtime.getSocket();
    if (!socket || !roomId) return;

    const handleSync = (updated: ActivityStateBroadcast) => {
      if (updated.roomId === roomId && updated.activityId === activity.activityId) {
        setState(updated.state);
      }
    };

    socket.on(REALTIME_EVENTS.ACTIVITY_SYNC_STATE, handleSync);
    return () => {
      socket.off(REALTIME_EVENTS.ACTIVITY_SYNC_STATE, handleSync);
    };
  }, [roomId, activity.activityId]);

  const sendAction = (actionType: string, payload: any) => {
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.ACTIVITY_ACTION, {
        roomId,
        actionType,
        payload,
      });
    }
  };

  // Multiplayer Chess Game State
  const initialBoard = [
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    ['\u265F', '\u265F', '\u265F', '\u265F', '\u265F', '\u265F', '\u265F', '\u265F'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
  ];

  const [board, setBoard] = React.useState<string[][]>(initialBoard);
  const [selectedSquare, setSelectedSquare] = React.useState<[number, number] | null>(null);

  const handleSquareClick = (row: number, col: number) => {
    if (selectedSquare) {
      const [fromR, fromC] = selectedSquare;
      if (fromR === row && fromC === col) {
        setSelectedSquare(null);
        return;
      }

      // Move piece
      const newBoard = board.map((r) => [...r]);
      const piece = newBoard[fromR][fromC];
      newBoard[fromR][fromC] = '';
      newBoard[row][col] = piece;
      setBoard(newBoard);
      setSelectedSquare(null);

      const moveNotation = `${String.fromCharCode(97 + fromC)}${8 - fromR} -> ${String.fromCharCode(97 + col)}${8 - row}`;
      sendAction('MOVE', { move: moveNotation });
    } else {
      if (board[row][col]) {
        setSelectedSquare([row, col]);
      }
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#0A0B10] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 z-30 ${
        isFullScreen ? 'fixed inset-4 z-50' : 'w-full h-full'
      }`}
    >
      {/* Activity Top Bar */}
      <div className="h-11 px-4 bg-[var(--bg-surface-1)] border-b border-[var(--border-subtle)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center">
            {activity.type === 'CHESS' ? (
              <Gamepad2 className="w-5 h-5 text-amber-400" />
            ) : activity.type === 'FIGMA_EMBED' ? (
              <Palette className="w-5 h-5 text-purple-400" />
            ) : (
              <GitPullRequest className="w-5 h-5 text-emerald-400" />
            )}
          </span>
          <div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] font-display flex items-center gap-2">
              {activity.type === 'CHESS'
                ? 'Multiplayer Speed Chess'
                : activity.type === 'FIGMA_EMBED'
                ? 'Figma Live Stage Review'
                : 'GitHub PR Live Diff Inspector'}
              <span className="px-2 py-0.5 rounded-full bg-[#5E5CE6]/20 text-[#64D2FF] text-[10px] font-mono font-bold">
                Mivo Sandbox
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Activity'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors cursor-pointer"
            title="Close Activity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Activity Content Area */}
      <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center relative">
        {/* 1. CHESS MINI-APP */}
        {activity.type === 'CHESS' && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full max-w-sm px-2 text-xs font-mono">
              <span className="text-[var(--text-secondary)]">Turn: <strong className="text-white">{state?.turn === 'w' ? 'White' : 'Black'}</strong></span>
              <span className="text-[#30D158] font-bold">Blitz 5+3</span>
            </div>

            {/* Chessboard 8x8 */}
            <div className="grid grid-cols-8 border-2 border-[#23273A] rounded-xl overflow-hidden shadow-2xl bg-[#141622]">
              {board.map((rowArr, r) =>
                rowArr.map((piece, c) => {
                  const isBlackSquare = (r + c) % 2 === 1;
                  const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => handleSquareClick(r, c)}
                      className={`w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center text-2xl sm:text-3xl select-none transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#5E5CE6] text-white shadow-inner scale-95'
                          : isBlackSquare
                          ? 'bg-[#2A2E45] text-white hover:bg-[#343954]'
                          : 'bg-[#D8DEE9] text-black hover:bg-[#E5E9F0]'
                      }`}
                    >
                      {piece}
                    </button>
                  );
                })
              )}
            </div>

            {state?.moves?.length > 0 && (
              <div className="w-full max-w-sm p-2 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] truncate">
                Last move: <span className="text-[#30D158] font-bold">{state.moves[state.moves.length - 1]}</span>
              </div>
            )}
          </div>
        )}

        {/* 2. FIGMA LIVE EMBED */}
        {activity.type === 'FIGMA_EMBED' && (
          <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-[#23273A] bg-[#11131C]">
            <div className="h-9 px-3 bg-[#1E2235] flex items-center justify-between text-xs text-[#8F9BAE] border-b border-[#23273A]">
              <span className="font-mono text-[11px] text-[#64D2FF]">Figma Live Prototype Stage</span>
              <a
                href="https://www.figma.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white flex items-center gap-1 text-[11px]"
              >
                <span>Open in Figma</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#F24E1E] via-[#A259FF] to-[#1ABCFE] flex items-center justify-center shadow-[0_0_32px_rgba(162,89,255,0.4)]">
                <Palette className="w-10 h-10 text-white" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold text-white font-display">Mivo UI/UX Design System v3.2</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Synchronized live frame inspection active. Collaborators can click to pin real-time comments on the viewport.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => sendAction('ADD_ANNOTATION', { x: 120, y: 80, comment: 'Looks gorgeous!' })}
                  className="px-3 py-1.5 rounded-lg bg-[#5E5CE6] hover:bg-[#5E5CE6]/90 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
                >
                  Pin Feedback Note
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. GITHUB PR LIVE REVIEW */}
        {activity.type === 'GITHUB_PR' && (
          <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-[#23273A] bg-[#11131C]">
            <div className="h-10 px-4 bg-[#1E2235] flex items-center justify-between text-xs border-b border-[#23273A]">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-[#30D158]" />
                <span className="font-bold text-white">PR #104: Hyper SFU Engine, E2EE, and Code Sandbox</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#30D158]/20 text-[#30D158] font-bold text-[10px]">
                OPEN
              </span>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#0A0B10] border border-[#23273A]">
                <div className="text-[#64D2FF] font-bold mb-1">
                  +184 additions, -0 deletions in sfu-engine.service.ts
                </div>
                <pre className="text-[#30D158] overflow-x-auto p-2 bg-black/40 rounded">
{`+ export class SfuEngineService {
+   produce(roomId, userId, kind, simulcast = true) {
+     // 1080p, 720p, 360p simulcast spatial layers
+     return { id: producerId, activeLayer: '1080p', bitrate: 2500 };
+   }
+ }`}
                </pre>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => sendAction('SUBMIT_REVIEW', { verdict: 'APPROVE', comment: 'LGTM! Great architecture.' })}
                  className="px-4 py-2 rounded-xl bg-[#30D158] hover:bg-[#30D158]/90 text-black font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Pull Request</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
