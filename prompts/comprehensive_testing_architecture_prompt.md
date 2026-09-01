# Mivo Comprehensive Modular Testing Architecture & Quality Assurance Blueprint

## 1. Overview & Quality Standard
Mivo enforces an isolated, feature-driven testing pyramid organized by **Module and Feature** directories. Every module isolates Unit logic, API Integrations, and End-to-End multi-user workflows.

---

## 2. Modular Directory Structure & Feature Hierarchy

All test suites and fixtures are organized by feature domain:

```
tests/
├── fixtures/                              # Domain-specific mock data & seed payloads
│   ├── auth/
│   │   └── users.fixture.json             # Multi-role credentials & profiles
│   ├── communities/
│   │   └── workspaces.fixture.json        # Workspace & channel configurations
│   ├── media/
│   │   └── webrtc-streams.fixture.json    # Media tracks & synthetic canvas streams
│   └── ai/
│       └── transcripts-mom.fixture.json   # Multilingual transcript dictations
│
├── modules/                               # Feature & domain modules
│   ├── auth-identity/                     # Authentication, Argon2 & JWT sessions
│   │   ├── unit/password-hash.unit.test.js
│   │   ├── integration/login-session.integration.test.js
│   │   └── e2e/multi-user-auth.e2e.test.js
│   │
│   ├── communities-rbac/                  # Workspaces, Channels & Permissions
│   │   ├── unit/permission-matrix.unit.test.js
│   │   ├── integration/channel-privacy.integration.test.js
│   │   └── e2e/community-lifecycle.e2e.test.js
│   │
│   ├── messaging-chat/                    # Real-time chat & multilingual translations
│   │   ├── unit/message-formatter.unit.test.js
│   │   ├── integration/message-persistence.integration.test.js
│   │   └── e2e/chat-translation-tts.e2e.test.js
│   │
│   ├── webrtc-media-stage/                # WebRTC mesh calling, stage grid & modes
│   │   ├── unit/equalizer-decibels.unit.test.js
│   │   ├── integration/room-mode-switcher.integration.test.js
│   │   └── e2e/webrtc-mesh-calling.e2e.test.js
│   │
│   ├── host-moderation/                   # Host actions (Mute, Kick, Transfer Role)
│   │   ├── unit/host-action-validator.unit.test.js
│   │   ├── integration/host-permission-gate.integration.test.js
│   │   └── e2e/remote-mute-kick-transfer.e2e.test.js
│   │
│   ├── ai-scribe-mom/                     # Whisper transcription & MOM generation
│   │   ├── unit/translation-dictionary.unit.test.js
│   │   ├── unit/mom-markdown-generator.unit.test.js
│   │   ├── integration/email-summary-dispatch.integration.test.js
│   │   └── e2e/live-whisper-mom-flow.e2e.test.js
│   │
│   └── recording-compliance/              # Session recording & consent compliance
│       ├── unit/recording-duration-timer.unit.test.js
│       ├── integration/socket-rec-broadcast.integration.test.js
│       └── e2e/consent-banner-download.e2e.test.js
│
└── run-all-tests.js                       # Master test runner executing all 22 suites
```

---

## 3. Running All Modular Tests

Execute the master runner to validate all 7 modules across 22 test suites:
```bash
pnpm test:suites
```
