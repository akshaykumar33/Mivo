# 📖 Mivo User Guide & Platform Documentation

Welcome to **Mivo** — the next-generation unified real-time communication platform. This comprehensive user guide covers every module, feature, and workflow in the platform.

---

## Table of Contents
1. [Getting Started & Authentication](#1-getting-started--authentication)
2. [Workspaces & Channel Hierarchy](#2-workspaces--channel-hierarchy)
3. [Unified Room Modes (Chat, Voice, Video, Screen Share)](#3-unified-room-modes)
4. [Interactive Video Tiles, Drag-and-Drop & Spotlight](#4-interactive-video-tiles--spotlight)
5. [Floating Picture-in-Picture (PiP) Presenter Stage](#5-floating-picture-in-picture-pip)
6. [Host & Admin Moderation](#6-host--admin-moderation)
7. [Multilingual Live Translation & Audio Synthesis (TTS)](#7-multilingual-translation--tts)
8. [Whisper AI Meeting Scribe & Automated MOM](#8-whisper-ai-scribe--automated-mom)
9. [Permission-Gated Recording & Consent Compliance](#9-permission-gated-recording--consent)

---

## 1. Getting Started & Authentication

### A. Logging In & Quick Access
1. Open the application at **`http://localhost:3000/login`**.
2. **1-Click Demo Profiles**:
   - **👑 Dev Admin** (`dev@mivo.app`): Community Owner / Lead Architect
   - **🎨 Alex Rivera** (`alex@mivo.app`): Staff Designer / Admin
   - **⚡ Sarah Connor** (`sarah@mivo.app`): Backend Lead / Admin
   - **🇪🇸 Carlos Mendoza** (`carlos@mivo.app`): Frontend Specialist (Spanish Speaker)
   - **🇮🇳 Priya Sharma** (`priya@mivo.app`): Cloud Architect (Hindi Speaker)
   - **📻 Elena Rostova** (`elena@mivo.app`): Media SFU Specialist
   *(All demo accounts share the password: `Password123!`)*

---

## 2. Workspaces & Channel Hierarchy

Mivo organizes real-time communication into three tiers:
1. **Community (Left Rail)**: Top-level workspace (e.g. *Wysbryx Engineering*, *Design & UX Guild*).
2. **Channel (Sub-Sidebar)**: Categorized topic groups:
   - **`#general`**: Team updates and discussion.
   - **`#voice-lounge`**: Drop-in voice huddle channel.
   - **`#pair-programming`**: Code reviews and screen sharing.
   - **Public vs. Private**: Public channels are open to all community members; Private channels are restricted to specific roles.
3. **Unified Room**: The live interactive stage inside each channel.

---

## 3. Unified Room Modes

Unlike traditional apps that force you to jump between different voice, video, or chat channels, Mivo lets you toggle modes dynamically inside the **same room**:

| Mode | Viewport Experience | Best For |
| :--- | :--- | :--- |
| **`TEXT`** | Real-time chat stream with instant message translation & composer. | Asynchronous updates & links. |
| **`VOICE`** | Spatial voice huddle with dynamic green soundwave visualizers. | Standups & casual co-working. |
| **`VIDEO`** | Multi-tile HD video grid with live camera feeds and audio equalizers. | Team meetings & discussions. |
| **`SCREEN_SHARE`** | 16:9 Cinema theater viewport with attendee filmstrip below. | Demos, pairing & presentations. |
| **`STREAM`** | Live broadcaster stage with audience view. | All-hands & tech talks. |

---

## 4. Interactive Video Tiles & Spotlight

Every participant tile in Video and Voice modes provides interactive controls:
- **🔀 Drag & Drop**: Click and hold the top-left **Drag Handle (`GripVertical`)** to reorder and reposition tiles anywhere on your stage.
- **📌 Spotlight Focus Mode**: Hover over any tile and click **Pin (`Pin`)** to expand that speaker into the primary **16:9 Hero Stage View**.
- **🔊 Individual Volume Sliders**: Hover over any remote speaker to adjust their volume from **0% to 200%**.
- **📊 Live Audio Equalizer**: 3-bar green animated equalizer waves pulse directly on the speaker's nameplate during active speech.
- **Auto-Arrange Grid**: Click **"Auto-Arrange Grid"** at the top of the video stage to immediately reset custom tile arrangements back to the optimal speaker layout.

---

## 5. Floating Picture-in-Picture (PiP)

- **Launch**: Click the **`PictureInPicture2` icon** in the bottom floating media bar (or share your screen).
- **Draggable Window**: A floating glassmorphic box appears on the bottom-right of your screen showing all participant video feeds and your own camera preview.
- **Presenter Freedom**: Allows you to see everyone's facial reactions and raised hands while presenting slides or code!

---

## 6. Host & Admin Moderation

Hosts and Admins have moderation powers directly on video tiles and inside the **Stage Members** drawer:
- 🔇 **Mute Participant for Everyone**: Remotely silences a speaker across the room via WebSockets.
- 👑 **Transfer Host**: Hand over host privileges to another attendee.
- 🚫 **Remove from Room**: Evict disruptive participants from the call.

---

## 7. Multilingual Translation & TTS

Mivo breaks down language barriers across both chat and live speech:
- **In-Chat Translation**:
  1. Select your target language in the chat header (Spanish 🇪🇸, French 🇫🇷, German 🇩🇪, Hindi 🇮🇳, Japanese 🇯🇵, Chinese 🇨🇳, etc.).
  2. Click **`Languages` Translate** on any message to reveal the translated sub-card.
  3. Click **`Volume2`** to hear the translated message read aloud in a native accent!

---

## 8. Whisper AI Scribe & Automated MOM

Click **`✨ AI Notes & MOM`** in the room header to open the AI drawer:
1. **Live Dual-Language Subtitles**: Transcribes speech in real time with side-by-side original and translated lines.
2. **In-Meeting Markdown Scratchpad**: Draft key decisions and action items during the call.
3. **Automated MOM Document**:
   - Click the **`MOM Doc`** tab to auto-generate a structured document with Executive Summary, Attendees, Decisions, Action Items, and Full Transcript.
4. **Email Dispatch**: Click **"Email Official MOM & Notes"** to send the recap directly to attendee email inboxes!

---

## 9. Permission-Gated Recording & Consent

1. **Start Recording**: Community Owners and Admins can click **`Record`** in the header.
2. **Consent Alert Banner**: All participants receive an alert banner:
   > *"🔴 Meeting Recording Active: [Host Name] has started recording this session. By staying in the room, you acknowledge and consent to being recorded."*
3. **Live `REC` Timer**: All attendees see a red pulsing **`🔴 REC 00:03:45`** badge in the header.
4. **Automatic Download**: When the host clicks **Stop Recording**, a high-definition `.webm` video file is saved and downloaded to their computer.

---
*Mivo Platform Documentation • Build with Excellence.*
