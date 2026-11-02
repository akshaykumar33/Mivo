# Mivo Enterprise SecOps Incident Response Playbook

## 1. Incident Severity Classification Matrix

| Level | Severity | Definition & Impact | Initial Response SLO | Escalation Path |
|---|---|---|---|---|
| **P1** | **Critical** | Active data breach, root container breakout, unauthenticated RCE, production database compromised, total service outage. | **< 15 minutes** | VP of Engineering, Lead SecOps, CISO, Legal |
| **P2** | **High** | Privilege escalation in RBAC, rate-limiting bypass under active DDoS, compromised non-admin account, sensitive secret leak in commit history. | **< 30 minutes** | Security Lead, Backend On-Call Engineer |
| **P3** | **Medium** | Isolated XSS in internal admin view, non-critical dependency CVE without public exploit, elevated 5xx error rate. | **< 2 hours** | Core Development Team |
| **P4** | **Low** | Minor informational misconfiguration, non-exploitable warning, documentation inaccuracy. | **< 24 hours** | Scheduled Sprint Triage |

---

## 2. 5-Phase NIST Incident Response Lifecycle

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  1. PREPARATION │ ──> │ 2. DETECTION/ANALYSIS│ ──> │   3. CONTAINMENT    │
└─────────────────┘     └──────────────────────┘     └──────────┬──────────┘
                                                                │
                        ┌──────────────────────┐     ┌──────────▼──────────┐
                        │ 5. POST-INCIDENT     │ <── │ 4. ERADICATION &    │
                        │    LEARNING & AUDIT  │     │    RECOVERY         │
                        └──────────────────────┘     └─────────────────────┘
```

### Phase 1: Preparation
- Automated continuous monitoring of audit logs via `SecurityAuditService`.
- Centralized alerts via GitHub Security Advisories, CodeQL, and Dependabot.
- Secret scanning with `.gitleaks.toml` on all git branches.

### Phase 2: Detection & Analysis
1. Inspect centralized SIEM logs for `[SECOPS_ALERT]` and `[SECOPS_WARN]` entries.
2. Review HTTP 429 spike alerts (DDoS or brute force) or unexpected 401/403 bursts.
3. Validate origin IP address, actor ID, and affected endpoints.

### Phase 3: Containment
- **Account Containment**: Immediately revoke active sessions for compromised users:
  ```sql
  -- Invalidate all active refresh tokens for the compromised user
  DELETE FROM "RefreshToken" WHERE "userId" = 'COMPROMISED_USER_ID';
  ```
- **Network Containment**: Block offending IP addresses or CIDR blocks at the Ingress controller or Cloudflare/AWS WAF.
- **Micro-segmentation**: Apply `k8s/09-network-policy.yaml` to isolate compromised pods.

### Phase 4: Eradication & Recovery
1. **Secret Rotation**:
   - Rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `k8s/02-secret.yaml` or Render Environment settings.
   - Rotate PostgreSQL connection passwords and Redis credentials.
2. **Container Rollout**:
   ```bash
   # Perform rolling restart of all application pods
   kubectl rollout restart deployment/mivo-server -n mivo-prod
   kubectl rollout restart deployment/mivo-web -n mivo-prod
   ```
3. **Database Verification**: Verify database integrity and audit logs for unauthorized record tampering.

### Phase 5: Post-Incident Activity (Post-Mortem)
- Conduct blameless root-cause analysis (RCA) within 72 hours.
- Document timeline, detection point, dwell time, and corrective action items.
- Update Semgrep rules (`.semgrep.yml`) or Gitleaks rules (`.gitleaks.toml`) to prevent regression.

---

## 3. Specific Threat Runbooks

### Runbook A: Compromised Production JWT Secret
1. Immediately generate a new 256-bit cryptographic secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update Kubernetes secrets or Render environment variable `JWT_ACCESS_SECRET`.
3. Restart backend pods (`kubectl rollout restart deployment/mivo-server -n mivo-prod`).
4. All existing user sessions will be invalidated; users must re-authenticate.

### Runbook B: High-Volume DDoS / WebSocket Flooding
1. Check `apps/server` rate-limit logs (`RateLimiterGuard`).
2. Verify Redis cluster connection status via `/health`.
3. If attack persists from distributed botnets, activate Cloudflare "Under Attack" mode or configure Nginx Ingress rate-limit annotations:
   ```yaml
   nginx.ingress.kubernetes.io/limit-rps: "20"
   nginx.ingress.kubernetes.io/limit-connections: "50"
   ```

