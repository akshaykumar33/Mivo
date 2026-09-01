# UI/UX Design System (Step 6)

## Visual Architecture, Tokens, Component Hierarchy & Room Mode UX

Mivo features a bespoke, premium dark-mode-first aesthetic with glassmorphic surface depth, vibrant HSL accents, fluid micro-interactions, and a cohesive room mode switching paradigm.

---

## 1. Visual Identity & Color System

### 1.1 Color Tokens (HSL Specification)

```css
:root {
  /* Background & Base Surfaces */
  --bg-canvas: 224 28% 6%;          /* #0B0E14 - Deepest background canvas */
  --bg-surface-0: 224 24% 8%;       /* #0F131C - Community Sidebar */
  --bg-surface-1: 224 20% 11%;      /* #151A26 - Navigation & Channel Sidebar */
  --bg-surface-2: 224 18% 14%;      /* #1C2232 - Main Chat / Stage Area */
  --bg-surface-3: 224 16% 18%;      /* #252D42 - Cards, Modals, Overlays */
  --bg-glass: 224 24% 10% / 0.75;   /* Glassmorphic backdrop blur */

  /* Primary Brand & Accents */
  --accent-primary: 262 83% 58%;    /* #7C3AED - Electric Violet */
  --accent-primary-hover: 262 83% 66%;
  --accent-primary-glow: 262 83% 58% / 0.35;

  /* Secondary Accents */
  --accent-cyan: 190 95% 50%;       /* #06B6D4 - Cyber Cyan (Live/Stream) */
  --accent-emerald: 158 75% 45%;    /* #10B981 - Emerald (Online/Voice Connected) */
  --accent-amber: 38 92% 50%;       /* #F59E0B - Amber (Idle/Warning) */
  --accent-rose: 350 89% 60%;       /* #F43F5E - Rose (DND/Muted/End Call) */

  /* Typography Colors */
  --text-primary: 210 40% 98%;      /* Crisp white / slate 50 */
  --text-secondary: 215 20% 75%;    /* Muted slate 300 */
  --text-muted: 215 16% 50%;        /* Slate 500 */

  /* Borders & Dividers */
  --border-subtle: 224 15% 20%;     /* Subtle outline */
  --border-glass: 224 20% 30% / 0.4;/* Frosted glass border */
}
```

---

## 2. Typography Hierarchy

* **Display & Headings**: `Outfit`, sans-serif (Geometric, modern, high character).
* **Body, Code & Controls**: `Inter`, system-ui, sans-serif (Exceptional legibility at small sizes).
* **Scale**:
  * `text-3xl`: 32px / 1.2 line-height (bold) - Hero titles & modal headers.
  * `text-2xl`: 24px / 1.25 line-height (semibold) - Community names.
  * `text-xl`: 20px / 1.3 line-height (semibold) - Channel & Room headers.
  * `text-base`: 15px / 1.5 line-height (regular) - Primary chat messages & reading text.
  * `text-sm`: 13px / 1.4 line-height (medium) - Channel list items & user tags.
  * `text-xs`: 11px / 1.3 line-height (medium) - Timestamps, badges, status labels.

---

## 3. Desktop Application Layout Blueprint

```text
┌───────┬──────────────┬───────────────────────────────────────────────────────┬──────────────┐
│ (1)   │ (2)          │ (3) MAIN ROOM VIEW & STAGE AREA                       │ (4)          │
│ Comm. │ Channels     ├───────────────────────────────────────────────────────┤ Room /       │
│ Icons │ & Navigation │ [Room Header] ── [Mode Switcher Bar: Chat|Voice|Video]│ Community    │
│       │              ├───────────────────────────────────────────────────────┤ Members      │
│ [MIVO]│ # general    │                                                       │              │
│       │ # random     │                                                       │ 🟢 Online (4) │
│ ( 1 ) │              │                                                       │  • Alice     │
│ ( 2 ) │ 🔊 Huddle    │               ACTIVE MODE CONTAINER                   │  • Bob       │
│       │ 📹 Stage     │       (Dynamic Grid / Stream / Chat Thread)           │              │
│ ( + ) │              │                                                       │ ⚪ Offline(12)│
│       ├──────────────┤                                                       │              │
│       │ [User Bar]   │                                                       │              │
│       │ Avatar + Mic │                                                       │              │
│ [⚙️]  │ [Mic][Cam]   │                                                       │              │
└───────┴──────────────┴───────────────────────────────────────────────────────┴──────────────┘
```

* **Region 1 (Community Rail - 72px)**: Vertical list of joined community icons with rounded active indicators and tooltips.
* **Region 2 (Channel/Room Sidebar - 240px)**: Collapsible categories (`TEXT CHANNELS`, `VOICE ROOMS`, `LIVE STAGES`), unread indicators, and bottom user control bar.
* **Region 3 (Main Content Stage - Flex 1)**: Unified Room Container with dynamic header, mode switcher tabs, stage area, and message composer.
* **Region 4 (Right Inspector - 260px, Collapsible)**: Room participants, active speaker highlights, and pinned information.

---

## 4. The Unified "Room Mode Switcher" Interaction

The room mode switcher allows instant transitions across communication states without tearing down context:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [💬 Text Chat]   [🎙️ Voice Huddle]   [📹 Video Meeting]   [🖥️ Screen Share] │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Text Mode**:
   * Centered message stream with cursor pagination.
   * Auto-scroll with smart pin when user is at bottom.
   * Rich input bar with mention autocomplete (`@user`), emojis (`:smile:`), and file drops.

2. **Voice Mode**:
   * Circular participant avatars with green glowing pulse for active speakers.
   * Persistent text sidebar docked to the right.
   * In-call control tray (Mute, Deafen, Noise Suppression, Disconnect).

3. **Video Mode**:
   * Dynamic responsive grid (1x1, 2x2, 3x3 layout algorithms).
   * Active speaker auto-pinning to primary stage with picture-in-picture filmstrip.
   * Camera and virtual background toggles.

4. **Screen Share & Live Broadcast Mode**:
   * Large focal stage showcasing presenter's viewport.
   * Floating attendee video tiles overlay.
   * Audience stage hands up and live chat side-by-side.

---

## 5. Responsive Design Breakpoints

| Breakpoint | Target Devices | Layout Behavior |
| :--- | :--- | :--- |
| **Mobile (`< 640px`)** | iPhone, Android phones | Single-view navigation with bottom tab bar and slide-over drawers for channels/members. Full-screen active room with floating gesture controls. |
| **Tablet (`640px - 1024px`)** | iPads, Tablets | Collapsible channel sidebar, overlay participant drawer, responsive 2x2 video grid. |
| **Desktop (`1024px - 1440px`)** | Laptops, Standard Displays | Full 4-column layout with fixed sidebars. |
| **Ultrawide (`> 1440px`)** | High-res Desktop Monitors | Expanded chat width, multi-column media grid, thread side-panels open simultaneously. |

---

## 6. Micro-Interactions & Animation Tokens (Framer Motion)

* **Spring Curve (Snappy UI)**: `{ type: "spring", stiffness: 400, damping: 30 }`
* **Smooth Morph (Mode Switch)**: `{ layout: true, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }`
* **Glow Pulses**: Continuous 1.5s ease-in-out breathing animation for active speakers and live stream indicators.
* **Accessibility**: Full `@media (prefers-reduced-motion: reduce)` support that disables layout springs and transitions to immediate opacity fades.
