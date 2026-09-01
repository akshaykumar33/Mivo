# System Code Graph (Step 2)

## Architectural Code Graph & Component Flow Mapping

This code graph provides an end-to-end trace of Mivo's components, state stores, network boundaries, backend modules, database entities, and media pipelines.

---

## 1. High-Level Layer Hierarchy

```text
================================================================================
                               CLIENT LAYER (Web / Mobile)
================================================================================
[Pages / App Router Routes]
   ├── /auth/login, /auth/register
   ├── /channels/@me (Direct Messages & Friends)
   ├── /communities/:communityId (Community Home & Navigation)
   ├── /communities/:communityId/channels/:channelId (Channel Context)
   └── /rooms/:roomId (Unified Room with Text/Voice/Video/Stream Modes)
         │
         ▼
[UI Components & Feature Modules]
   ├── Navigation: CommunitySidebar, ChannelSidebar, UserProfileBar
   ├── Room View: RoomHeader, ModeSwitcher, MediaGrid, StageView, ChatSidebar
   ├── Realtime Controls: MicToggle, CamToggle, ScreenShareButton, StreamControls
   └── Modals/Dialogs: CreateCommunityDialog, RoleManager, PermissionMatrix
         │
         ▼
[Custom Hooks & State Management]
   ├── useAuth() ───► authStore (Zustand: user, sessionToken, status)
   ├── useCommunity() ───► communityStore (activeCommunity, channels, roles)
   ├── useRoom() ───► roomStore (activeRoom, mode, participants, permissions)
   ├── usePresence() ───► presenceStore (onlineUsers, typingIndicators)
   └── useWebRTC() ───► mediaSessionStore (localStreams, remoteTracks, SFUState)
         │
         ├────────────────────────────────────────┬─────────────────────────────┐
         ▼                                        ▼                             ▼
[HTTP / REST Client]                     [WebSocket Client]             [WebRTC Client]
(TanStack Query + Axios/Fetch)           (Socket.io / ws client)        (Mediasoup / LiveKit SDK)
         │                                        │                             │
==================================================╪=============================╪==============
                               CONTROL & REALTIME │ GATEWAY (NestJS Server)     │
==================================================╪=============================╪==============
         ▼                                        ▼                             │
[NestJS REST Controllers]               [NestJS WebSocket Gateway]             │
   ├── AuthController                      ├── RealtimeGateway (Events)         │
   ├── UsersController                     │     ├── handleConnection           │
   ├── CommunitiesController               │     ├── handleDisconnect           │
   ├── ChannelsController                  │     ├── room:join / room:leave     │
   ├── RoomsController                     │     ├── presence:heartbeat         │
   └── RolesController                     │     └── signaling:offer/answer ────┼──┐
         │                                        │                             │  │
         ▼                                        ▼                             │  │
[NestJS Domain Services]                [Realtime & Signaling Services]         │  │
   ├── AuthService                         ├── RealtimeSessionService           │  │
   ├── PermissionService (RBAC)            ├── PresenceService                  │  │
   ├── CommunityService                    └── WebRTCSignalingService ──────────┘  │
   ├── ChannelService                             │                                │
   └── RoomService                                ▼                                │
         │                              [Redis Pub/Sub & Cluster]                  │
         │                              (presence, typing, broadcasts)             │
         │                                        │                                │
         ▼                                        │                                │
[Data Repositories / DAL]                         │                                │
   ├── UserRepository                             │                                │
   ├── CommunityRepository                        │                                │
   ├── ChannelRepository                          │                                │
   ├── RoomRepository                             │                                │
   └── RoleRepository                             │                                │
         │                                        │                                │
         ▼                                        │                                │
[PostgreSQL Database (Prisma ORM)]                │                                │
   (Permanent source of truth: ACID state)        │                                │
==================================================╪================================╪===========
                                                  │       MEDIA PLANE (SFU Server)  │
==================================================╪================================╪===========
                                                  └─────────────────────────► [SFU Media Node]
                                                                              (Voice/Video/Screen)
```

---

## 2. Feature-Specific Flow Graphs

### Feature 1: User Authentication & Session Establishment
```text
User Input (LoginForm)
   ↓
useAuth().login(credentials)
   ↓
APIClient: POST /api/v1/auth/login
   ↓
AuthController.login()
   ↓
AuthService.validateUser() ──► Hash Verification (Argon2id)
   ↓
UserRepository.findByEmail() ──► PostgreSQL (users table)
   ↓
Generate Access JWT + Secure HttpOnly Refresh Token
   ↓
Set authStore (user state) ──► WebSocketClient.connect(authHeader)
   ↓
RealtimeGateway.handleConnection() ──► Validate JWT ──► Set Redis Presence (ONLINE)
```

