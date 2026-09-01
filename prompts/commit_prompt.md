# MASTER COMMIT, BRANCHING & PULL REQUEST ENGINEERING PROMPT

## Project: Mivo — Real-Time Communication & Social Platform

You are the Lead Release Engineer, Principal Architect, and Git Hygiene Specialist for the Mivo platform.

Your mission is to ensure every commit, branch, and pull request across this monorepo is clean, traceable, verified, highly detailed, beautifully structured, and production-grade.

---

# 1. CORE BRANCHING TAXONOMY & STRATEGY

Every branch created in this repository must follow strict naming conventions indicating intent, scope, and ticket/feature context.

## 1.1 Branch Hierarchy & Patterns
```text
<type>/<scope>-<short-description>
```

| Branch Type | Usage & Purpose | Example |
| :--- | :--- | :--- |
| `feat/` | New features, domain capabilities, or endpoints | `feat/rooms-unified-mode-switcher` |
| `fix/` | Bug fixes, edge case resolution, regression patches | `fix/auth-token-rotation-race` |
| `refactor/` | Architectural improvements with zero logic change | `refactor/realtime-pubsub-adapter` |
| `perf/` | Latency reduction, query optimization, memory tuning | `perf/presence-heartbeat-pipeline` |
| `sec/` or `security/` | Security patches, vulnerability mitigations, CVE fixes | `security/jwt-cookie-samesite-hardening` |
| `docs/` | Architectural documents, ADRs, runbooks, code graph | `docs/sfu-mesh-signaling-specs` |
| `test/` | Unit, integration, E2E, load tests | `test/channel-rbac-permission-matrix` |
| `chore/` | Toolchain, package manager, Turbo/Docker updates | `chore/upgrade-prisma-turborepo-v2` |
| `release/` | Release staging branches preparing semver tags | `release/v1.2.0-beta` |
| `spike/` | Experimental prototypes, SFU stress spikes | `spike/mediasoup-worker-clustering` |

## 1.2 Branch Lifecycle Rules
1. **Never commit directly to `main` or `master`** without a branch and verified PR check.
2. **Branch from latest trunk**: Always rebase or pull latest upstream before creating a branch.
3. **Atomic Scope**: One feature or bugfix per branch. Never bundle unrelated UI changes with backend migrations.

---

# 2. COMMIT ANATOMY & RIGOROUS STANDARDS

All commit messages must strictly comply with the **Conventional Commits 1.0.0 Specification** enriched with Mivo's Multi-Plane Architectural Metadata.

## 2.1 Full Anatomy of a Mivo Commit

```text
<type>(<scope>): <concise-imperative-summary-under-72-chars>

[DETAILED MOTIVATION & PROBLEM STATEMENT]
Explain the background, why this change is necessary, and what problem or 
architectural limitation it solves. Avoid vague statements like "updated stuff".

[ARCHITECTURAL PLANE & LAYER IMPACT]
Explicitly specify impact across:
- Control Plane:   (REST API, PostgreSQL, Prisma, RBAC, Services)
- Realtime Plane:  (WebSocket Gateway, Redis Pub/Sub, Presence, Events)
- Media Plane:     (WebRTC, SFU Media Tracks, Signaling, Stage)
- Frontend UI/UX:  (Next.js App Router, Components, Zustand, Tailwind)

[KEY IMPLEMENTATION HIGHLIGHTS]
- Detailed bullet 1 with exact file/entity references
- Detailed bullet 2 detailing state transitions or lifecycle changes
- Detailed bullet 3 detailing security, validation, or error handling

[VERIFICATION & TESTING SUMMARY]
- Typecheck:   PASS (tsc / turbo check:types)
- Unit Tests:  PASS (vitest / jest test suites)
- Integration: PASS (REST API / WebSocket lifecycle tests)
- Build:       PASS (turbo run build)

[BREAKING CHANGES / MIGRATIONS] (Optional)
BREAKING CHANGE: Describe breaking API or DB changes and upgrade path.

[ISSUE / TICKET REFERENCES] (Optional)
Closes #123, Refs #456
```

---

# 3. COMMIT TYPES & SCOPES

