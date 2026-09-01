'use client';

import * as React from 'react';
import {
  BookOpen,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Sparkles,
  Layers,
  Video,
  Mic,
  Monitor,
  Shield,
  Languages,
  CircleDot,
  PictureInPicture2,
  Users,
  Copy,
  Check,
  Zap,
  Terminal,
  Code2,
  Keyboard,
  Cpu,
  Clock,
  Compass,
} from 'lucide-react';

export interface DocArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  readTime: string;
  icon: any;
  content: string;
  codeSnippet?: {
    lang: string;
    code: string;
  };
}

export const DOC_ARTICLES: DocArticle[] = [
  {
    id: 'quick-start',
    category: '1. Getting Started',
    title: 'Quick Access & Pre-Configured Test Accounts',
    summary: 'Instant 1-click profiles with realistic avatars, roles, and language presets.',
    readTime: '2 min read',
    icon: Sparkles,
    content: `
# 🚀 Quick Access & Demo Profiles

Welcome to **Mivo** — the next-generation unified real-time communication platform combining the best of Zoom, Google Meet, Discord, and Slack into an ultra-fluid, Apple-inspired experience.

### 🔑 1-Click Demo Profiles (Password: \`Password123!\`):
* **👑 Dev Admin** (\`dev@mivo.app\`): Platform Architect & Community Owner (English 🇺🇸)
* **🎨 Alex Rivera** (\`alex@mivo.app\`): Staff Designer & Community Admin (English 🇺🇸)
* **⚡ Sarah Connor** (\`sarah@mivo.app\`): Principal Backend Lead (English 🇬🇧)
* **🌍 Carlos Mendoza** (\`carlos@mivo.app\`): Frontend Specialist (Spanish 🇪🇸)
* **🌏 Priya Sharma** (\`priya@mivo.app\`): Cloud Architect (Hindi 🇮🇳)
* **📻 Elena Rostova** (\`elena@mivo.app\`): Media SFU Infrastructure Specialist (Russian 🇷🇺)

> [!TIP]
> You can log in instantly by clicking any profile card on the login screen without typing credentials manually.
    `,
    codeSnippet: {
      lang: 'bash',
      code: `# Run database seed with pre-configured demo users
pnpm --filter @mivo/database seed`,
    },
  },
  {
    id: 'hierarchy-channels',
    category: '2. Workspaces & Spaces',
    title: 'Communities, Channels & Permissions Hierarchy',
    summary: 'Three-tier architecture organizing teams, spaces, and private voice lounges.',
    readTime: '3 min read',
    icon: Layers,
    content: `
# 🏢 Workspaces & Channel Architecture

Mivo organizes real-time communication into three tiers:

### 1. Communities (Left Rail)
The top-level organization or workspace (e.g. *Engineering Alpha*, *Design & UX Guild*).

### 2. Channels & Spaces (Sidebar)
Categorized groups with specific communication intentions:
* **\`#general\`** (Type: GENERAL): Asynchronous discussion, updates, and daily syncs.
* **\`🔊 voice-lounge\`** (Type: VOICE): Drop-in spatial voice rooms with soundwave equalizers.
* **\`📹 war-room\`** (Type: MEDIA): Live code reviews and high-framerate screen sharing.

### 🔒 Public vs. Private Channels
* **Public Channels (\`isPrivate: false\`)**: Open and visible to all community members.
* **Private Channels (\`isPrivate: true\`)**: Restricted only to Owners, Admins, or members with explicit permission.
    `,
  },
  {
    id: 'unified-room-modes',
    category: '3. Real-Time Stage Engine',
    title: 'Unified Stage Modes (Chat, Voice, Video, Screen)',
    summary: 'Single persistent WebRTC connection that smoothly shifts layout on demand.',
    readTime: '4 min read',
    icon: Video,
    content: `
# 🎛️ Unified Stage Communication Modes

In Mivo, a room is a **single unified communication stage** that dynamically adapts its layout without dropping participants or switching channels:

| Mode | Viewport Experience | Optimal Use Case |
| :--- | :--- | :--- |
| **\`TEXT\`** | Live chat stream with message translation & composer | Async updates & code links |
| **\`VOICE\`** | Spatial voice huddle with dynamic soundwave waves | Casual standups & pairing |
| **\`VIDEO\`** | Multi-tile HD video grid with audio equalizers | Team syncs & client meetings |
| **\`SCREEN_SHARE\`** | 16:9 Cinema theater stage with attendee filmstrip | Live presentations & demos |

> [!NOTE]
> When the host switches modes via the CyberDock, the entire stage transforms seamlessly for all connected peers with hardware-accelerated animations.
    `,
    codeSnippet: {
      lang: 'typescript',
      code: `// Dynamic Stage Mode Switch via WebSocket
socket.emit('room:change-mode', {
  roomId: '49c95cb3-9fa7-4f62-8178-0d1a49abddff',
  activeMode: 'VIDEO' // 'TEXT' | 'VOICE' | 'VIDEO' | 'SCREEN_SHARE'
});`,
    },
  },
  {
    id: 'interactive-tiles-drag',
    category: '3. Real-Time Stage Engine',
    title: 'Drag & Drop Reordering, Spotlight Pin & Peer Volume',
    summary: 'HTML5 drag reordering, individual audio sliders, and spotlight focus.',
    readTime: '3 min read',
    icon: Monitor,
    content: `
# 🔀 Interactive Stage Tiles & Layouts

Every video tile gives you rich interactive controls:

### 1. Drag & Drop & Instant Swap
* **Drag Handle (GripVertical)**: Click and drag any tile onto another to swap positions instantly.
* **1-Click Swap Arrows (◀ / ▶)**: Hover over any video tile or voice card and click the < and > arrow buttons to shift speakers left or right.

### 2. 📌 Spotlight Focus Mode
* Hover over any participant and click **Pin** to expand that speaker into the dominant **16:9 Hero Stage View**, with other attendees neatly organized in a bottom filmstrip.
* Click **Unpin** to return to the equal grid.

### 3. 🔊 Individual Peer Volume Sliders
* Hover over any remote speaker and click the **Volume icon** to adjust their volume independently from **0% to 200%**.

### 4. 📊 Dynamic 3-Bar Audio Equalizer
* Live green animated equalizer waves pulse directly on the speaker's nameplate during active speech.
    `,
  },
  {
    id: 'ai-whisper-mom',
    category: '4. AI & Multilingual Suite',
    title: 'Gemini 3.7 AI Copilot & Whisper Scribe Minutes (MOM)',
    summary: 'Live speech transcription, instant translation, and 1-click executive meeting recaps.',
    readTime: '4 min read',
    icon: Zap,
    content: `
# 🤖 Gemini 3.7 AI Copilot & Whisper Scribe

Mivo features a built-in AI assistant and automated meeting documentation pipeline:

### 1. ✨ Gemini 3.7 AI Copilot
* Click the **Purple Sparkle (\`✨\`)** in the CyberDock to trigger Gemini 3.7.
* Generates bulleted summaries, action items, and technical decisions based on real-time room conversations.

### 2. 📋 Whisper Scribe & Automated MOM (Minutes of Meeting)
* Click **\`AI Notes & MOM\`** in the top room header.
* **Live Speech Dictation**: Uses Web Speech Synthesis & Whisper flow for real-time multilingual transcription.
* **MOM Document Generation**: Automatically compiles:
  * Executive Summary
  * In-Meeting Key Decisions
  * Action Items Table with Checkboxes
  * Full Bilingual Transcript
* **1-Click Email Dispatch**: Click **"Email Official MOM & Notes"** to send formatted notes to attendee inboxes!
    `,
    codeSnippet: {
      lang: 'json',
      code: `{
  "meetingId": "mivo-eng-sync-2026",
  "aiEngine": "gemini-3.7-flash",
  "summary": "Engineering Alpha weekly sync covering WebRTC mesh stabilization.",
  "actionItems": [
    { "task": "Deploy TURN cluster in eu-central", "assignee": "Sarah Connor", "done": false }
  ]
}`,
    },
  },
  {
    id: 'translation-tts',
    category: '4. AI & Multilingual Suite',
    title: 'Real-Time Chat Translation & Native Voice Synthesis (TTS)',
    summary: 'Dual-language message cards with native accent speech synthesis.',
    readTime: '3 min read',
    icon: Languages,
    content: `
# 🌍 Real-Time Translation & Text-to-Speech

Mivo bridges language barriers across global teams:

### 1. In-Chat Real-Time Message Translation
* Select your target language in the chat header (Spanish 🇪🇸, French 🇫🇷, German 🇩🇪, Hindi 🇮🇳, Japanese 🇯🇵, Chinese 🇨🇳, etc.).
* Click **\`Languages\` Translate** on any message to reveal the translated sub-card.

### 2. 🔊 Native Speech Synthesis (TTS)
* Click the **Speaker icon (\`Volume2\`)** on any translated message to hear it read aloud in a native regional accent!
    `,
  },
  {
    id: 'shortcuts-reference',
    category: '5. Power User & Hotkeys',
    title: 'Keyboard Shortcuts & Navigation Quick-Keys',
    summary: 'Full list of keyboard shortcuts for instant control.',
    readTime: '1 min read',
    icon: Keyboard,
    content: `
# ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>⌘</kbd> + <kbd>K</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Focus Channel & Stage Search | Global |
| <kbd>M</kbd> | Toggle Microphone Mute | In-Room Stage |
| <kbd>V</kbd> | Toggle Video Camera | In-Room Stage |
| <kbd>S</kbd> | Toggle Screen Share | In-Room Stage |
| <kbd>ESC</kbd> | Dismiss Modal / Close Drawers | Global |
| <kbd>T</kbd> | Open Visual Theme Switcher | In-Room Stage |
    `,
  },
];

