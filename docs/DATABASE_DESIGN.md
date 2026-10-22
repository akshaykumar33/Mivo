# Database Design & Relational Model (Step 4)

## Complete Relational Schema & PostgreSQL Data Architecture

This document defines the production database schema for Mivo using PostgreSQL and Prisma ORM, engineered for strong consistency, sub-millisecond query performance, granular RBAC, and horizontal scale.

---

## 1. Entity Relationship Overview

```text
       ┌───────────────┐           ┌───────────────┐
       │     User      │◄──────────┤    Session    │
       └───┬───────┬───┘           └───────────────┘
           │       │
           │       └────────────────────────┐
           ▼                                ▼
┌──────────────────────┐          ┌──────────────────────┐
│      Community       │          │   CommunityMember    │
└──────────┬───────────┘          └──────────┬───────────┘
           │                                 │
           ├────────────────────────┐        │
           ▼                        ▼        ▼
┌──────────────────────┐      ┌──────────────────────┐
│       Channel        │      │         Role         │
└──────────┬───────────┘      └──────────┬───────────┘
           │                             │
           ▼                             ▼
┌──────────────────────┐      ┌──────────────────────┐
│         Room         │      │    RolePermission    │
└──────────┬───────────┘      └──────────┬───────────┘
           │                             │
           ▼                             ▼
┌──────────────────────┐      ┌──────────────────────┐
│      RoomMember      │      │      Permission      │
└──────────────────────┘      └──────────────────────┘
```

---

## 2. Production Prisma Schema (`schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -----------------------------------------------------------------------------
// USER & IDENTITY DOMAIN
// -----------------------------------------------------------------------------

enum UserStatus {
  ONLINE
  IDLE
  DND
  OFFLINE
}

model User {
  id               String            @id @default(uuid()) @db.Uuid
  email            String            @unique @db.VarChar(255)
  username         String            @unique @db.VarChar(32)
  displayName      String            @db.VarChar(64)
  passwordHash     String            @db.VarChar(255)
  avatarUrl        String?           @db.VarChar(512)
  bannerUrl        String?           @db.VarChar(512)
  bio              String?           @db.VarChar(256)
  customStatus     String?           @db.VarChar(128)
  status           UserStatus        @default(OFFLINE)
  isEmailVerified  Boolean           @default(false)
  lastSeenAt       DateTime?         @db.Timestamptz(6)
  createdAt        DateTime          @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime          @updatedAt @db.Timestamptz(6)
  deletedAt        DateTime?         @db.Timestamptz(6)

  // Relationships
  sessions         Session[]
  ownedCommunities Community[]       @relation("CommunityOwner")
  memberships      CommunityMember[]
  roomMemberships  RoomMember[]
  auditLogs        AuditLog[]

  @@index([email])
  @@index([username])
  @@index([createdAt])
  @@map("users")
}

model Session {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @db.Uuid
  refreshToken String    @unique @db.VarChar(255)
  userAgent    String?   @db.VarChar(512)
  ipAddress    String?   @db.VarChar(45)
  isRevoked    Boolean   @default(false)
  expiresAt    DateTime  @db.Timestamptz(6)
  createdAt    DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt    DateTime  @updatedAt @db.Timestamptz(6)

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([refreshToken])
  @@index([expiresAt])
  @@map("sessions")
}

// -----------------------------------------------------------------------------
// COMMUNITY DOMAIN
// -----------------------------------------------------------------------------

enum VisibilityType {
  PUBLIC
  PRIVATE
  INVITE_ONLY
}

model Community {
  id          String            @id @default(uuid()) @db.Uuid
  name        String            @db.VarChar(64)
  slug        String            @unique @db.VarChar(64)
  description String?           @db.VarChar(500)
  iconUrl     String?           @db.VarChar(512)
  bannerUrl   String?           @db.VarChar(512)
  ownerId     String            @db.Uuid
  visibility  VisibilityType    @default(PUBLIC)
  createdAt   DateTime          @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime          @updatedAt @db.Timestamptz(6)
  deletedAt   DateTime?         @db.Timestamptz(6)

  owner       User              @relation("CommunityOwner", fields: [ownerId], references: [id], onDelete: Restrict)
  members     CommunityMember[]
  roles       Role[]
  channels    Channel[]
  auditLogs   AuditLog[]

  @@index([slug])
  @@index([ownerId])
  @@index([visibility])
  @@map("communities")
}

model CommunityMember {
  id          String       @id @default(uuid()) @db.Uuid
  communityId String       @db.Uuid
  userId      String       @db.Uuid
  nickname    String?      @db.VarChar(64)
  roleId      String       @db.Uuid
  joinedAt    DateTime     @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime     @updatedAt @db.Timestamptz(6)

  community   Community    @relation(fields: [communityId], references: [id], onDelete: Cascade)
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        Role         @relation(fields: [roleId], references: [id], onDelete: Restrict)

  @@unique([communityId, userId])
  @@index([communityId])
  @@index([userId])
  @@index([roleId])
  @@map("community_members")
}

// -----------------------------------------------------------------------------
// RBAC: ROLES & GRANULAR PERMISSIONS
// -----------------------------------------------------------------------------