## 3.1 Allowed Types
* `feat`: A new feature or user-facing capability.
* `fix`: A bug fix or error mitigation.
* `refactor`: Code change that neither fixes a bug nor adds a feature.
* `perf`: Performance improvement (CPU, network, database query, memory).
* `sec`: Security enhancement or vulnerability remediation.
* `docs`: Documentation only changes (ADRs, code graphs, runbooks).
* `test`: Adding or refactoring test suites.
* `style`: Code style, formatting, whitespace (no functional change).
* `chore`: Maintenance, dependencies, build configs, Docker setups.

## 3.2 Standard Scopes
* `auth`: Authentication, JWT, Argon2, session cookies, user registration.
* `rbac`: Roles, permissions, capability bitmasks, authorization guards.
* `community`: Community creation, membership, slugs, invites.
* `channel`: Channels, category organization, channel permissions.
* `rooms`: Unified rooms, communication modes (`TEXT`, `VOICE`, `VIDEO`, `SCREEN_SHARE`, `STREAM`).
* `realtime`: WebSocket gateway, Redis pub/sub, presence, socket subscriptions.
* `media`: WebRTC, SFU router, video grids, microphone audio, screen capture.
* `database`: Prisma schema, PostgreSQL migrations, indexes, seeders.
* `ui`: Design tokens, shared components, Tailwind, animations, themes.
* `deps`: Package upgrades, workspace dependencies, lockfiles.

---

# 4. GOLD STANDARD COMMIT EXAMPLES

### Example 1: Core Feature Implementation
```text
feat(rooms): implement unified dynamic mode switcher and media stage

Introduce dynamic communication mode switching within unified rooms, allowing
frictionless transitions between Text Chat, Voice Huddles, Video Meetings,
Screen Sharing, and Live Broadcast Stages without tearing down room context.

Architectural Impact:
- Control Plane: Added PATCH /api/v1/rooms/:id/mode endpoint with Zod schema validation.
- Realtime Plane: Added room:change_mode and room:mode_changed Socket.io event fanout.
- Media Plane: Prepared MediaStage component with dynamic grid and speaker pulse rings.
- Frontend UI: Built RoomModeSwitcher bar, MediaStage, and updated UnifiedRoomView.

Key Highlights:
- Implemented RoomModeSwitcher component with active HSL glow states.
- Bound media state toggles (mic mute, camera off, screen share) to roomStore.
- Added real-time broadcast of mode changes across all connected room participants.
- Verified zero layout shift and 60fps transitions via Framer Motion spring curves.

Verification:
- Typecheck: PASS (turbo check:types)
- Unit Tests: PASS (RoomModeSchema and RoomsService tests passing)
- Build: PASS (Next.js 15 App Router production bundle generated)

Refs: #42, #88
```

### Example 2: Critical Bug Fix
```text
fix(auth): prevent race condition in refresh token rotation session store

Resolve a concurrent session invalidation race condition when multiple tabs
simultaneously request access token refreshes upon expiration.

Root Cause:
Incoming parallel refresh requests with identical cookie tokens caused the second
request to fail with SESSION_EXPIRED because the first request immediately rotated
and invalidated the previous database record.

Solution:
- Implemented a 15-second grace period for recently rotated refresh tokens in Redis.
- Added database transaction locking on session rotation in AuthService.
- Updated JwtAuthGuard to gracefully handle parallel refresh requests.

Verification:
- Typecheck: PASS
- Unit Tests: PASS (Added 4 concurrency unit tests in auth.service.spec.ts)
- Integration: PASS (Verified with 10 concurrent requests from multiple browser contexts)
```

### Example 3: Database & Migration Change
```text
feat(database): add granular RBAC permissions and audit log schema

Expand PostgreSQL schema with normalized permission tables, system role presets,
and structured audit logging for administrative and moderation events.

Database Changes:
- Added `Permission` model with unique key index (e.g. `voice.mute_others`).
- Added `RolePermission` junction table with composite primary key.
- Added `AuditLog` model with descending composite index on (communityId, createdAt).
- Created database seed script in packages/database/src/seed.ts.

Verification:
- Prisma Validate: PASS (prisma validate)
- Prisma Generate: PASS (PrismaClient v6 compiled)
- Seeder: PASS (16 system permissions and dev admin seeded cleanly)
```

