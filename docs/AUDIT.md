# Repository and Environment Audit (Step 1)

## Executive Summary
This document provides a comprehensive audit of the workspace, host environment, runtime dependencies, toolchain availability, security boundaries, and architectural readiness for **Mivo** — a high-scale, multi-modal real-time communication platform.

---

## 1. Workspace State
* **Repository Root**: `d:/wysbryx/Mivo`
* **Status**: Greenfield initial setup
* **Existing Files**:
  * `prompts/init_prompt.md`: Master AI software engineering instruction document (2,028 lines) detailing requirements, architectural rules, coding standards, domain models, and development phases.
* **Legacy Debt**: None (clean baseline).

---

## 2. Host Environment & Toolchain Audit
* **Operating System**: Windows 11 (NT 10.0 / PowerShell 5.1 & 7 compatible).
* **Git**: `git version 2.52.0.windows.1` (Available at `C:\Program Files\Git\cmd\git.exe`).
* **Docker Engine & CLI**: `Docker version 29.6.1, build 8900f1d` (Available at `C:\Program Files\Docker\Docker\resources\bin\docker.exe`).
* **AWS CLI**: `AWS CLI v2` installed at `C:\Program Files\Amazon\AWSCLIV2`.
* **Node.js & Package Managers**:
  * NVM and PNPM configuration directories present in user AppData.
  * Node runtime will execute inside monorepo workspace via standard Node / npm / pnpm toolchain.

---

## 3. Core Architectural Constraints from `init_prompt.md`
1. **Three-Plane Separation**:
   * **Control Plane**: REST API for Users, Authentication, RBAC, Communities, Channels, Rooms, and persistent state.
   * **Realtime Plane**: WebSocket gateway with Redis Pub/Sub for presence, typing, room state broadcasts, and signaling.
   * **Media Plane**: WebRTC and SFU (Selective Forwarding Unit) for voice, video, screen share, and live broadcast pipelines (HLS/CDN for passive viewers).
2. **PostgreSQL as Primary Source of Truth**:
   * All permanent records (users, communities, channels, rooms, roles, permissions, audit logs) reside in PostgreSQL with Prisma ORM migrations.
   * Ephemeral data (user presence, active typing, session heartbeats) strictly resides in Redis with TTLs.
3. **Strict RBAC & Server-Side Authorization**:
   * Client-asserted roles or permissions are never trusted.
   * Hierarchical authorization: `Identity → Community Membership → Role → Granular Permissions → Resource Ownership`.
4. **Idempotency & Resilience**:
   * Critical mutations (join room, send message, create channel, change roles) require idempotency keys and error handling for reconnections and out-of-order deliveries.

---

## 4. Recommended Monorepo Layout
```text
mivo/
├── apps/
│   ├── web/                     # Next.js 15 App Router (React, Tailwind CSS, Zustand, TanStack Query)
│   └── server/                  # NestJS API & WebSocket Gateway (Control & Realtime Planes)
├── packages/
│   ├── database/                # Prisma schema, migrations, database client & seeders
│   ├── shared/                  # Shared TypeScript types, Zod schemas, constants, API/WS contracts
│   └── ui/                      # Shared design tokens, primitives, UI components (shadcn/ui style)
├── docs/                        # Architectural memory, code graph, ADRs, conventions, runbook
├── docker/                      # Docker Compose & container configs (Postgres, Redis, MinIO/LocalStack)
└── prompts/                     # Product & architectural prompts
```

---

## 5. Audit Sign-off Checklist
- [x] Repository tree inspected and confirmed greenfield.
- [x] Host runtimes (Git, Docker, AWS CLI) verified.
- [x] Monorepo structure defined.
- [x] Architectural separation of planes confirmed.
- [x] Step 1 Audit Complete. Ready for Step 2 (Codegraph).
