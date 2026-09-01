# Feature Matrix & Phased Roadmap (Step 3)

## Complete Phased Feature Breakdown (V1 through V7)

---

## V1 — Foundation (Current Priority Phase)
* **Identity & Authentication**:
  * Email/Password registration & login with Argon2id.
  * Short-lived JWT + HttpOnly Refresh Token flow.
  * User profile management (username, displayName, avatarUrl, bio, custom status).
* **Community Hierarchy**:
  * Create, update, customize community (name, icon, banner, description, privacy).
  * Community membership lifecycle (join, leave, kick, ban).
* **Granular RBAC System**:
  * Default system roles (`OWNER`, `ADMIN`, `MODERATOR`, `MEMBER`, `GUEST`).
  * Custom community roles with granular permission toggles (`community.manage`, `channel.create`, `room.manage`, `voice.speak`, etc.).
* **Channel Subsystem**:
  * Organize community into category channels (`Text`, `Voice`, `Media`).
  * Channel visibility (`PUBLIC`, `PRIVATE`, `ROLE_RESTRICTED`).
* **Unified Room Foundation**:
  * Create rooms within channels.
  * Room membership and mode configuration (`TEXT`, `VOICE`, `VIDEO`, `SCREEN_SHARE`, `STREAM`).
* **Frontend Navigation & Shell**:
  * Responsive layout with Community Sidebar, Channel/Room Navigation, and User Profile Control Bar.
  * Dynamic theme engine (Sleek Dark Mode with curated HSL color tokens).

---

## V2 — Realtime Chat Subsystem
* Direct Messaging (1-to-1 DMs) and Group Direct Messages.
* Realtime Channel & Room chat with WebSocket delivery.
* Message formatting, rich embeds, and link unfurling.
* Threads & contextual replies.
* Emoji reactions with realtime counters.
* S3 direct presigned attachments (images, audio, files).
* Realtime presence (`online`, `idle`, `dnd`, `offline`) and typing indicators.
* Unread badges and notification preferences.
* Cursor-based message pagination with TanStack Virtual virtualization.

---

## V3 — Interactive Realtime Rooms (Voice & Video)
* WebRTC SFU media integration for multi-participant rooms.
* High-definition audio with noise suppression, echo cancellation, and active speaker detection.
* Video grid with adaptive resolution (Simulcast / SVC).
* Low-latency screen sharing with system audio.
* Participant controls (Mute, Deafen, Camera Off, Kick from Stage, Raise Hand).
* Robust network reconnection and ICE restart handling.

---

## V4 — Live Streaming & Large Broadcasts
* Creator "Go Live" broadcasting pipeline.
* High-scale viewer distribution via HLS/LL-HLS and CloudFront CDN.
* Interactive Live Stream Chat with message rate-limiting (slow mode).
* Stage permissions (Speakers vs Audience).
* Live stream recording and VOD replay storage in S3.

---

## V5 — Social Discovery & Random Matching
* Public Community discovery directory with category tags and search.
* Interest-based matchmaking and random conversation discovery (Omegle-style with safety filters).
* Temporary disposable rooms with auto-deletion on exit.
* Social graph features: Follow, Friend requests, Block lists, and User reputation.

---

## V6 — Mobile App (React Native / Expo)
* Cross-platform iOS and Android application with unified UI system.
* Push notifications (APNs / FCM) for mentions, calls, and DMs.
* Background voice call audio management and callkit integration.
* Mobile-optimized gestures, swipeable sheets, and responsive bottom tabs.

---

## V7 — Enterprise Scale & Hardening
* Multi-region active-passive database replication and read replica pools.
* Redis cluster scaling with sharded pub/sub channels.
* Automated load testing suites (k6 for HTTP/WS, Mediasoup load-tests for SFU).
* OpenTelemetry distributed tracing and Prometheus/Grafana dashboards.
* Security auditing, automated pentest pipelines, and SOC2 compliance readiness.
