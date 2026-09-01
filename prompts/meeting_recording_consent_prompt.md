# Mivo Permission-Gated Meeting Recording & Consent System Specification

## 1. Overview & Compliance
To ensure total security, transparency, and legal compliance (GDPR, HIPAA, and CCPA two-party consent laws), Mivo enforces strict, permission-gated call recording with room-wide broadcast alerts, persistent visual badges, and automated consent management.

---

## 2. System Flow & Consent Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host / Admin
    participant Server as NestJS Realtime Gateway
    participant Peers as Room Participants
    actor Client as Local Browser Recorder

    Host->>Server: Emit room:recording_start (roomId, hostId)
    Server->>Peers: Broadcast room:recording_state_changed (isRecording: true, hostName)
    Peers->>Peers: Display Consent Alert Banner ("Meeting is being recorded")
    Peers->>Peers: Show Red Pulsing REC Badge (Timer: 00:00:00)
    Host->>Client: Start MediaRecorder (Audio + Video Canvas Stream)
    
    Note over Host,Client: Session Continues Under Active Recording

    Host->>Server: Emit room:recording_stop (roomId)
    Server->>Peers: Broadcast room:recording_state_changed (isRecording: false)
    Client->>Host: Save & Download .webm/.mp4 Recording File
```

---

## 3. Key Requirements & Features

### A. Role-Based Permission Gate
- Only users with `room.record` permission (Community Owners, Admins, or designated Meeting Hosts) can initiate or terminate a room recording.

### B. Room-Wide Consent Notification Banner
- When recording begins, an unmissable top banner is rendered across all connected client interfaces:
  > **🔴 Meeting Recording Active**: *"[Host Name] has started recording this session. By remaining in this room, you acknowledge and consent to audio, video, and screen capture."*
  - Includes an explicit **"I Consent / Dismiss"** confirmation button and an optional **"Leave Room"** escape route.

### C. Persistent Real-Time `REC` Indicator
- While active, the `RoomHeader` and all participant video stages display a prominent red pulsating badge:
  `🔴 REC 00:14:32`.

### D. Local & Cloud Stream Capture
- Utilizes browser `MediaRecorder` API to capture mixed multi-audio tracks and video stage canvas into high-definition `.webm` / `.mp4` video files with instant download.