model Role {
  id          String            @id @default(uuid()) @db.Uuid
  communityId String            @db.Uuid
  name        String            @db.VarChar(32)
  color       String?           @db.VarChar(7) // Hex color code (e.g. #7C3AED)
  position    Int               @default(0)    // Higher number = higher precedence
  isDefault   Boolean           @default(false)
  isSystem    Boolean           @default(false)
  createdAt   DateTime          @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime          @updatedAt @db.Timestamptz(6)

  community   Community         @relation(fields: [communityId], references: [id], onDelete: Cascade)
  permissions RolePermission[]
  members     CommunityMember[]

  @@unique([communityId, name])
  @@index([communityId, position])
  @@map("roles")
}

model Permission {
  id          String            @id @default(uuid()) @db.Uuid
  key         String            @unique @db.VarChar(64) // e.g. "channel.create", "voice.speak"
  name        String            @db.VarChar(64)
  category    String            @db.VarChar(32)        // e.g. "COMMUNITY", "CHANNEL", "ROOM"
  description String?           @db.VarChar(255)
  createdAt   DateTime          @default(now()) @db.Timestamptz(6)

  roles       RolePermission[]

  @@index([key])
  @@index([category])
  @@map("permissions")
}

model RolePermission {
  roleId       String     @db.Uuid
  permissionId String     @db.Uuid
  createdAt    DateTime   @default(now()) @db.Timestamptz(6)

  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@index([roleId])
  @@index([permissionId])
  @@map("role_permissions")
}

// -----------------------------------------------------------------------------
// CHANNELS & UNIFIED ROOMS
// -----------------------------------------------------------------------------

model Channel {
  id          String         @id @default(uuid()) @db.Uuid
  communityId String         @db.Uuid
  name        String         @db.VarChar(64)
  topic       String?        @db.VarChar(255)
  position    Int            @default(0)
  isPrivate   Boolean        @default(false)
  createdAt   DateTime       @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime       @updatedAt @db.Timestamptz(6)
  deletedAt   DateTime?      @db.Timestamptz(6)

  community   Community      @relation(fields: [communityId], references: [id], onDelete: Cascade)
  rooms       Room[]

  @@index([communityId, position])
  @@map("channels")
}

enum RoomCommunicationMode {
  TEXT
  VOICE
  VIDEO
  SCREEN_SHARE
  STREAM
}

model Room {
  id          String                @id @default(uuid()) @db.Uuid
  channelId   String                @db.Uuid
  name        String                @db.VarChar(64)
  description String?               @db.VarChar(255)
  activeMode  RoomCommunicationMode @default(TEXT)
  maxCapacity Int                   @default(100)
  isLocked    Boolean               @default(false)
  createdAt   DateTime              @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime              @updatedAt @db.Timestamptz(6)
  deletedAt   DateTime?             @db.Timestamptz(6)

  channel     Channel               @relation(fields: [channelId], references: [id], onDelete: Cascade)
  members     RoomMember[]

  @@index([channelId])
  @@index([activeMode])
  @@map("rooms")
}

model RoomMember {
  id          String                @id @default(uuid()) @db.Uuid
  roomId      String                @db.Uuid
  userId      String                @db.Uuid
  isMuted     Boolean               @default(false)
  isDeafened  Boolean               @default(false)
  isCameraOn  Boolean               @default(false)
  isScreenOn  Boolean               @default(false)
  joinedAt    DateTime              @default(now()) @db.Timestamptz(6)

  room        Room                  @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user        User                  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roomId, userId])
  @@index([roomId])
  @@index([userId])
  @@map("room_members")
}

// -----------------------------------------------------------------------------
// AUDIT LOGGING DOMAIN
// -----------------------------------------------------------------------------

model AuditLog {
  id          String     @id @default(uuid()) @db.Uuid
  communityId String?    @db.Uuid
  userId      String     @db.Uuid
  action      String     @db.VarChar(64) // e.g. "role.create", "member.kick"
  targetId    String?    @db.VarChar(64)
  details     Json?
  ipAddress   String?    @db.VarChar(45)
  createdAt   DateTime   @default(now()) @db.Timestamptz(6)

  community   Community? @relation(fields: [communityId], references: [id], onDelete: SetNull)
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([communityId, createdAt(sort: Desc)])
  @@index([userId])
  @@map("audit_logs")
}
```

---

## 3. Seed Permissions Registry

The following granular permissions will be populated via database seeder:

| Permission Key | Category | Name | Description |
| :--- | :--- | :--- | :--- |
| `community.manage` | COMMUNITY | Manage Community | Edit community settings, icons, and banners |
| `community.invite` | COMMUNITY | Create Invites | Generate invitation links for new users |
| `member.kick` | MODERATION | Kick Members | Remove members from the community |
| `member.ban` | MODERATION | Ban Members | Permanently ban members from the community |
| `role.manage` | RBAC | Manage Roles | Create, edit, and assign roles lower than own role |
| `channel.create` | CHANNEL | Create Channels | Create new channels in the community |
| `channel.manage` | CHANNEL | Manage Channels | Edit or delete channels |
| `room.create` | ROOM | Create Rooms | Create unified communication rooms |
| `room.manage` | ROOM | Manage Rooms | Edit room settings or change modes |
| `room.join` | ROOM | Join Rooms | Enter rooms |
| `voice.speak` | VOICE | Voice Speak | Transmit audio in voice mode |
| `voice.mute_others`| MODERATION | Server Mute | Mute other participants in room |
| `video.publish` | VIDEO | Video Camera | Transmit webcam stream |
| `screen.share` | MEDIA | Screen Share | Transmit screen/window stream |
| `stream.start` | BROADCAST | Go Live | Start live stream broadcast to audience |
