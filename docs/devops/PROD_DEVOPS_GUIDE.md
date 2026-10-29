# Mivo Enterprise DevOps, Security & CI/CD Production Reference Manual

## 1. Architecture & Threat Model Overview

Mivo operates as a distributed, high-concurrency real-time platform combining WebRTC media SFUs, Socket.io distributed clustering via Redis, RESTful NestJS microservices, and a Next.js 15 standalone frontend.

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
              │  - Full Turbo     │       │  - Prisma Migrate│
              │  - Playwright E2E │       │  - Zero-Downtime │
              │  - Gitleaks Sec   │       │    Deployment    │
              │  - Trivy Container│       │    (Render/K8s)  │
              │  - Dep Review     │       │  - Health Verify │
              └───────────────────┘       └─────────┬────────┘
                                                    │
                                  ┌─────────────────▼──────────────┐
                                  │   Production Orchestration     │
                                  │   (docker-compose.prod.yml /   │
                                  │         k8s/ Manifests)        │
                                  │                                │
                                  │   ┌────────────────────────┐   │
                                  │   │   Nginx Ingress/Proxy  │   │
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

## 2. Security Infrastructure ("Sec")

### A. Secret & Credential Scanning (`.github/workflows/secret-scan.yml`)
* Integrates **Gitleaks** executing across full commit histories on pull requests and nightly scheduled runs.
* Prevents leaking JWT secrets, API tokens, database URIs, or private keys into git history.

### B. Dependency Review Gate (`.github/workflows/dependency-review.yml`)
* Automatically checks pull requests using GitHub's official **Dependency Review Action**.
* Blocks any pull request introducing:
  - Critical or High severity CVEs.
  - Incompatible copyleft licenses (GPL, AGPL, SSPL).

### C. Container CVE Scanner (`.github/workflows/security.yml`)
* Uses **Aqua Security Trivy** to scan generated Docker containers for OS-level and runtime CVEs, exporting SARIF reports to GitHub's Security dashboard.
* Integrates **GitHub CodeQL** for automated Static Application Security Testing (SAST).

### D. Application Defense & Hardening
* **Helmet Security Headers**:
  - `Content-Security-Policy`: Restricts scripts, objects, and connect sources.
  - `Strict-Transport-Security`: Enforces HSTS with `maxAge: 31536000`, `includeSubDomains`, and `preload`.
  - `X-Frame-Options: DENY`: Full protection against UI redressing / clickjacking.
  - `Cross-Origin-Resource-Policy`: Cross-origin safe media asset delivery.
* **Rate Limiting Guard** (`apps/server/src/common/rate-limiter.guard.ts`):
  - Distributed Redis rate limiter with fallback to in-memory sliding window.
  - Emits standard `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` HTTP headers.
  - Returns `429 Too Many Requests` on abuse while bypassing `/health` and `/health/live` probes.

---

## 3. Dependency Governance & Audits ("Dependencies & Audit")

* **Vulnerability Remediation (`pnpm.overrides`)**:
  - Remediates transitive vulnerabilities (Next.js RCE, `proxy-addr` IP spoofing, `tinypool` prototype pollution, `cross-spawn`, `micromatch`, `qs`).
* **License Compliance Checker (`scripts/check-licenses.mjs`)**:
  - Audits all monorepo packages to ensure strict adherence to permissive enterprise licenses (MIT, Apache-2.0, BSD).
* **Automated Package Updates (`.github/dependabot.yml`)**:
  - Weekly dependency tracking for `npm`, `docker`, and `github-actions`.
* **Audit CLI Script**:
  ```bash
  # Check dependency vulnerabilities
  pnpm check:audit

  # Audit open source licenses
  node scripts/check-licenses.mjs
  ```

---

## 4. Testing & Code Quality Suite ("Tests")

| Test Target | Command | Details |
|---|---|---|
| **TypeScript Validation** | `pnpm check:types` | Typechecks all 5 workspace projects (`@mivo/shared`, `@mivo/database`, `@mivo/ui`, `@mivo/server`, `@mivo/web`). |
| **Linters** | `pnpm lint` | Enforces zero-warning clean code standard. |
| **Unit & Integration** | `pnpm test:vitest` | 36 test files, 147 test cases covering crypto, tokens, storage, chat, WebRTC, and health probes. |
| **Test Coverage** | `pnpm test:coverage` | Generates v8 code coverage reports in `coverage/`. |
| **Security Auditing** | `vitest run tests/vitest/12-security-and-compliance` | Verifies rate limiting, timing-safe equality, and XSS sanitization. |
| **E2E Browser Testing** | `pnpm test:e2e` | Playwright multi-page E2E testing against real Chromium browser instances. |
| **All-in-One** | `pnpm test:all` | Sequentially validates types, lint, and all test suites. |

---

## 5. Enterprise Kubernetes Deployment ("Deployment Everything")

Production Kubernetes manifests are organized under [`k8s/`](file:///c:/Wysbryx/Mivo/k8s):

```
k8s/
├── 00-namespace.yaml          # mivo-prod namespace with Baseline security profile
├── 01-configmap.yaml          # Global environment variables
├── 02-secret.yaml             # Secret references (JWT, DB, Redis, S3)
├── 03-postgres.yaml           # StatefulSet + Headless Service + 20Gi PVC
├── 04-redis.yaml              # Deployment + ClusterIP Service (volatile-lru)
├── 05-server-deployment.yaml  # 3-replica Server Deployment with Anti-Affinity & Probes
├── 06-web-deployment.yaml     # 3-replica Next.js Standalone Deployment
├── 07-ingress.yaml            # Ingress with cert-manager SSL & WebSocket proxying
├── 08-hpa.yaml                # Autoscaling 3-10 replicas on CPU/Memory thresholds
└── kustomization.yaml         # Kustomize manifest for single-command deploy
```

### Deploy to Kubernetes
```bash
# Apply entire production cluster with Kustomize
kubectl apply -k k8s/

# Monitor deployment rollout status
kubectl rollout status deployment/mivo-server -n mivo-prod
kubectl rollout status deployment/mivo-web -n mivo-prod
```

---

## 6. Continuous Delivery Automation (`.github/workflows/cd.yml`)

1. **Docker Multi-Arch Build & Push**:
   - Compiles Server and Web containers using Docker Buildx and QEMU.
   - Pushes to GitHub Container Registry (`ghcr.io/wysbryx/mivo/server` and `web`).
2. **Automated Database Migration**:
   - Executes `prisma migrate deploy` prior to updating application containers to guarantee zero-downtime database backward compatibility.
3. **Zero-Downtime Rolling Update**:
   - Triggers production webhooks (e.g. Render Deploy Hooks).
4. **Automated Health Gate**:
   - Verifies the live `/health` endpoint after deployment (polls up to 12 times with 10s backoff) before declaring success.
5. **Release & SBOM Generation** (`.github/workflows/release.yml`):
   - Generates CycloneDX and SPDX Software Bill of Materials on every `v*.*.*` tag release.
