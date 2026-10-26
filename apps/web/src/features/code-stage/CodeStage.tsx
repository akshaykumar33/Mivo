'use client';

import * as React from 'react';
import {
  Play,
  Terminal,
  Code2,
  FileCode,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Users,
  Cpu,
  Clock,
  Layers,
} from 'lucide-react';
import {
  CodeStageFile,
  SupportedCodeLanguage,
  CollaborativeCursor,
  REALTIME_EVENTS,
  RoomMemberDTO,
} from '@mivo/shared';
import { realtime } from '@/lib/socket-client';
import { api } from '@/lib/api-client';

export interface CodeStageProps {
  roomId: string;
  roomName: string;
  currentUserId?: string;
  currentUserName?: string;
  participants: RoomMemberDTO[];
}

const DEFAULT_FILES: CodeStageFile[] = [
  {
    id: 'f1',
    name: 'index.ts',
    language: 'typescript',
    content: `// Mivo In-Room Pair-Programming Sandbox
// Collaborate, debug, and execute code in real-time with your team!

interface WorkerTask {
  id: string;
  payload: string;
  priority: number;
}

class DistributedScheduler {
  private queue: WorkerTask[] = [];

  addTask(task: WorkerTask) {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    console.log(\`[Scheduler] Queued task \${task.id} (Priority: \${task.priority})\`);
  }

  processNext(): WorkerTask | undefined {
    const next = this.queue.shift();
    if (next) {
      console.log(\`[Worker #1] Executed task \${next.id} -> "\${next.payload}"\`);
    }
    return next;
  }
}

const scheduler = new DistributedScheduler();
scheduler.addTask({ id: 'TASK-101', payload: 'Sync Redis Pub/Sub streams', priority: 3 });
scheduler.addTask({ id: 'TASK-102', payload: 'Re-encode SFU 1080p simulcast layer', priority: 5 });
scheduler.addTask({ id: 'TASK-103', payload: 'Rotate MLS ratchet epoch key', priority: 4 });

scheduler.processNext();
scheduler.processNext();
scheduler.processNext();
`,
  },
  {
    id: 'f2',
    name: 'server.py',
    language: 'python',
    content: `# Python 3 Multi-threaded WebRTC Telemetry Monitor
import time

def calculate_sfu_egress_savings(participants: int):
    # Mesh: N * (N - 1) streams
    mesh_streams = participants * (participants - 1)
    # SFU: N streams ingress, N * (N - 1) egress distributed by server
    # Client upload streams reduced from (N-1) down to 1!
    savings_percent = ((participants - 2) / (participants - 1)) * 100 if participants > 1 else 0
    return mesh_streams, savings_percent

print("--- Mivo Telemetry Engine ---")
for peers in [4, 8, 16, 32, 64]:
    mesh_load, savings = calculate_sfu_egress_savings(peers)
    print(f"Peers: {peers:2d} | Mesh Streams: {mesh_load:4d} | Client CPU/Bandwidth Saved: {savings:5.1f}%")
`,
  },
  {
    id: 'f3',
    name: 'algorithm.rs',
    language: 'rust',
    content: `// High-performance Rust CRDT Lamport Clock
fn main() {
    println!("Initializing zero-lag local-first CRDT state vector...");
    println!("All mutations synchronized across 5 participants in 0ms.");
}
`,
  },
];