### Feature 2: Community & Role Hierarchy Resolution (RBAC)
```text
User navigates to /communities/:communityId
   ↓
useCommunity(communityId) ──► TanStack Query fetch
   ↓
APIClient: GET /api/v1/communities/:communityId
   ↓
CommunitiesController.getById() ──► PermissionGuard(community.view)
   ↓
PermissionService.evaluatePermissions(userId, communityId)
   ↓
Query DB: CommunityMember JOIN Role JOIN RolePermission WHERE memberId = ?
   ↓
Calculate effective permission bitmask / array:
   - community.manage?
   - channel.create?
   - room.join?
   - voice.speak?
   ↓
Return Community DTO with authorized channels & room list
```

### Feature 3: Entering a Unified Room & Mode Switching
```text
User selects Room (e.g. "Design Discussion")
   ↓
useRoom().joinRoom(roomId)
   ↓
1. HTTP Sync: GET /api/v1/rooms/:roomId (Fetch metadata, active mode, permissions)
2. WebSocket Join: emit("room:join", { roomId })
   ↓
RealtimeGateway ──► RoomService.verifyRoomAccess(userId, roomId)
   ↓
Add Socket to Redis Channel: `room:${roomId}:events`
   ↓
Broadcast to Room: `room:participant_joined` { userId, role, timestamp }
   ↓
[User toggles Voice Mode]
   ↓
useWebRTC().connectToRoom(roomId)
   ↓
Signaling: emit("signaling:join_media", { roomId, tracks: ["audio"] })
   ↓
SFU Router allocates Transport ──► Connect WebRTC PeerConnection ──► Stream Audio
```

---

## 3. Component & File Traceability Matrix

| Feature Domain | Client Component / Hook | Client Store | API Endpoint / Gateway Event | Backend Controller / Service | Database Entity | Redis Key Pattern |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `<LoginForm>`, `<RegisterForm>`, `useAuth` | `authStore` | `POST /auth/login`, `POST /auth/refresh` | `AuthController`, `AuthService` | `User`, `Account`, `Session` | `auth:session:<id>` |
| **Communities** | `<CommunitySidebar>`, `<CommunityView>`, `useCommunity` | `communityStore` | `POST/GET /communities`, `PATCH /communities/:id` | `CommunitiesController`, `CommunityService` | `Community`, `CommunityMember` | `cache:community:<id>` |
| **Channels** | `<ChannelSidebar>`, `<ChannelHeader>`, `useChannel` | `channelStore` | `POST/GET /channels`, `DELETE /channels/:id` | `ChannelsController`, `ChannelService` | `Channel`, `ChannelMember` | `cache:channel:<id>` |
| **Rooms** | `<RoomContainer>`, `<ModeSwitcher>`, `useRoom` | `roomStore` | `POST/GET /rooms`, `WS room:join`, `WS room:leave` | `RoomsController`, `RoomService`, `RealtimeGateway` | `Room`, `RoomMember`, `RoomMode` | `room:<id>:active_members` |
| **RBAC / Perms** | `<PermissionMatrix>`, `<RoleBadge>`, `usePermissions` | `authStore` | `GET/PATCH /communities/:id/roles` | `RolesController`, `PermissionService` | `Role`, `Permission`, `RolePermission` | `perms:<commId>:<userId>` |
| **Presence** | `<UserAvatarWithStatus>`, `usePresence` | `presenceStore` | `WS presence:heartbeat`, `WS presence:update` | `RealtimeGateway`, `PresenceService` | `User` (lastSeenAt) | `presence:user:<id>`, `presence:online_set` |
| **Signaling** | `<MediaControls>`, `useWebRTC` | `mediaSessionStore`| `WS signaling:offer`, `WS signaling:ice_candidate` | `RealtimeGateway`, `SignalingService` | `MediaSession`, `MediaParticipant` | `sfu:session:<id>:producers` |

---

## 4. Failure & Resilience Tracing

1. **WebSocket Disconnection / Reconnection**:
   * Client detects disconnect (`io.on("disconnect")`).
   * UI displays non-intrusive "Reconnecting..." banner with cached optimistic state.
   * Auto-reconnect with exponential backoff + jitter (1s, 2s, 4s, max 10s).
   * On reconnect: Send `room:sync_state` with last seen event sequence ID to replay missed diffs.

2. **Database Failover / Connection Drop**:
   * Prisma client utilizes connection pool with retry policies for transient network errors.
   * Read queries for cached community metadata fall back gracefully to Redis read-through cache where configured.
   * Mutating requests return structured `503 Service Unavailable` with `Retry-After` header.

3. **SFU Node Degradation**:
   * ICE connection state monitored via `peerConnection.oniceconnectionstatechange`.
   * Trigger ICE restart if state drops to `disconnected` or `failed`.
   * Fallback to audio-only if network quality drops below bandwidth threshold (detected via RTCStatsReport).