---

# 5. PRE-COMMIT VERIFICATION CHECKLIST

Before staging and committing any code, you MUST execute and confirm:

```text
[ ] 1. Typecheck:        pnpm check:types (Zero TypeScript errors)
[ ] 2. Linting:          pnpm lint (Zero ESLint warnings/errors)
[ ] 3. Unit Tests:       pnpm test (100% passing test suites)
[ ] 4. Production Build: pnpm build (All apps and packages compile cleanly)
[ ] 5. Secrets Audit:    No API keys, JWT secrets, passwords, or .env files staged
[ ] 6. Plane Separation: Control Plane, Realtime Plane, and Media Plane kept distinct
[ ] 7. No Dead Code:     No commented-out blocks, leftover console.logs, or unused imports
[ ] 8. Codegraph Sync:   docs/CODEGRAPH.md updated if architecture or flows changed
```

---

# 6. PULL REQUEST (PR) MASTER TEMPLATE

When submitting or requesting a Pull Request, use this comprehensive markdown template:

```markdown
## Summary of Changes
<!-- Provide a 2-3 sentence high-level executive summary of what this PR accomplishes -->

## Architectural Classification
- [ ] **Control Plane** (REST API, PostgreSQL, Prisma, Auth, RBAC)
- [ ] **Realtime Plane** (WebSocket Gateway, Redis, Presence, Socket Events)
- [ ] **Media Plane** (WebRTC, SFU, Voice, Video, Screen Share, Broadcast)
- [ ] **Frontend UI/UX** (Next.js App Router, Design System, Tailwind, Zustand)

## Detailed Feature / Fix Breakdown
| Component / Layer | Summary of Changes | Impacted Files |
| :--- | :--- | :--- |
| **Backend API** | Added mode switching endpoint & validation | `apps/server/src/rooms/*` |
| **WebSocket** | Broadcasted `room:mode_changed` event | `apps/server/src/realtime/*` |
| **Frontend UI** | Created `RoomModeSwitcher` & `MediaStage` | `apps/web/src/features/rooms/*` |
| **Database** | Added index on `Room(activeMode)` | `packages/database/prisma/*` |

## Key Decisions & Trade-offs
<!-- Document any significant architectural choices or alternatives considered -->

## Verification & Testing Proof
```text
Typecheck:   PASS (turbo run check:types)
Unit Tests:  PASS (turbo run test)
Build:       PASS (turbo run build)
```

## Security & Resilience Checklist
- [x] Server-side authorization verified (client-supplied roles never trusted).
- [x] Inputs validated via Zod schemas at API & WebSocket boundaries.
- [x] Zero sensitive secrets exposed in logs, client bundles, or error messages.
- [x] Idempotency or safe retry behavior considered.

## Rollback Strategy
<!-- How to safely revert this change if unexpected anomalies occur in production -->
```

---

# 7. COMMIT PROMPTING INSTRUCTIONS FOR AI ASSISTANTS

When instructing an AI assistant to create a commit, use the following operational prompt pattern:

```text
Please stage and commit the recent changes following prompts/commit_prompt.md:
1. Review the git diff and verify that all affected files belong to a cohesive logical unit.
2. Run typecheck and test suites to verify zero errors before committing.
3. Generate a commit message following the Conventional Commit structure with:
   - Imperative header under 72 characters with appropriate type and scope.
   - 2-3 paragraph architectural motivation and context.
   - Bulleted breakdown across Control Plane, Realtime Plane, Media Plane, and UI.
   - Verification results block.
4. Execute git commit and present the finalized commit log.
```

---

# 8. GOLDEN RELEASE PRINCIPLES

1. **Every commit is a permanent historical document**: Write commit messages that engineers 5 years from now will thank you for.
2. **Never claim PASS without execution**: Verify builds and test outputs before declaring completion.
3. **Keep changes atomic**: Small, verified, well-documented commits beat giant monolithic dumps every single time.
