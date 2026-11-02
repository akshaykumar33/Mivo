# Mivo DevSecOps Pipeline & Shift-Left Architecture

## 1. Architectural Philosophy

Mivo adheres to the **Shift-Left Security** paradigm: security controls, compliance validations, vulnerability testing, and threat auditing are embedded directly into the developer workflow and CI/CD automation rather than treated as a post-deployment afterthought.

```
+-------------------------------------------------------------------------------+
|                        DEVSECOPS SHIFT-LEFT TIMELINE                          |
+-------------------------------------------------------------------------------+
|  1. Local Dev  |  2. PR Gate   |  3. Build & CI |  4. CD & Deploy | 5. Runtime|
|----------------+---------------+----------------+-----------------+-----------|
| • Gitleaks     | • Semgrep SAST| • Full Turbo   | • Image Signing | • Rate Lim|
| • SecOps Scan  | • Hadolint    | • Playwright   | • Prisma Migrate| • K8s Net |
| • Typecheck    | • Trivy IaC   | • Vitest Tests | • Zero-Downtime | • SIEM Log|
| • License Aud  | • Dep Review  | • CodeQL Scan  | • Health Verify | • Audit Svc|
+-------------------------------------------------------------------------------+
```

---

## 2. DevSecOps Control Gates

### Gate 1: Developer Workstation (Pre-Commit / Pre-Push)
- **Local Scanner**: `pnpm check:secops`
  - Scans for unstaged `.env` files and tracked credentials.
  - Scans code for dangerous AST patterns (`eval`, `new Function`, `exec`, disabled TLS).
  - Validates permissive open-source licenses (`node scripts/check-licenses.mjs`).
- **Secret Rules**: `.gitleaks.toml` defines patterns for Mivo-specific JWT keys, Postgres URLs, and Gemini keys.

### Gate 2: Pull Request Automated Security Gates (`devsecops.yml`)
- **Semgrep SAST**:
  - Analyzes ASTs across TypeScript, NestJS, and Next.js against OWASP Top 10 rules.
  - Automatically exports SARIF diagnostics to GitHub Security Tab.
- **Hadolint Dockerfile Linter**:
  - Enforces container security best practices on both backend and web Dockerfiles (ensuring unprivileged users, version pinning, and minimal attack surface).
- **Trivy IaC Configuration Audit**:
  - Scans `k8s/` manifests and `docker-compose.prod.yml` for security misconfigurations.
- **Dependency Review Action**:
  - Rejects any pull request attempting to introduce high/critical CVEs or copyleft licenses.

### Gate 3: Build & Automated Testing (`ci.yml`)
- TypeScript type checking across all 5 workspace projects (`pnpm check:types`).
- Unit & integration testing with coverage (`pnpm test:vitest`).
- Full headless browser E2E verification with Playwright (`pnpm test:e2e`).
- Automated CodeQL static code analysis.

### Gate 4: Continuous Delivery & Container Security (`cd.yml`)
- Multi-arch Docker Buildx builds with minimal base images (`node:20-alpine`).
- Automatic container vulnerability scanning via Aqua Security Trivy.
- Automated zero-downtime database migration (`prisma migrate deploy`).
- Post-deployment automated health check probe against `/health`.

### Gate 5: Production Runtime Defense & Monitoring
- **Kubernetes Zero-Trust Network Policies** (`k8s/09-network-policy.yaml`):
  - Default Deny All ingress/egress.
  - Isolated pod-to-pod communication channels (PostgreSQL only accessible by backend; frontend cannot reach database directly).
- **Helmet HTTP Security Headers**:
  - Strict Content-Security-Policy (CSP), HSTS (1 year + subdomains), X-Frame-Options: DENY.
- **Distributed Rate Limiting**:
  - Redis sliding-window token bucket preventing brute force and API abuse.
- **Structured SecOps Audit Trail**:
  - `SecurityAuditService` outputs structured JSON logs for SIEM ingestion, redacting sensitive parameters automatically.

