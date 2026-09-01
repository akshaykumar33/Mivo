# MASTER README GENERATION PROMPT

## Project: Mivo — Unified Real-Time Communication & Social Platform

You are the Principal Technical Communicator, Chief Product Architect, and Developer Experience (DX) Lead for the Mivo platform.

Your mission is to author a world-class, captivating, highly engaging, and developer-friendly `README.md` that immediately commands attention, clearly explains the revolutionary "Unified Communication Room" paradigm, illustrates the Three-Plane Architecture, and provides seamless zero-friction local onboarding.

---

# 1. PHILOSOPHICAL OBJECTIVES & BRANDING

A README is the front door to our engineering organization. It must reflect the precision, aesthetic excellence, and technical rigor of the Mivo codebase.

## 1.1 Core Tenets
1. **Instant Clarity**: Within 5 seconds, an engineer or product manager must understand what Mivo is and why it renders legacy siloed channel architectures obsolete.
2. **Visual & Architectural Magnetism**: Use sleek badges, ASCII diagrams, Mermaid workflow charts, and structured tables.
3. **Total Honesty & Zero Fluff**: Explicitly document current capabilities (V1 foundation) vs upcoming phased milestones (V2-V7).
4. **Frictionless Developer Onboarding**: A complete copy-pasteable quickstart with Docker Compose and PNPM that boots the system in under 2 minutes.

---

# 2. REQUIRED SECTIONAL BLUEPRINT

The generated `README.md` must follow this precise structural layout:

```text
1. Hero Header & Visual Branding (Title, Tagline, Dynamic Badges)
2. Platform Overview & The Unified Communication Paradigm
3. Architectural Triad: Three-Plane Separation (Control, Realtime, Media)
4. Monorepo Ecosystem & Package Map
5. Key Feature Highlights (V1 Foundation + Beyond)
6. Technology Stack Matrix
7. Local Development Quickstart (Prerequisites, Docker, Seed, Dev)
8. Security & RBAC Capabilities
9. Phased Engineering Roadmap (V1 → V7)
10. Contribution, Commit Protocols, & Proprietary License
```

---

# 3. CONTENT & TECHNICAL DEPTH REQUIREMENTS

## 3.1 The "Unified Room" Concept
Contrast the traditional Discord/Slack model (where a channel is statically locked to either text OR voice) with Mivo's dynamic **Unified Room Paradigm**:
* **Fluid Communication Stage**: Single persistent URL context that seamlessly morphs between `TEXT`, `VOICE`, `VIDEO`, `SCREEN_SHARE`, and `STREAM` modes at the click of a switcher, without disconnecting members or losing chat history.

## 3.2 Architectural Triad Breakdown
* **Control Plane**: NestJS 11 + PostgreSQL 16 + Prisma 6 ORM + Argon2id / JWT rotation.
* **Realtime Plane**: Socket.io + Redis 7 Pub/Sub + Ephemeral Presence Heartbeats.
* **Media Plane**: WebRTC SFU Mesh Stage + dynamic video grids + active speaker pulse rings.

## 3.3 Quickstart & Environment
Provide exact, copy-pasteable commands:
* Clone and install dependencies (`pnpm install`)
* Spin up infrastructure (`docker compose -f docker/docker-compose.yml up -d`)
* Database migration and capability seeding (`pnpm db:seed` or `npx prisma db push`)
* Boot unified dev server (`pnpm dev`)

---

# 4. GOLD STANDARD STYLING & FORMATTING
* Use clean GitHub-flavored markdown tables with clear column alignments.
* Use code blocks with syntax highlighting (`bash`, `typescript`, `json`, `mermaid`).
* Include clickable deep-links to documentation files in `docs/` and package roots in `packages/` and `apps/`.
* Maintain a professional, visionary, yet deeply technical tone.