export interface InteractiveDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveDocsModal: React.FC<InteractiveDocsModalProps> = ({ isOpen, onClose }) => {
  const [selectedArticleId, setSelectedArticleId] = React.useState('quick-start');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [copiedSnippet, setCopiedSnippet] = React.useState(false);
  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({
    '1. Getting Started': true,
    '2. Workspaces & Spaces': true,
    '3. Real-Time Stage Engine': true,
    '4. AI & Multilingual Suite': true,
    '5. Power User & Hotkeys': true,
  });

  const categories = React.useMemo(() => {
    const map: Record<string, DocArticle[]> = {};
    DOC_ARTICLES.forEach((art) => {
      if (!map[art.category]) map[art.category] = [];
      if (
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        map[art.category].push(art);
      }
    });
    return map;
  }, [searchQuery]);

  const activeArticle = DOC_ARTICLES.find((a) => a.id === selectedArticleId) || DOC_ARTICLES[0];

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xl animate-fade-in select-none"
    >
      <div className="w-full max-w-6xl h-[88vh] rounded-[28px] bg-[#0A0D15]/95 border border-white/[0.12] shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl relative">
        {/* Apple Gradient Top Highlight */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#5E5CE6]/60 to-transparent" />

        {/* Modal Top Header */}
        <div className="h-16 px-6 bg-white/[0.02] border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#5E5CE6] to-[#BF5AF2] flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-white font-display tracking-tight">
                  Mivo Documentation & Architecture Reference
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[#5E5CE6]/20 text-[#64D2FF] border border-[#5E5CE6]/30">
                  v1.0 Pro
                </span>
              </div>
              <span className="text-[11px] text-white/50 font-medium">
                Comprehensive guide for Zoom/Meet/Discord-grade real-time collaboration
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white border border-white/[0.08] transition-all cursor-pointer text-xs font-semibold"
              title="Close Documentation (Esc)"
            >
              <span>Close</span>
              <span className="text-[10px] text-white/40 font-mono bg-white/[0.08] px-1.5 py-0.5 rounded">ESC</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Folder Directory Sidebar */}
          <aside className="w-80 bg-[#070910] border-r border-white/[0.07] flex flex-col p-4 space-y-3.5 flex-shrink-0">
            {/* Search Input with Icon */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search articles & guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#5E5CE6] focus:bg-white/[0.06] font-medium transition-all"
              />
            </div>

            {/* Folder Tree */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {Object.entries(categories).map(([categoryName, articles]) => {
                if (articles.length === 0) return null;
                const isExpanded = expandedCategories[categoryName] ?? true;

                return (
                  <div key={categoryName} className="space-y-1">
                    <button
                      onClick={() => toggleCategory(categoryName)}
                      className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white hover:bg-white/[0.03] transition-colors"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        {isExpanded ? (
                          <FolderOpen className="w-3.5 h-3.5 text-[#5E5CE6]" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-white/40" />
                        )}
                        <span className="truncate">{categoryName}</span>
                      </span>
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>

                    {isExpanded && (
                      <div className="pl-3 space-y-1 border-l border-white/[0.06] ml-2">
                        {articles.map((art) => {
                          const isSelected = selectedArticleId === art.id;
                          const IconComp = art.icon;

                          return (
                            <button
                              key={art.id}
                              onClick={() => setSelectedArticleId(art.id)}
                              className={`w-full flex flex-col gap-0.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-gradient-to-r from-[#5E5CE6]/30 to-[#0A84FF]/20 border border-[#5E5CE6]/40 text-white shadow-md'
                                  : 'text-white/70 hover:bg-white/[0.04] hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <IconComp className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#64D2FF]' : 'text-white/40'}`} />
                                <span className="truncate text-xs font-semibold">{art.title}</span>
                              </div>
                              <div className="flex items-center gap-2 pl-5.5 text-[10px] text-white/40">
                                <span>{art.readTime}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right Article Viewer */}
          <main className="flex-1 bg-[#090C14] p-6 sm:p-10 overflow-y-auto select-text">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Article Meta Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Compass className="w-3.5 h-3.5 text-[#5E5CE6]" />
                  <span>{activeArticle.category}</span>
                  <span>/</span>
                  <span className="text-white font-medium">{activeArticle.title}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{activeArticle.readTime}</span>
                </div>
              </div>

              {/* Rendered Article Content */}
              <div className="space-y-4">
                <div
                  className="prose prose-invert max-w-none text-white/80 leading-relaxed text-sm"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdownToHtml(activeArticle.content),
                  }}
                />

                {/* Code Block if Present */}
                {activeArticle.codeSnippet && (
                  <div className="rounded-2xl bg-[#06070B] border border-white/[0.1] overflow-hidden my-5 shadow-lg">
                    <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between text-xs text-white/50">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-violet-400" />
                        <span className="font-mono text-[11px] uppercase tracking-wider">{activeArticle.codeSnippet.lang}</span>
                      </div>
                      <button
                        onClick={() => handleCopyCode(activeArticle.codeSnippet!.code)}
                        className="flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedSnippet ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-[#64D2FF] overflow-x-auto leading-relaxed">
                      <code>{activeArticle.codeSnippet.code}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

/**
 * Rich markdown formatter helper for docs viewer
 */
function formatMarkdownToHtml(md: string): string {
  const lines = md.split('\n');
  const processed = lines.map((line) => {
    let l = line;
    if (l.startsWith('# ')) {
      return `<h1 class="text-2xl font-extrabold text-white font-display border-b border-white/[0.08] pb-3 mb-4 mt-2 tracking-tight">${l.slice(2)}</h1>`;
    }
    if (l.startsWith('### ')) {
      return `<h3 class="text-sm font-bold text-[#BF5AF2] font-display uppercase tracking-wider mt-5 mb-2">${l.slice(4)}</h3>`;
    }
    if (l.startsWith('## ')) {
      return `<h2 class="text-lg font-bold text-white font-display mt-6 mb-3">${l.slice(3)}</h2>`;
    }
    if (l.startsWith('> [!TIP]') || l.startsWith('> [!NOTE]')) {
      const type = l.includes('TIP') ? 'TIP' : 'NOTE';
      return `<div class="p-3.5 rounded-2xl bg-[#5E5CE6]/15 border border-[#5E5CE6]/35 text-[#64D2FF] text-xs font-medium my-3 flex items-start gap-2.5">
        <span class="font-bold text-white uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-[#5E5CE6]/30 border border-[#5E5CE6]/40">${type}</span>`;
    }
    if (l.startsWith('> ')) {
      return `<blockquote class="p-3 rounded-2xl bg-white/[0.03] border-l-4 border-[#5E5CE6] text-white/70 text-xs italic my-3">${l.slice(2)}</blockquote>`;
    }
    if (l.startsWith('* ') || l.startsWith('- ')) {
      const itemText = l.slice(2)
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
        .replace(/\`(.*?)\`/g, '<code class="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-[#64D2FF] font-mono text-xs border border-white/[0.06]">$1</code>');
      return `<li class="text-white/80 ml-4 list-disc mb-1.5 leading-relaxed text-xs">${itemText}</li>`;
    }
    return l
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\`(.*?)\`/g, '<code class="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-[#64D2FF] font-mono text-xs border border-white/[0.06]">$1</code>');
  });

  return processed.join('<br />');
}
