# Security Policy & Responsible Vulnerability Disclosure

## 1. Supported Versions

Mivo actively maintains and provides security updates for the following versions:

| Version | Supported          | Security Patch Status |
| ------- | ------------------ | --------------------- |
| 1.0.x   | :white_check_mark: | Active support        |
| < 1.0   | :x:                | Unsupported           |

---

## 2. Reporting a Vulnerability

The Mivo engineering and security team takes security vulnerabilities seriously. If you discover a security vulnerability in Mivo (including real-time communication protocols, authentication, cryptographic key ratchets, WebRTC signaling, or API endpoints), please report it responsibly.

### How to Report

**Please DO NOT report security issues via public GitHub issues, discussions, or social media.**

Instead, please send an encrypted report or email directly to:
* **Email**: `security@mivo.live` (or create a private GitHub Security Advisory under the **Security** tab)
* **Subject**: `[SECURITY VULNERABILITY] <Component>: Brief description`

### What to Include

To help us triage and remediate the issue rapidly, please include:
1. **Type of Vulnerability**: (e.g., Remote Code Execution, Privilege Escalation, SQL/NoSQL Injection, SSRF, XSS, Timing Attack).
2. **Affected Component**: (e.g., `@mivo/server`, `@mivo/web`, `@mivo/database`, Socket.io Gateway).
3. **Step-by-step Reproduction**: Complete steps, payload, or Proof-of-Concept (PoC) code.
4. **Impact Assessment**: What an attacker could achieve if exploiting the flaw.
5. **Suggested Mitigation**: (Optional, if you have ideas on how to patch it).

---

## 3. Vulnerability Response Timeline

Our security team adheres to the following Service Level Objectives (SLOs):
* **Initial Response**: Within 24 hours of receipt.
* **Triage & Reproduction**: Within 48 hours.
* **Status Updates**: Every 3 business days until remediation.
* **Patch Release & Advisory**: Target remediation within 7–14 business days depending on severity.

---

## 4. Security Principles & Architecture Guarantees

* **Zero-Trust Boundary**: All API and WebSocket requests must authenticate via cryptographic JWT with timing-safe signature verification.
* **Non-Root Containers**: All production Docker containers execute under dedicated unprivileged system users (`mivo` UID 1001, `nextjs` UID 1001).
* **Least Privilege**: Database access is restricted via PostgreSQL role permissions and Prisma query parameterization.
* **Defense in Depth**: Automated static analysis (CodeQL), container vulnerability scanning (Trivy), dependency audit (`pnpm audit`), and secret scanning (Gitleaks) execute in continuous integration.

