# Mivo Enterprise DevOps & CI/CD Production Architecture Guide

## 1. Executive Summary

This document defines the production DevOps architecture, Continuous Integration / Continuous Deployment (CI/CD) pipelines, containerization standards, and orchestration policies for the Mivo real-time collaborative platform.

```
                          ┌────────────────────────┐
                          │    Developer Push /    │
                          │      Pull Request      │
                          └───────────┬────────────┘
                                      │
                        ┌─────────────▼─────────────┐
                        │   GitHub Actions CI/CD    │
                        │    (.github/workflows)    │
                        └───────┬───────────┬───────┘
                                │           │
              ┌─────────────────┴─┐       ┌─┴────────────────┐
              │  Continuous       │       │  Continuous      │
              │  Integration (CI) │       │  Delivery (CD)   │
              │  - Lint & Types   │       │  - Docker Buildx │
              │  - Vitest Unit    │       │  - GHCR Publish  │
              │  - Full Turbo     │       │  - Zero-Downtime │
              │  - Playwright E2E │       │    Deployment    │
              │  - Security/Trivy │       │    (Render/K8s)  │
              └───────────────────┘       └─────────┬────────┘
                                                    │
                                  ┌─────────────────▼──────────────┐
                                  │   Production Orchestration     │
                                  │   (docker-compose.prod.yml)    │
                                  │                                │
                                  │   ┌────────────────────────┐   │
                                  │   │   Nginx Reverse Proxy  │   │
                                  │   │  (SSL, Gzip, WS Proxy) │   │
                                  │   └─────┬────────────┬─────┘   │
                                  │         │            │         │
                                  │   ┌─────▼────┐ ┌─────▼─────┐   │
                                  │   │ Next.js  │ │  NestJS   │   │
                                  │   │ Web (3K) │ │ Server(4K)│   │
                                  │   └──────────┘ └──┬─────┬──┘   │
                                  │                   │     │      │
                                  │         ┌─────────▼┐  ┌─▼────┐ │
                                  │         │ Postgres │  │Redis │ │
                                  │         └──────────┘  └──────┘ │
                                  └────────────────────────────────┘
```

---

## 2. GitHub Actions CI/CD Pipeline Suite

All workflows are located in `.github/workflows/`:

### A. CI Pipeline (`.github/workflows/ci.yml`)
Triggered automatically on:
- Every Pull Request targeting `main` or `master`.
- Every direct commit push to `main`, `master`, `feat/**`, and `fix/**`.
- Employs **concurrency groups** with `cancel-in-progress: true` on feature branches to optimize runner minutes.

| Job | Description | Command |
|---|---|---|
| **Lint & Typecheck** | Verifies TypeScript types across all 5 workspace projects (`shared`, `database`, `ui`, `server`, `web`) with Turbo caching. | `pnpm lint`, `pnpm check:types` |
| **Unit & Integration** | Executes Vitest test suite covering security, tokens, storage, permissions, and health endpoints. | `pnpm test:vitest` |
| **Monorepo Build** | Compiles all packages and Next.js static pages with Turbo caching. | `pnpm build` |
| **Playwright E2E** | Spins up native Postgres & Redis containers in CI runner, generates Prisma schema, and runs headless Chromium tests with video/screenshot artifacts. | `pnpm test:e2e` |
| **Docker Verify** | Validates that multi-stage Dockerfiles for both Server and Web compile without errors using Docker Buildx and GHA caching. | `docker build` check |

### B. CD & Container Publishing Pipeline (`.github/workflows/cd.yml`)
Triggered on:
- Git push to `main` / `master`.
- Semantic Versioning Release Tags (`v*.*.*`).
- Manual trigger via `workflow_dispatch` with environment selection (`production` / `staging`).

**Features:**
- Multi-architecture container build using Docker Buildx and QEMU.
- Authenticates securely via `GITHUB_TOKEN` to GitHub Container Registry (`ghcr.io`).
- Automatically tags containers with:
  - `sha-<commit>` (exact immutable commit tracking)
  - `latest` (default production tag)
  - `vX.Y.Z` (semver releases)
- Triggers automated zero-downtime rolling update via Render Webhook (`RENDER_SERVER_DEPLOY_HOOK_URL`, `RENDER_WEB_DEPLOY_HOOK_URL`).

