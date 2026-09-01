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
  ExternalLink,
} from 'lucide-react';

export interface DocArticle {
  id: string;
  title: string;
  category: string;
  icon: any;
  content: string;
}

export const DOC_ARTICLES: DocArticle[] = [
  {
    id: 'quick-start',
    category: '1. Getting Started',
    title: 'Quick Access & Demo Profiles',
    icon: Sparkles,
    content: `
# 🚀 Quick Access & Demo Profiles

Welcome to **Mivo** — the unified real-time communication platform.

### 🔑 1-Click Demo Profiles (Password: \`Password123!\`):
* **👑 Dev Admin** (\`dev@mivo.app\`): Platform Architect & Community Owner
* **🎨 Alex Rivera** (\`alex@mivo.app\`): Staff Designer & Community Admin
* **⚡ Sarah Connor** (\`sarah@mivo.app\`): Principal Backend Lead
* **🇪🇸 Carlos Mendoza** (\`carlos@mivo.app\`): Frontend Specialist (Spanish Speaker)
* **🇮🇳 Priya Sharma** (\`priya@mivo.app\`): Cloud Architect (Hindi Speaker)
* **📻 Elena Rostova** (\`elena@mivo.app\`): Media SFU Infrastructure Specialist

> **Tip:** You can log in instantly by clicking any profile card on the login screen.
    `,
  },
  {
    id: 'hierarchy-channels',
    category: '2. Workspaces & Hierarchy',
    title: 'Communities & Public vs Private Channels',
    icon: Layers,
    content: `
# 🏢 Workspaces & Channel Architecture

Mivo organizes real-time communication into three tiers:

### 1. Communities (Left Rail)
The top-level organization or workspace (e.g. *Wysbryx Engineering*, *Design & UX Guild*).

### 2. Channels (Sub-Sidebar)
Categorized groups with specific communication intentions:
* **\`#general\`** (Type: GENERAL): Asynchronous discussion, updates, and daily syncs.
* **\`#voice-lounge\`** (Type: VOICE): Drop-in spatial voice rooms.
* **\`#pair-programming\`** (Type: MEDIA): Live code reviews and high-framerate screen sharing.

### 🔒 Public vs. Private Channels
* **Public Channels (\`isPrivate: false\`)**: Open and visible to all community members.
* **Private Channels (\`isPrivate: true\`)**: Restricted only to Owners, Admins, or members with explicit permission.
    `,
  },
  {
    id: 'unified-room-modes',
    category: '3. Unified Communication Modes',
    title: 'Dynamic Stage Modes (Chat, Voice, Video, Screen)',
    icon: Video,
    content: `
# 🎛️ Unified Room Modes

In Mivo, a room is a **single unified communication stage** that dynamically adapts its layout without dropping participants or switching channels:

| Mode | Viewport Experience | Optimal Use Case |
| :--- | :--- | :--- |
| **\`TEXT\`** | Live chat stream with message translation & composer | Async updates & code links |
| **\`VOICE\`** | Spatial voice huddle with dynamic soundwave waves | Casual standups & pairing |
| **\`VIDEO\`** | Multi-tile HD video grid with audio equalizers | Team syncs & client meetings |
| **\`SCREEN_SHARE\`** | 16:9 Cinema theater stage with attendee filmstrip | Live presentations & demos |
| **\`STREAM\`** | Broadcast live stage with presenter view | All-hands & town halls |

> **Mode Switching:** Click any mode in the top header switcher to seamlessly transform the room layout for everyone in real time!
    `,
  },
  {
    id: 'interactive-tiles-drag',
    category: '4. Stage Controls & Layouts',
    title: 'Drag & Drop, Spotlight & Auto-Arrange',
    icon: Monitor,
    content: `
# 🔀 Interactive Stage Tiles & Layouts

Every video tile gives you rich interactive controls:

### 1. Drag & Drop Reordering
* Click and hold the top-left **Drag Handle (\`GripVertical\`)** to reposition participant tiles anywhere on your stage.

### 2. 📌 Spotlight Focus Mode
* Hover over any participant and click **Pin (\`Pin\`)** to expand that speaker into the dominant **16:9 Hero Stage View**, with other attendees neatly organized in a bottom filmstrip.
* Click **Unpin** to return to the equal grid.

### 3. 🔊 Individual Peer Volume Sliders
* Hover over any remote speaker and click the **Volume icon** to adjust their volume independently from **0% to 200%**.

### 4. 📊 Dynamic 3-Bar Audio Equalizer
* Live green animated equalizer waves pulse directly on the speaker's nameplate during active speech.

### 5. Auto-Arrange Grid
* Click **"Auto-Arrange Grid"** in the top header to reset custom drag positions back to the optimal speaker layout.
    `,
  },
  {
    id: 'pip-overlay',
    category: '4. Stage Controls & Layouts',
    title: 'Floating Picture-in-Picture (PiP)',
    icon: PictureInPicture2,
    content: `
# 🖼️ Floating Picture-in-Picture (PiP) Presenter Stage

When presenting slides or sharing code, you still want to see attendee reactions:

### How It Works:
1. Click the **PiP button (\`PictureInPicture2\`)** in the bottom floating media bar (or start a Screen Share).
2. A floating, draggable glassmorphic window appears on the bottom-right of your screen.
3. Shows all connected attendees' video feeds + your own camera preview and microphone status.
4. Drag it anywhere or minimize/maximize as needed!
    `,
  },
  {
    id: 'host-moderation',
    category: '5. AI & Moderation Suite',
    title: 'Host Controls: Remote Mute, Change Host & Kick',
    icon: Shield,
    content: `
# 👑 Host & Admin In-Meeting Moderation

Community Owners and Admins have full host moderation privileges:

### Moderation Actions:
* 🔇 **Mute Participant for Everyone**: Remotely silences a speaker across the entire room via WebSockets (\`ROOM_HOST_ACTION\`).
* 👑 **Transfer Host Role**: Hands over host privileges to another attendee instantly.
* 🚫 **Remove from Room**: Evicts disruptive participants from the call immediately.

> **Accessing Controls:** Click the **Moderation Sliders (\`Sliders\`)** on any video tile or open the right-hand **Stage Members** drawer.
    `,
  },
  {
    id: 'translation-tts',
    category: '5. AI & Moderation Suite',
    title: 'Multilingual Translation & Audio Speech (TTS)',
    icon: Languages,
    content: `
# 🌍 Multilingual Real-Time Translation & Audio (TTS)

Mivo bridges language barriers across both written chat and spoken voice:

### 1. In-Chat Real-Time Message Translation
* Select your target language in the chat header (Spanish 🇪🇸, French 🇫🇷, German 🇩🇪, Hindi 🇮🇳, Japanese 🇯🇵, Chinese 🇨🇳, etc.).
* Click **\`Languages\` Translate** on any message to reveal the translated sub-card.
* Click the **speaker icon (\`Volume2\`)** to hear the translated message read aloud in a native accent via Web Speech Synthesis!

### 2. Live Verbal Speech Subtitles
* Inside the **AI Notes** drawer, spoken words are transcribed into dual-language subtitles (Original Spoken Line + Translated Line).
    `,
  },
  {
    id: 'whisper-mom',
    category: '5. AI & Moderation Suite',
    title: 'Whisper AI Scribe & Automated MOM Emailing',
    icon: FileText,
    content: `
# 📋 Whisper AI Scribe & Minutes of Meeting (MOM)

### 1. Live Speech Dictation
* Click **\`✨ AI Notes & MOM\`** in the room header.
* Click **"Start Dictation"** to transcribe speech into a real-time timecoded conversation log.

### 2. In-Meeting Markdown Scratchpad
* Use the **Notes** tab to draft action items, decisions, and agendas during the call.

### 3. Automated MOM Document & Email Dispatch
* Click the **\`MOM Doc\`** tab to auto-generate a structured document:
  * Executive Summary
  * In-Meeting Notes & Key Decisions
  * Action Items Table with Checkboxes
  * Full Bilingual Transcript
* Click **"Email Official MOM & Notes"** to dispatch the recap directly to attendee email inboxes!
    `,
  },
  {
    id: 'recording-consent',
    category: '5. AI & Moderation Suite',
    title: 'Permission-Gated Recording & Consent Compliance',
    icon: CircleDot,
    content: `
# 🔴 Meeting Recording & Consent Compliance

### 1. Host Permission Gate
* Only Community Owners and Admins can start or stop recordings.

### 2. Room-Wide Consent Alert Banner
* When recording begins, an unmissable top alert drops down on **all users' screens**:
  > *"🔴 Meeting Recording Active: [Host Name] has started recording this session. By staying in the room, you acknowledge and consent to being recorded."*
* Includes **"I Consent"** and **"Leave Call"** options.

### 3. Live Elapsed \`REC\` Timer Badge
* All participants see a red pulsing **\`🔴 REC 00:03:45\`** badge in the header.

### 4. Automatic Video Download
* Stopping the recording automatically compiles and downloads a high-definition \`.webm\` video file to your computer.
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
  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({
    '1. Getting Started': true,
    '2. Workspaces & Hierarchy': true,
    '3. Unified Communication Modes': true,
    '4. Stage Controls & Layouts': true,
    '5. AI & Moderation Suite': true,
  });

  const categories = React.useMemo(() => {
    const map: Record<string, DocArticle[]> = {};
    DOC_ARTICLES.forEach((art) => {
      if (!map[art.category]) map[art.category] = [];
      if (
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-5xl h-[85vh] rounded-3xl bg-[#090B10] border border-white/[0.1] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="h-16 px-6 bg-gradient-to-r from-violet-600/15 via-indigo-600/10 to-transparent border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white font-display tracking-tight">
                Mivo Platform User Guide & Documentation
              </h2>
              <span className="text-[11px] text-violet-400 font-semibold">
                Interactive Directory & Module Reference
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Close Documentation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Folder Directory Sidebar */}
          <aside className="w-72 bg-[#07080C] border-r border-white/[0.06] flex flex-col p-4 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-medium"
              />
            </div>

            {/* Folder Tree */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {Object.entries(categories).map(([categoryName, articles]) => {
                if (articles.length === 0) return null;
                const isExpanded = expandedCategories[categoryName] ?? true;

                return (
                  <div key={categoryName} className="space-y-1">
                    <button
                      onClick={() => toggleCategory(categoryName)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/[0.03] transition-colors"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        {isExpanded ? (
                          <FolderOpen className="w-3.5 h-3.5 text-violet-400" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span className="truncate">{categoryName}</span>
                      </span>
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>

                    {isExpanded && (
                      <div className="pl-4 space-y-0.5 border-l border-white/[0.04] ml-2">
                        {articles.map((art) => {
                          const isSelected = selectedArticleId === art.id;
                          const IconComp = art.icon;

                          return (
                            <button
                              key={art.id}
                              onClick={() => setSelectedArticleId(art.id)}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all text-left truncate ${
                                isSelected
                                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                              }`}
                            >
                              <IconComp className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{art.title}</span>
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
          <main className="flex-1 bg-[#090B10] p-6 sm:p-8 overflow-y-auto select-text">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="prose prose-invert max-w-none text-slate-200 leading-relaxed text-sm">
                <div
                  className="space-y-4"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdownToHtml(activeArticle.content),
                  }}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

