# Security Policy

## Supported Versions

| Version | Security Updates |
|---|---|
| 2.x (current) | ✅ Active |
| 1.x | ❌ End of life |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, pull requests, or discussions.**

To report a vulnerability, email us at: **ai.soc.anlaylst.team@gmail.com**

Include as much of the following as possible:

| Field | Description |
|---|---|
| **Type** | e.g., SQL injection, authentication bypass, IDOR, SSRF, XSS |
| **Location** | File path, endpoint, or UI component |
| **Reproduction** | Step-by-step instructions to reproduce the issue |
| **Impact** | What data or functionality is at risk, and for which users |
| **PoC** | Proof-of-concept code or screenshot (optional but helpful) |

We will acknowledge your report within **48 hours** and provide a resolution timeline within **5 business days**. Critical vulnerabilities (CVSS ≥ 9.0) are treated as highest priority.

We ask that you:
- Give us a reasonable time to investigate and patch before public disclosure
- Avoid accessing, modifying, or deleting data that does not belong to you during testing
- Not perform denial-of-service attacks or disrupt service availability

We will credit you in the release notes if you wish.

---

## Security Architecture

### Authentication
- Passwords hashed with **Argon2id** (winner of the Password Hashing Competition)
- JWT access tokens expire in **15 minutes**; refresh tokens are rotated on use
- **TOTP MFA** supported (RFC 6238 — compatible with any authenticator app)
- Agent authentication uses **HMAC-SHA256** tokens — constant-time comparison, no timing attacks
- All auth endpoints are **rate-limited** (login, register, MFA, password reset)

### Multi-Tenancy
- Every database row is scoped by `tenant_id`; queries enforce tenant isolation at the ORM layer
- Redis keys use a `tenant:{id}:` namespace prefix — no cross-tenant key collisions
- API keys are hashed at rest (Argon2id); the raw key is shown once at creation
- Ingest rate limits are enforced per-tenant, not globally

### Transport & Headers
- All production traffic over HTTPS/TLS (enforced at the Railway / reverse-proxy layer)
- Strict security headers on all responses: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Length` middleware enforces a **10 MiB cap** on all inbound requests
- CORS is restricted to an explicit `ALLOWED_ORIGINS` allowlist

### Audit & Integrity
- Every privileged action (login, role change, rule create/delete, etc.) is written to an append-only audit log
- Audit log rows are **SHA-256 hash-chained** — any row deletion or modification breaks the chain and is detectable
- Prometheus metrics endpoint is **bearer-token gated** in production

### Outbound Requests
- Webhook URLs are validated against an allowlist (no private/loopback/link-local addresses — SSRF prevention)
- All outbound HTTP calls use `follow_redirects=False` and a **25 MiB content cap**

### Dependencies
- Python dependencies managed with pip and pinned in `pyproject.toml`
- Frontend dependencies managed with npm; `npm audit` is run in CI
- `python-jose` CVE-2022-29217 mitigated by migration to **PyJWT[cryptography] ≥ 2.9.0**
- Dependency updates are reviewed before merging
