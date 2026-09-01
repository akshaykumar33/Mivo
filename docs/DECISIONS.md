# Architectural Decisions (Step 3)

## Architectural Decision Records (ADRs)

---

### ADR-001: PostgreSQL as Primary Source of Truth
* **Status**: Accepted
* **Context**: Mivo requires strict relational consistency, foreign keys, ACID transactions, and robust indexing for entities such as Users, Communities, Roles, Granular Permissions, Channels, and Rooms.
* **Decision**: Use PostgreSQL with Prisma ORM as the single authoritative database for all persistent state.
* **Consequences**: Strong consistency, reliable relational modeling, simplified migration workflows. No distributed transactions across unrelated DB engines.

---

### ADR-002: Redis for Ephemeral Realtime State & Message Pub/Sub
* **Status**: Accepted
* **Context**: User presence heartbeats, typing status, and high-frequency WebSocket fanout must not overload the transactional SQL database with sub-second write churn.
* **Decision**: Use Redis with key-level TTLs for ephemeral state (`presence:user:<id>`, `room:<id>:active`) and Redis Pub/Sub as the message bus across scaled NestJS WebSocket nodes.
* **Consequences**: Sub-millisecond latency for presence and typing; PostgreSQL remains protected from high-frequency volatile writes.

---

### ADR-003: Three-Plane Architectural Separation
* **Status**: Accepted
* **Context**: Mixing high-bandwidth media streams or high-frequency socket bursts with transactional REST APIs causes bottlenecks, CPU starvation, and deployment coupling.
* **Decision**: Strictly separate Control Plane (NestJS REST), Realtime Plane (WebSocket Gateway + Redis), and Media Plane (WebRTC SFU).
* **Consequences**: Clear operational boundaries, independent autoscaling, and zero media data proxying through standard HTTP servers.

---

### ADR-004: SFU Architecture for Interactive Group Media
* **Status**: Accepted
* **Context**: Peer-to-peer (Mesh) WebRTC fails past 4 participants due to `O(N^2)` bandwidth scaling on client uplinks. MCU architectures introduce high server-side transcoding latency and cost.
* **Decision**: Implement a Selective Forwarding Unit (SFU) architecture where clients send 1 upstream track and receive selective downstream tracks from other active participants.
* **Consequences**: Scales voice/video rooms to 50+ interactive participants cleanly with low server CPU overhead.

---

### ADR-005: Hybrid Authentication with JWT Access Tokens & HttpOnly Refresh Tokens
* **Status**: Accepted
* **Context**: Need secure, stateless authentication for API and WebSocket gateways while preventing XSS token theft and supporting immediate session revocation.
* **Decision**: Short-lived (15 minutes) RS256/HS256 JWT access tokens paired with long-lived (7 days) cryptographically random refresh tokens stored in secure, HttpOnly, SameSite cookies and verified against a revocable session database table.
* **Consequences**: Immune to client-side script token theft; allows instant revocation by deleting the session in PostgreSQL.

---

### ADR-006: Granular Bitmask & String RBAC System
* **Status**: Accepted
* **Context**: Discord-style community hierarchies require custom roles, permission overrides per channel/room, and hierarchical inheritance (`OWNER > ADMIN > MODERATOR > MEMBER > GUEST`).
* **Decision**: Centralize authorization in a dedicated `PermissionService` evaluating string permissions (e.g., `room.create`, `voice.speak`, `community.manage`) with caching per session.
* **Consequences**: Highly extensible; permissions can be evaluated server-side consistently across both REST API endpoints and WebSocket event handlers.

---

### ADR-007: Direct Presigned S3/MinIO Multipart Uploads
* **Status**: Accepted
* **Context**: Uploading avatars, banners, and media attachments through application servers exhausts Node.js event loops and memory buffers.
* **Decision**: Use presigned S3 URLs (or MinIO for local development). The backend generates signed upload URLs after validating mime types and file sizes; clients upload directly to object storage.
* **Consequences**: Zero media bandwidth on the backend API servers.

---

### ADR-008: Monorepo with Turborepo & PNPM Workspaces
* **Status**: Accepted
* **Context**: Sharing TypeScript types, Zod schemas, and UI components between `apps/web` and `apps/server` prevents schema drift and duplicate validation logic.
* **Decision**: Use a structured monorepo (`packages/shared`, `packages/database`, `packages/ui`, `apps/web`, `apps/server`).
* **Consequences**: Single source of truth for DTOs and database models; atomic changes across frontend and backend.

---

### ADR-009: Unified "Mode Switcher" Room UI Paradigm
* **Status**: Accepted
* **Context**: Users should not switch to disjointed sub-apps when moving between text chat, voice huddles, video meetings, and screen sharing.
* **Decision**: A unified Room container component with dynamic communication modes (`TEXT`, `VOICE`, `VIDEO`, `SCREEN_SHARE`, `STREAM`). Transitions preserve participant state and context.
* **Consequences**: Premium user experience with low cognitive overhead and frictionless collaboration.

---

### ADR-010: Idempotency Keys for State Mutations
* **Status**: Accepted
* **Context**: Unstable mobile or web network conditions cause client retries, leading to duplicate entities or actions.
* **Decision**: Support optional/required `Idempotency-Key` headers on mutating endpoints (`POST /rooms`, `POST /communities`, etc.) cached in Redis with a 24-hour expiration.
* **Consequences**: Safe retries and network-resilient client operations.
