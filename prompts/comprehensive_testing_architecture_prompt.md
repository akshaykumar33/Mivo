# Mivo Comprehensive Testing Architecture & Quality Assurance Blueprint

## 1. Overview & Quality Standard
Mivo enforces a structured testing pyramid ensuring 100% operational reliability across real-time WebSockets, WebRTC mesh calling, hardware media acquisition, multilingual AI translation, automated MOM delivery, and permission-gated call recording.

---

## 2. Directory Structure & Organization

All test suites, fixtures, unit tests, integration tests, and end-to-end multi-scenario tests are organized in a clean directory hierarchy:

```
tests/
├── fixtures/                         # Seed data, mock payloads & test configurations
│   ├── users.fixture.json            # Multi-role user credentials & profiles
│   ├── communities.fixture.json      # Workspace, channel & room definitions
│   └── transcripts.fixture.json      # Multilingual transcripts & expected translations
│
├── unit/                             # Isolated logic, parsers & algorithm tests
│   ├── translation-engine.test.js    # 12+ language translation & dictionary matching
│   ├── mom-compiler.test.js          # Executive summary, action items & Markdown format
│   └── rbac-permissions.test.js      # Role permission evaluations & overrides
│
├── integration/                      # API endpoint & database integration tests
│   ├── auth-flow.test.js             # Registration, Argon2 verification, JWT sessions
│   ├── channel-room.test.js          # Public/Private gating, room modes, capacity
│   └── messaging-stream.test.js      # Message creation, retrieval & pagination
│
└── e2e/                              # End-to-end multi-user real-time workflows
    ├── multi-user-calling.test.js    # WebRTC mesh signaling, ICE candidates & audio/video
    ├── host-moderation.test.js       # Remote mute, host role transfer, and room kicks
    ├── recording-consent.test.js     # Recording lifecycle, room-wide consent, REC timer
    └── whisper-mom-email.test.js     # Speech dictation, MOM generation & email dispatch
```

---

## 3. Testing Pyramid & Verification Gates

### A. Unit Tests (Isolated Logic)
- **Translation Engine**: Validates dictionary lookups, fallback formatting, and language code mappings.
- **MOM Compiler**: Validates Markdown synthesis, date formatting, and action item task extraction.
- **RBAC Matrix**: Validates permission inheritance (Owner > Admin > Member > Guest).

### B. Integration Tests (API & Database)
- **Auth & Session Security**: Tests token issuance, expiration, and invalid credential rejections.
- **Channel & Room Governance**: Tests channel privacy isolation (`isPrivate: true`) and mode switching (`TEXT`, `VOICE`, `VIDEO`, `SCREEN_SHARE`).
- **Messaging Stream**: Tests message persistence in Postgres and room-scoped retrieval.

### C. End-to-End Tests (Multi-User & WebSockets)
- **Multi-User WebRTC Calling**: Tests concurrent socket joins, STUN/ICE exchange, and remote stream subscriptions.
- **Host Moderation**: Tests `ROOM_HOST_ACTION` handling for mute, kick, and host transfer.
- **Recording & Compliance**: Tests recording state broadcast and consent banner triggering.
- **Whisper AI & Email Dispatch**: Tests end-to-end MOM generation and email delivery.