### C. Security & Vulnerability Scanning (`.github/workflows/security.yml`)
- **CodeQL**: Deep static code analysis for TypeScript/JavaScript to prevent SQL injection, path traversal, and unsafe deserialization.
- **Dependency Audit**: `pnpm audit --audit-level=high` blocks vulnerable transitive packages.
- **Aqua Security Trivy**: Scans base Alpine images and dependencies for OS-level CVEs, outputting SARIF alerts to GitHub Security tab.

### D. Automated Dependency Governance (`.github/dependabot.yml`)
- Automated weekly updates for npm, Docker images, and GitHub Actions.

---

## 3. Production Docker Architecture & Hardening

Both Server and Web Docker images follow the highest security, performance, and containerization standards:

### Server Container (`Dockerfile`)
1. **Multi-Stage Build**: Separates builder tools (`python3`, `make`, `g++`) from the slim runtime layer (`node:20-alpine`).
2. **Non-Root Execution**: Runs under unprivileged user `mivo` (UID 1001, GID 1001), satisfying CIS Docker Benchmark 4.1.
3. **Signal Forwarding**: Utilizes `dumb-init` as PID 1 to properly intercept and forward `SIGTERM` / `SIGINT` to Node.js, ensuring clean graceful shutdown without zombie processes.
4. **Active Health Check**:
   ```dockerfile
   HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
     CMD wget -qO- http://localhost:4000/health || exit 1
   ```

### Web Frontend Container (`apps/web/Dockerfile`)
1. **Next.js 15 Standalone Mode**: Configured with `output: 'standalone'` in `next.config.mjs`, producing a self-contained runtime (~150MB) without shipping `node_modules`.
2. **Non-Root Execution**: Runs under unprivileged user `nextjs` (UID 1001, GID 1001).
3. **Static File Optimization**: Public assets and `.next/static` are served directly.
4. **Active Health Check**: Probes `/api/health`.

---

## 4. Reverse Proxy & Network Architecture (`docker/nginx/nginx.conf`)

In production environments running on virtual machines or bare-metal instances, Nginx acts as the perimeter gateway:
- **WebSocket Gateway (`/socket.io/`)**: Configured with `Upgrade $http_upgrade`, `Connection "upgrade"`, and `proxy_buffering off` for zero-latency Socket.io transport.
- **REST APIs (`/api/`)**: Proxies to NestJS backend with `client_max_body_size 50M` for file uploads.
- **Web App (`/`)**: Proxies to Next.js with HTTP/1.1 keepalive pools.
- **Gzip Acceleration**: Compresses JSON, JavaScript, CSS, HTML, and SVG on the fly.
- **Security Headers**: Injects `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, and `Referrer-Policy`.

---

## 5. Health Monitoring & Observability Endpoints

The server includes production-ready health monitoring endpoints:

### `GET /health` (Full Diagnostic)
```json
{
  "status": "ok",
  "timestamp": "2026-10-29T17:05:00.000Z",
  "uptime": 3600.45,
  "environment": "production",
  "version": "1.0.0",
  "system": {
    "memory": {
      "heapUsedMb": 54.2,
      "heapTotalMb": 92.4,
      "rssMb": 112.8
    }
  },
  "services": {
    "database": {
      "status": "up",
      "responseTimeMs": 3
    },
    "redis": {
      "status": "up",
      "responseTimeMs": 1
    }
  }
}
```

### `GET /health/live` (Kubernetes Liveness Probe)
Returns `200 OK` `{ "status": "alive" }` to prove the event loop is active.

### `GET /health/ready` (Kubernetes Readiness Probe)
Executes `SELECT 1` against PostgreSQL to confirm the pod is ready to accept user traffic.

---

## 6. How to Deploy

### Local / Single-Server Production Setup
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Build and launch all production containers
docker compose -f docker-compose.prod.yml up -d --build

# 3. Check health status
curl http://localhost/health
```

### Cloud Platform (Render Blueprint)
1. Push to GitHub.
2. In Render Dashboard, choose **New > Blueprint**.
3. Point to this repository; `render.yaml` will automatically configure:
   - `mivo-server`: Docker Web Service on port 4000 with healthcheck `/health`.
   - `mivo-web`: Docker Web Service on port 3000 with healthcheck `/api/health`.

