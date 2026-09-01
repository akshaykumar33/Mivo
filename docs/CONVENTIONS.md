# Engineering Conventions (Step 3)

## Code Standards, Naming, Error Handling & Security Guidelines

---

## 1. Naming Conventions

### 1.1 Files & Directories
* **Frontend React Components**: PascalCase for component files (`CommunitySidebar.tsx`, `RoomModeSwitcher.tsx`).
* **Frontend Hooks**: camelCase prefixed with `use` (`useAuth.ts`, `useCommunity.ts`, `useRoom.ts`).
* **Backend Modules & Services**: kebab-case for files (`auth.service.ts`, `community.controller.ts`, `permission.guard.ts`).
* **Database Models (Prisma)**: PascalCase singular for models (`User`, `Community`, `Channel`, `Room`); camelCase for fields (`displayName`, `avatarUrl`, `isPrivate`).
* **Database Tables (SQL mapping)**: snake_case plural (`users`, `communities`, `channels`, `rooms`, `community_members`).

### 1.2 API Endpoints & Routes
* REST endpoints use kebab-case plural resources:
  * `GET /api/v1/communities`
  * `POST /api/v1/communities/:communityId/channels`
  * `GET /api/v1/rooms/:roomId/members`
* WebSocket events use `namespace:action` format:
  * `room:join`, `room:leave`, `room:mode_changed`
  * `presence:heartbeat`, `presence:user_online`
  * `signaling:offer`, `signaling:answer`, `signaling:candidate`

---

## 2. API Response & Error Handling Standards

### 2.1 Standard Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-09-01T10:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### 2.2 Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to manage channels in this community.",
    "details": [
      {
        "field": "permission",
        "issue": "Missing required permission 'channel.manage'"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-09-01T10:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### 2.3 Common Error Codes
* `UNAUTHORIZED` (401): Missing, expired, or invalid authentication credentials.
* `FORBIDDEN` (403): User authenticated but lacks required RBAC permissions.
* `RESOURCE_NOT_FOUND` (404): Community, channel, room, or user does not exist.
* `VALIDATION_FAILED` (422): Input payload failed Zod/class-validator rules.
* `RATE_LIMITED` (429): Request threshold exceeded.
* `INTERNAL_ERROR` (500): Unexpected server failure (details never exposed to client).

---

## 3. Security Guidelines

1. **Zero Client Trust**: Always resolve permissions server-side from PostgreSQL/Redis session context. Never accept `role` or `isAdmin` from request bodies.
2. **Password Security**: Passwords hashed with `Argon2id` using recommended OWASP parameters (memory cost 64MB, iterations 3, parallelism 4).
3. **No Sensitive Logging**: Passwords, bearer tokens, JWT secrets, database connection strings, and PII must NEVER appear in server logs, metrics, or client error responses.
4. **Input Validation**: All incoming requests validated at the boundary using Zod schemas and NestJS validation pipes (`whitelist: true`, `forbidNonWhitelisted: true`).
5. **CORS & Headers**: Strict CORS origin whitelisting with `Helmet` security headers enabled (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Strict-Transport-Security`).

---

## 4. Git & Branching Protocol
* Feature branches: `feat/<feature-name>` (e.g. `feat/v1-auth-rbac`, `feat/v1-community-channels`).
* Commit messages follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
* Never rewrite git history, never force push to shared branches, and never discard uncommitted user changes.
