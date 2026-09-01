# API and Realtime WebSocket Contracts (Step 5)

## Unified REST API and Realtime Event Specifications

This document defines the type-safe contracts for all Control Plane HTTP endpoints and Realtime Plane WebSocket events.

---

## 1. Authentication & Session REST API

### 1.1 `POST /api/v1/auth/register`
* **Description**: Creates a new user account and returns session tokens.
* **Request Body**:
```json
{
  "email": "user@example.com",
  "username": "cooluser",
  "displayName": "Cool User",
  "password": "StrongPassword123!"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c8b416e9-22a0-4766-879e-4e4b679693cf",
      "email": "user@example.com",
      "username": "cooluser",
      "displayName": "Cool User",
      "avatarUrl": null,
      "status": "ONLINE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
* *Note: Refresh token is set in secure `Set-Cookie: refreshToken=...; HttpOnly; SameSite=Strict; Path=/api/v1/auth`.*

### 1.2 `POST /api/v1/auth/login`
* **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```
* **Success Response (200 OK)**: Same payload as register.

### 1.3 `POST /api/v1/auth/refresh`
* **Description**: Issues a new short-lived Access Token using the valid HttpOnly refresh cookie.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 1.4 `POST /api/v1/auth/logout`
* **Description**: Revokes the refresh session in PostgreSQL and clears the refresh cookie.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": { "message": "Successfully logged out" }
}
```

---

## 2. Communities & RBAC REST API

### 2.1 `GET /api/v1/communities`
* **Description**: Lists all communities where the authenticated user is a member.
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "e45f9172-132d-4861-bb1c-d784d0bdf483",
      "name": "Acme Engineering",
      "slug": "acme-engineering",
      "iconUrl": "https://cdn.mivo.app/icons/acme.png",
      "ownerId": "c8b416e9-22a0-4766-879e-4e4b679693cf",
      "memberCount": 42,
      "currentUserRole": {
        "id": "role-1",
        "name": "OWNER",
        "permissions": ["*"]
      }
    }
  ]
}
```

### 2.2 `POST /api/v1/communities`
* **Headers**: `Idempotency-Key: <UUID>` (optional)
* **Request Body**:
```json
{
  "name": "Design Collective",
  "slug": "design-collective",
  "description": "A creative workspace for designers and creators.",
  "visibility": "PUBLIC"
}
```
* **Success Response (201 Created)**: Returns created community with auto-generated default channels and system roles.

### 2.3 `GET /api/v1/communities/:communityId/roles`
* **Permissions Required**: `role.manage` or `community.manage`
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "role_mod_1",
      "name": "Moderator",
      "color": "#10B981",
      "position": 2,
      "permissions": ["member.kick", "channel.manage", "room.manage", "voice.mute_others"]
    }
  ]
}
```

---

## 3. Channels & Rooms REST API

### 3.1 `POST /api/v1/communities/:communityId/channels`
* **Permissions Required**: `channel.create`
* **Request Body**:
```json
{
  "name": "design-huddle",
  "topic": "Daily design critiques and workshops",
  "type": "MEDIA",
  "isPrivate": false
}
```

### 3.2 `POST /api/v1/channels/:channelId/rooms`
* **Permissions Required**: `room.create`
* **Request Body**:
```json
{
  "name": "Critique Stage",
  "description": "Live presentation stage",
  "activeMode": "VIDEO",
  "maxCapacity": 50
}
```

### 3.3 `PATCH /api/v1/rooms/:roomId/mode`
* **Permissions Required**: `room.manage`
* **Request Body**:
```json
{
  "activeMode": "SCREEN_SHARE"
}
```
* **Broadcast**: Triggers WebSocket event `room:mode_changed` to all connected participants.

---

## 4. Realtime WebSocket Contracts (WSS)

### 4.1 Connection & Handshake
* **Endpoint**: `wss://api.mivo.app/realtime` (or `ws://localhost:4000/realtime` in dev)
* **Auth**: Socket handshake auth query or header: `{ "token": "Bearer <accessToken>" }`
* **On Success**: Server responds with `connection:ack` containing user ID and active session state.

---

### 4.2 WebSocket Event Catalog

| Event Name | Direction | Payload Schema | Description |
| :--- | :--- | :--- | :--- |
| `presence:heartbeat` | Client → Server | `{ "status": "ONLINE" \| "IDLE" \| "DND" }` | Emitted every 30s to keep presence alive in Redis |
| `presence:user_updated` | Server → Broadcast | `{ "userId": string, "status": string, "customStatus"?: string }` | Broadcast to friends and mutual community members |
| `room:join` | Client → Server | `{ "roomId": string }` | Client joins a room context |
| `room:joined` | Server → Client | `{ "roomId": string, "activeMode": string, "members": RoomMemberDTO[] }` | Initial room snapshot returned to joining client |
| `room:participant_joined` | Server → Room Broadcast | `{ "roomId": string, "user": RoomUserDTO, "joinedAt": string }` | Emitted to room members |
| `room:participant_left` | Server → Room Broadcast | `{ "roomId": string, "userId": string, "reason"?: string }` | Emitted when a participant exits or disconnects |
| `room:mode_change_request` | Client → Server | `{ "roomId": string, "mode": "TEXT" \| "VOICE" \| "VIDEO" \| "SCREEN_SHARE" \| "STREAM" }` | Request mode switch (requires `room.manage`) |
| `room:mode_changed` | Server → Room Broadcast | `{ "roomId": string, "mode": string, "updatedBy": string }` | Broadcast new room communication mode |
| `room:participant_state` | Client → Server | `{ "roomId": string, "isMuted"?: boolean, "isCameraOn"?: boolean, "isScreenOn"?: boolean }` | Update client media state toggles |
| `room:participant_state_updated`| Server → Room Broadcast | `{ "roomId": string, "userId": string, "state": ParticipantStateDTO }` | Broadcast participant media state changes |
| `signaling:offer` | Client → Server / SFU | `{ "roomId": string, "sdp": string, "type": "offer" }` | WebRTC session description offer |
| `signaling:answer` | Server / SFU → Client | `{ "roomId": string, "sdp": string, "type": "answer" }` | WebRTC session description answer |
| `signaling:ice_candidate` | Bidirectional | `{ "roomId": string, "candidate": RTCIceCandidateInit }` | ICE network candidates |

---

## 5. Zod Validation Schemas (`packages/shared/src/schemas`)

```typescript
import { z } from 'zod';

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/, 'Username contains invalid characters'),
  displayName: z.string().min(1).max(64),
  password: z.string().min(8).max(100),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const CreateCommunitySchema = z.object({
  name: z.string().min(2).max(64),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'INVITE_ONLY']).default('PUBLIC'),
});

export const CreateChannelSchema = z.object({
  name: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
  topic: z.string().max(255).optional(),
  type: z.enum(['TEXT', 'VOICE', 'MEDIA', 'GENERAL']).default('GENERAL'),
  isPrivate: z.boolean().default(false),
});

export const CreateRoomSchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().max(255).optional(),
  activeMode: z.enum(['TEXT', 'VOICE', 'VIDEO', 'SCREEN_SHARE', 'STREAM']).default('TEXT'),
  maxCapacity: z.number().int().min(2).max(500).default(100),
});

export const UpdateRoomModeSchema = z.object({
  activeMode: z.enum(['TEXT', 'VOICE', 'VIDEO', 'SCREEN_SHARE', 'STREAM']),
});
```