/**
 * Clean markdown formatter helper for docs viewer
 */
function formatMarkdownToHtml(md: string): string {
  const lines = md.split('\n');
  const processed = lines.map((line) => {
    let l = line;
    if (l.startsWith('# ')) {
      return `<h1 class="text-2xl font-extrabold text-white font-display border-b border-white/[0.08] pb-3 mb-4 mt-2">${l.slice(2)}</h1>`;
    }
    if (l.startsWith('### ')) {
      return `<h3 class="text-base font-bold text-violet-300 font-display mt-5 mb-2">${l.slice(4)}</h3>`;
    }
    if (l.startsWith('## ')) {
      return `<h2 class="text-lg font-extrabold text-white font-display mt-6 mb-3">${l.slice(3)}</h2>`;
    }
    if (l.startsWith('> ')) {
      return `<blockquote class="p-3 rounded-2xl bg-violet-950/40 border border-violet-500/40 text-violet-200 text-xs italic my-3">${l.slice(2)}</blockquote>`;
    }
    if (l.startsWith('* ') || l.startsWith('- ')) {
      const itemText = l.slice(2)
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
        .replace(/\`(.*?)\`/g, '<code class="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-cyan-300 font-mono text-xs border border-white/[0.06]">$1</code>');
      return `<li class="text-slate-300 ml-4 list-disc mb-1.5 leading-relaxed">${itemText}</li>`;
    }
    return l
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\`(.*?)\`/g, '<code class="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-cyan-300 font-mono text-xs border border-white/[0.06]">$1</code>');
  });

  return processed.join('<br />');
}
