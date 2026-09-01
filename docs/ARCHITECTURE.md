# Platform Architecture (Step 3)

## Multi-Plane Architecture & System Design

Mivo is architected as a modular system designed for horizontal scalability, zero single points of failure, and strict separation of concerns across three core operational planes:

```text
                                  CLIENT APPS
                          (Web Browser / Mobile Expo)
                                       │
                  ┌────────────────────┼────────────────────┐
                  │ HTTPS (REST)       │ WSS (WebSockets)   │ WebRTC (RTP/SRTP)
                  ▼                    ▼                    ▼
          ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
          │ CONTROL      │     │ REALTIME     │     │ MEDIA        │
          │ PLANE        │     │ PLANE        │     │ PLANE        │
          │ (NestJS API) │     │ (WS Gateway) │     │ (SFU Node)   │
          └───────┬──────┘     └───────┬──────┘     └───────┬──────┘
                  │                    │                    │
                  ▼                    ▼                    │
          ┌──────────────┐     ┌──────────────┐             │
          │ PostgreSQL   │     │ Redis Cluster│             │
          │ (Prisma ORM) │◄───►│ (Pub/Sub +   │◄────────────┘
          │ (State of    │     │  Presence +  │  (Session token &
          │  Truth)      │     │  Ephemeral)  │   track state)
          └──────────────┘     └──────────────┘
```

---

## 1. Plane Responsibilities

### 1.1 Control Plane
* **Protocol**: HTTP/1.1 & HTTP/2 REST with JSON payloads.
* **Server Framework**: NestJS with strict modular architecture.
* **Core Responsibilities**:
  * User Registration, Authentication, Session Lifecycle (JWT + HttpOnly Refresh Tokens).
  * Community Creation, Join Invitations, Settings, and Member Management.
  * Channel Creation, Categorization, and Permission Overrides.
  * Room Configuration, Privacy Settings, and Persistent Metadata.
  * Granular Role-Based Access Control (RBAC) and Permission Evaluation.
  * Media upload presigning (AWS S3 / CloudFront signed URLs).
* **Storage**: PostgreSQL (Prisma ORM) with strict relational schemas, foreign key constraints, and transactional consistency.

### 1.2 Realtime Plane
* **Protocol**: WebSocket (WSS) using structured, versioned event envelopes.
* **Server Framework**: NestJS WebSocket Gateway (`@nestjs/websockets` with Redis Adapter).
* **Core Responsibilities**:
  * Real-time User Presence (Online, Idle, DND, Offline, Custom Status).
  * Ephemeral Typing Indicators with auto-expiring debounces.
  * Room Event Fanout (Participant joined, left, mode changed, mute state).
  * WebRTC Signaling Relay (SDP Offer/Answer exchange, ICE Candidates).
* **Storage / Message Bus**: Redis Pub/Sub for cross-pod real-time broadcasting and Redis In-Memory KV for fast heartbeats and presence tracking.

### 1.3 Media Plane
* **Protocol**: WebRTC (SRTP/DTLS over UDP, with TCP TURN fallback).
* **Topology**: Selective Forwarding Unit (SFU) architecture.
* **Core Responsibilities**:
  * Audio mixing / track forwarding with active speaker detection.
  * Simulcast / SVC video routing (adapting stream quality to participant bandwidth).
  * Low-latency screen sharing transport.
  * Live Broadcast Transcoding pipeline to HLS / LL-HLS via CDN for passive audience scale (10,000+ viewers).

---

## 2. Monorepo Package Topology

```text
mivo/
├── apps/
│   ├── web/                     # Next.js 15 App Router Frontend
│   │   ├── src/
│   │   │   ├── app/             # App Router pages and layouts
│   │   │   ├── components/      # UI components (atoms, molecules, organisms)
│   │   │   ├── features/        # Feature-driven slices (auth, community, room, rbac)
│   │   │   ├── hooks/           # Domain and state hooks
│   │   │   ├── lib/             # API clients, socket managers, helpers
│   │   │   ├── stores/          # Zustand state stores
│   │   │   └── styles/          # Global CSS, Tailwind, Design Tokens
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── server/                  # NestJS API & Realtime Gateway
│       ├── src/
│       │   ├── auth/            # Auth module (JWT, Argon2, Guards, Strategies)
│       │   ├── users/           # User management module
│       │   ├── communities/     # Community & member management module
│       │   ├── channels/        # Channel management module
│       │   ├── rooms/           # Room & mode switching module
│       │   ├── rbac/            # Role & granular permissions engine
│       │   ├── realtime/        # WebSocket Gateway & Redis Pub/Sub adapter
│       │   ├── signaling/       # WebRTC signaling relay module
│       │   ├── common/          # Filters, Interceptors, Pipes, Middlewares
│       │   ├── app.module.ts    # Root NestJS module
│       │   └── main.ts          # Entrypoint & bootstrap
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── database/                # Prisma ORM & PostgreSQL DAL
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Complete database schema
│   │   │   └── migrations/      # Versioned SQL migrations
│   │   ├── src/
│   │   │   ├── client.ts        # Singleton PrismaClient instance
│   │   │   └── seed.ts          # Default roles, permissions, dev seeds
│   │   └── package.json
│   │
│   ├── shared/                  # Shared Types, Schemas & Contracts
│   │   ├── src/
│   │   │   ├── types/           # DTOs, domain models, permissions
│   │   │   ├── schemas/         # Zod runtime validation schemas
│   │   │   ├── events/          # WebSocket event names & payload types
│   │   │   └── constants/       # System constants, defaults, limits
│   │   └── package.json
│   │
│   └── ui/                      # Shared UI Design System Components
│       ├── src/
│       │   ├── components/      # Button, Dialog, Dropdown, Avatar, Input, etc.
│       │   ├── theme/           # Color palettes, typography, shadows, tokens
│       │   └── index.ts
│       └── package.json
│
├── docker/
│   └── docker-compose.yml       # Local dev services (Postgres 16, Redis 7, MinIO)
└── docs/                        # Architectural documentation, ADRs, runbooks
```

---

## 3. Scalability & Horizontal Partitioning Strategy

1. **Stateless Control Plane Pods**:
   * NestJS API servers maintain zero in-memory session state.
   * Auto-scale horizontally behind an Application Load Balancer (ALB) based on CPU/Memory and HTTP request queue depth.

2. **Realtime WebSocket Cluster**:
   * WebSocket gateway instances scale out horizontally.
   * Socket.io / WebSocket clients maintain a sticky session or negotiate connection to any node; Redis Pub/Sub coordinates event dispatch across all nodes (`@socket.io/redis-adapter`).

3. **Database Read/Write Splitting & Connection Pooling**:
   * Primary PostgreSQL instance handles all transactional writes (`INSERT`, `UPDATE`, `DELETE`).
   * Read replicas handle query-heavy listing endpoints (`GET /communities/:id/members`, `GET /rooms/:id/messages`).
   * Prisma connection pooling configured with PgBouncer to prevent connection exhaustion.

4. **Media Plane Scaling**:
   * SFU instances scale independently based on RTP packet throughput and CPU load.
   * Media sessions are pinned to specific SFU worker nodes or clusters via signaling coordination.
