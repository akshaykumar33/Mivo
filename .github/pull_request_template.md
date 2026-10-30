## Description
Briefly describe the purpose of this change and the problem it solves.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 🔒 Security fix (vulnerability remediation, dependency patch)
- [ ] ⚡ Performance improvement
- [ ] 🛠️ DevOps / CI/CD pipeline update
- [ ] 📝 Documentation update

## Production DevOps & Security Verification Checklist
- [ ] **Typecheck**: `pnpm check:types` passed with 0 errors.
- [ ] **Lint**: `pnpm lint` passed with 0 errors.
- [ ] **Unit Tests**: `pnpm test:vitest` passed.
- [ ] **Security Audit**: `pnpm check:audit` verified; no high/critical vulnerabilities introduced.
- [ ] **Secrets Check**: No hardcoded API keys, JWT secrets, database connection strings, or credentials committed.
- [ ] **Database Migrations**: Backward-compatible schema changes applied and verified.
- [ ] **Container Compatibility**: Dockerfiles build cleanly if application code was altered.
- [ ] **Health Probes**: Liveness and readiness endpoints remain functional.