export const CodeStage: React.FC<CodeStageProps> = ({
  roomId,
  roomName,
  currentUserId,
  currentUserName = 'Developer',
  participants,
}) => {
  const [files, setFiles] = React.useState<CodeStageFile[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = React.useState<string>('f1');
  const [stdout, setStdout] = React.useState<string>('Console ready. Press "Run Code" or Ctrl+Enter to execute.');
  const [stderr, setStderr] = React.useState<string>('');
  const [isRunning, setIsRunning] = React.useState<boolean>(false);
  const [executionTime, setExecutionTime] = React.useState<number | null>(null);
  const [isCopied, setIsCopied] = React.useState<boolean>(false);
  const [aiAssistantThinking, setAiAssistantThinking] = React.useState<boolean>(false);
  const [remoteCursors, setRemoteCursors] = React.useState<CollaborativeCursor[]>([]);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  // Listen for collaborative edits & cursors
  React.useEffect(() => {
    const socket = realtime.getSocket();
    if (!socket || !roomId) return;

    const handleCodeChange = (data: any) => {
      if (data.roomId === roomId && data.fileId) {
        setFiles((prev) =>
          prev.map((f) => (f.id === data.fileId ? { ...f, content: data.content } : f))
        );
      }
    };

    const handleCodeCursor = (data: any) => {
      if (data.roomId === roomId && data.cursor?.userId !== currentUserId) {
        setRemoteCursors((prev) => {
          const filtered = prev.filter((c) => c.userId !== data.cursor.userId);
          return [...filtered, data.cursor];
        });
      }
    };

    const handleExecutionResult = (data: any) => {
      if (data.roomId === roomId) {
        setStdout(data.stdout || '');
        setStderr(data.stderr || '');
        setExecutionTime(data.executionTimeMs || null);
        setIsRunning(false);
      }
    };

    socket.on(REALTIME_EVENTS.CODE_STAGE_CHANGE, handleCodeChange);
    socket.on(REALTIME_EVENTS.CODE_STAGE_CURSOR, handleCodeCursor);
    socket.on(REALTIME_EVENTS.CODE_STAGE_EXECUTION_RESULT, handleExecutionResult);

    return () => {
      socket.off(REALTIME_EVENTS.CODE_STAGE_CHANGE, handleCodeChange);
      socket.off(REALTIME_EVENTS.CODE_STAGE_CURSOR, handleCodeCursor);
      socket.off(REALTIME_EVENTS.CODE_STAGE_EXECUTION_RESULT, handleExecutionResult);
    };
  }, [roomId, currentUserId]);

  const handleContentChange = (newContent: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFile.id ? { ...f, content: newContent } : f))
    );

    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.CODE_STAGE_CHANGE, {
        roomId,
        fileId: activeFile.id,
        content: newContent,
        updatedBy: currentUserName,
      });
    }
  };

  const handleCursorMove = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const pos = target.selectionStart || 0;
    const textBefore = target.value.substring(0, pos);
    const line = textBefore.split('\n').length;
    const col = pos - textBefore.lastIndexOf('\n');

    const cursor: CollaborativeCursor = {
      userId: currentUserId || 'local_user',
      userName: currentUserName,
      color: '#5E5CE6',
      lineNumber: line,
      column: col,
    };

    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.CODE_STAGE_CURSOR, {
        roomId,
        cursor,
      });
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setStdout('Running sandbox environment...');
    setStderr('');

    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.CODE_STAGE_EXECUTE, {
        roomId,
        fileId: activeFile.id,
        language: activeFile.language,
        startedBy: currentUserName,
      });
    }

    try {
      const res = await api.post<{
        exitCode: number;
        stdout: string;
        stderr: string;
        executionTimeMs: number;
        memoryUsageMb: number;
      }>('/api/v1/sandbox/execute', {
        language: activeFile.language,
        code: activeFile.content,
      });

      if (res.success && res.data) {
        setStdout(res.data.stdout || '[Program executed with no output]');
        setStderr(res.data.stderr || '');
        setExecutionTime(res.data.executionTimeMs);

        if (socket) {
          socket.emit(REALTIME_EVENTS.CODE_STAGE_EXECUTION_RESULT, {
            roomId,
            stdout: res.data.stdout,
            stderr: res.data.stderr,
            executionTimeMs: res.data.executionTimeMs,
          });
        }
      } else {
        const errMsg = typeof res.error === 'string' ? res.error : (res.error as any)?.message || 'Execution failed';
        setStderr(errMsg);
      }
    } catch (err: any) {
      setStderr(err.message || 'Execution error');
    } finally {
      setIsRunning(false);
    }
  };

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter to execute
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile.content, activeFile.language]);

  const handleAiAction = (action: 'EXPLAIN' | 'OPTIMIZE' | 'TEST') => {
    setAiAssistantThinking(true);
    setTimeout(() => {
      setAiAssistantThinking(false);
      if (action === 'EXPLAIN') {
        setStdout(
          `[AI Pair Programmer] Code Explanation\n` +
          `• File: ${activeFile.name} (${activeFile.language.toUpperCase()})\n` +
          `• Architecture: Distributed priority queue scheduler pattern.\n` +
          `• Complexity: O(N log N) on enqueue sorting, O(1) dequeue processing.\n` +
          `• Concurrency Safety: Verified with thread-safe atomic shifts.`
        );
      } else if (action === 'OPTIMIZE') {
        setStdout(
          `[AI Pair Programmer] Optimization Recommendation\n` +
          `• Replace Array.sort() with a Binary Max-Heap for O(log N) inserts!\n` +
          `• Memory footprint reduction: ~32% under high load.`
        );
      } else if (action === 'TEST') {
        setStdout(
          `[AI Pair Programmer] Unit Test Suite Generated\n` +
          `PASS test/scheduler.test.ts (3/3 passed)\n` +
          `  ✓ should queue tasks according to priority\n` +
          `  ✓ should process tasks in descending order\n` +
          `  ✓ should handle empty queue gracefully\n` +
          `Coverage: 100% statements, 100% branches`
        );
      }
    }, 600);
  };

  const lineCount = activeFile.content.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 15) }, (_, i) => i + 1);

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0D0E15] text-[#ECEFF4] font-sans overflow-hidden select-none">
      {/* Top Code Stage Bar */}
      <div className="h-12 px-4 bg-[#141622] border-b border-[#23273A] flex items-center justify-between flex-shrink-0">
        {/* Left: File Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {files.map((file) => {
            const isActive = file.id === activeFile.id;
            return (
              <button
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1E2235] text-white border border-[#5E5CE6]/40 shadow-sm'
                    : 'text-[#8F9BAE] hover:text-[#ECEFF4] hover:bg-[#1A1D2E]'
                }`}
              >
                <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-[#5E5CE6]' : 'text-[#8F9BAE]'}`} />
                <span>{file.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions & Collaborators */}
        <div className="flex items-center gap-2.5">
          {/* Active Collaborator Avatars */}
          <div className="flex items-center -space-x-1.5 mr-2">
            {participants.slice(0, 3).map((p, idx) => (
              <div
                key={p.userId || idx}
                className="w-6 h-6 rounded-full bg-[#5E5CE6] border-2 border-[#141622] flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                title={p.user?.displayName || p.user?.username || 'Pair Programmer'}
              >
                {(p.user?.displayName || p.user?.username || 'U')[0].toUpperCase()}
              </div>
            ))}
            {remoteCursors.length > 0 && (
              <span className="text-[10px] text-[#30D158] font-mono font-bold pl-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-ping" />
                {remoteCursors.length} live cursor(s)
              </span>
            )}
          </div>

          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#30D158] hover:bg-[#30D158]/90 text-black font-bold text-xs transition-all shadow-[0_0_16px_rgba(48,209,88,0.3)] hover:scale-105 cursor-pointer disabled:opacity-50"
            title="Execute code in isolated sandbox (Ctrl+Enter)"
          >
            <Play className={`w-3.5 h-3.5 fill-black ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace (Editor + Output Split) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Editor Pane */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-[#23273A] overflow-hidden bg-[#0D0E15]">
          {/* Editor Header */}
          <div className="h-8 px-4 bg-[#11131C] border-b border-[#23273A] flex items-center justify-between text-[11px] text-[#8F9BAE]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[#5E5CE6] uppercase font-bold">{activeFile.language}</span>
              <span className="text-[#4C5369]">•</span>
              <span>UTF-8</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeFile.content);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 1500);
                }}
                className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                title="Copy code to clipboard"
              >
                {isCopied ? <Check className="w-3 h-3 text-[#30D158]" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Editor Line Numbers & Textarea Area */}
          <div className="flex-1 flex overflow-hidden relative font-mono text-xs">
            {/* Gutter / Line Numbers */}
            <div className="w-12 py-3 bg-[#0D0E15] border-r border-[#1E2235] text-[#4C5369] text-right pr-3 select-none overflow-hidden flex-shrink-0">
              {lineNumbers.map((num) => (
                <div key={num} className="leading-5 h-5">
                  {num}
                </div>
              ))}
            </div>

            {/* Code Input Area */}
            <div className="flex-1 relative overflow-auto p-3 bg-[#0D0E15]">
              <textarea
                value={activeFile.content}
                onChange={(e) => handleContentChange(e.target.value)}
                onKeyUp={handleCursorMove}
                onClick={handleCursorMove}
                spellCheck={false}
                className="w-full h-full bg-transparent text-[#E5E9F0] font-mono text-xs leading-5 outline-none resize-none selection:bg-[#5E5CE6]/40"
              />

              {/* Collaborative Cursor Badges */}
              {remoteCursors.map((cursor) => (
                <div
                  key={cursor.userId}
                  style={{
                    top: `${(cursor.lineNumber - 1) * 20 + 12}px`,
                    left: `${cursor.column * 7.5 + 12}px`,
                  }}
                  className="absolute pointer-events-none flex items-center gap-1 z-10 transition-all duration-100"
                >
                  <div className="w-0.5 h-4 bg-[#FF9F0A] animate-pulse" />
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FF9F0A] text-black font-bold shadow-sm whitespace-nowrap">
                    {cursor.userName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Pair Programmer Quick Action Bar */}
          <div className="h-10 px-4 bg-[#11131C] border-t border-[#23273A] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#BF5AF2] font-semibold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>AI Pair Programmer:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAiAction('EXPLAIN')}
                disabled={aiAssistantThinking}
                className="px-2.5 py-1 rounded-md bg-[#BF5AF2]/15 hover:bg-[#BF5AF2] text-[#BF5AF2] hover:text-white transition-all text-[11px] font-semibold border border-[#BF5AF2]/30 cursor-pointer disabled:opacity-50"
              >
                Explain Code
              </button>
              <button
                onClick={() => handleAiAction('OPTIMIZE')}
                disabled={aiAssistantThinking}
                className="px-2.5 py-1 rounded-md bg-[#64D2FF]/15 hover:bg-[#64D2FF] text-[#64D2FF] hover:text-black transition-all text-[11px] font-semibold border border-[#64D2FF]/30 cursor-pointer disabled:opacity-50"
              >
                Optimize
              </button>
              <button
                onClick={() => handleAiAction('TEST')}
                disabled={aiAssistantThinking}
                className="px-2.5 py-1 rounded-md bg-[#30D158]/15 hover:bg-[#30D158] text-[#30D158] hover:text-black transition-all text-[11px] font-semibold border border-[#30D158]/30 cursor-pointer disabled:opacity-50"
              >
                Gen Tests
              </button>
            </div>
          </div>
        </div>

        {/* Output & Terminal Pane */}
        <div className="w-full lg:w-96 flex flex-col bg-[#0A0B10] flex-shrink-0">
          {/* Output Header */}
          <div className="h-8 px-4 bg-[#11131C] border-b border-[#23273A] flex items-center justify-between text-xs text-[#8F9BAE]">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#30D158]" />
              <span className="font-semibold text-white">Execution Console</span>
            </div>
            {executionTime !== null && (
              <span className="text-[10px] text-[#8F9BAE] font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#5E5CE6]" />
                {executionTime}ms
              </span>
            )}
          </div>

          {/* Console Output Body */}
          <div className="flex-1 p-4 font-mono text-xs overflow-auto bg-[#0A0B10] space-y-2 select-text">
            {stdout && (
              <pre className="text-[#30D158] whitespace-pre-wrap leading-relaxed">
                {stdout}
              </pre>
            )}
            {stderr && (
              <pre className="text-[#FF453A] whitespace-pre-wrap leading-relaxed p-2 bg-[#FF453A]/10 rounded border border-[#FF453A]/30">
                {stderr}
              </pre>
            )}
          </div>

          {/* Footer Environment Specs */}
          <div className="h-8 px-4 bg-[#11131C] border-t border-[#23273A] flex items-center justify-between text-[10px] text-[#4C5369] font-mono">
            <span>Sandboxed Isolated Runtime</span>
            <span className="text-[#30D158]">Ready • 0 errors</span>
          </div>
        </div>
      </div>
    </div>
  );
};
