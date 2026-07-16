<div align="center">

<br />

<img src="docs/assets/logo.png" alt="NeuraShield" width="140" />

# NeuraShield

### AI-Powered, Multi-Tenant Security Operations Center

**Built for MSSPs, enterprise security teams, and managed detection & response providers**

<br />

[![CI](https://github.com/ai-soc-analyst/soc-saas-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/ai-soc-analyst/soc-saas-v2/actions/workflows/ci.yml)
[![Python 3.12+](https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=fff)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi&logoColor=fff)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=000)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=fff)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=fff)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=fff)](https://redis.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E)](LICENSE)

<br />

[Quick Start](#-quick-start) &nbsp;·&nbsp; [Features](#-features) &nbsp;·&nbsp; [Architecture](#-architecture) &nbsp;·&nbsp; [Connectors](#-connectors) &nbsp;·&nbsp; [Deploy](#-deployment) &nbsp;·&nbsp; [Contributing](CONTRIBUTING.md)

</div>

---

## Overview

NeuraShield is a **production-grade, multi-tenant SOC platform** that ingests security events from your existing tools, normalizes and correlates them in real-time, and gives your analysts an AI-assisted workspace to triage, investigate, and respond — all from a single dashboard.

Every layer is built for **multi-tenancy**: data, rate limits, API keys, playbooks, and RBAC are fully isolated per tenant, making NeuraShield suitable for MSSPs managing many client environments or enterprises with multiple independent business units.

```
  Wazuh · Suricata · MS Defender · Syslog
           │
           ▼  POST /api/v1/connectors/{source}/ingest
  ┌────────────────────────────────────────────────────┐
  │  INGEST  →  NORMALIZE  →  CORRELATE  →  DETECT    │
  │                                                    │
  │  Alerts  →  Investigations  →  Playbooks  →  Notify│
  └────────────────────────┬───────────────────────────┘
                           │  REST + WebSocket
               ┌───────────▼───────────┐
               │   React Dashboard     │
               │   + AI Copilot (LLM)  │
               └───────────────────────┘
```

---

## Features

### Event Ingestion & Processing
- **Multi-source ingestion** — Wazuh, Suricata IDS, Microsoft Defender ATP, syslog, and custom webhooks out of the box
- **Normalization engine** — maps raw events to a unified schema regardless of source format
- **Real-time correlation** — groups related events into incidents using configurable time windows and co-occurrence rules
- **Sigma rule support** — write detections in the open Sigma format; bulk-import from SigmaHQ

### Detection & Alerting
- **Custom detection rules** — threshold, pattern-match, and behavioral rules with severity scoring and MITRE ATT&CK tagging
- **UEBA** — user & entity behavior analytics; statistical baselines surface anomaly alerts automatically
- **Attack chain visualization** — interactive DAG graph showing how low-level events chain into multi-stage attacks
- **MITRE ATT&CK browser** — map every detection to the ATT&CK matrix; visualize your detection coverage as a heatmap
- **Suppression rules** — silence known-good noise with field-matching expressions; time-bounded or permanent

### Investigation Workflow
- **Investigation tickets** — create, assign, tag, prioritize, and close investigations with a full audit trail
- **AI Copilot** — ask natural-language questions about any alert; the LLM receives scoped, tenant-isolated SOC context
- **Playbooks** — define automated response runbooks (block IP, isolate host, send Slack alert, create ticket, etc.)
- **Threat intelligence enrichment** — AbuseIPDB, AlienVault OTX, and VirusTotal lookups per indicator, per alert
- **IOC management** — import, search, tag, and correlate indicators of compromise across all ingested events

### Multi-Tenancy & MSSP
- **Complete tenant isolation** — database rows, Redis namespaces, rate limits, API keys, and settings are separated per tenant
- **RBAC** — Owner / Admin / Analyst / Viewer roles with per-tenant membership management
- **MSSP super-admin portal** — manage all client tenants from a single elevated view
- **Per-tenant ingest rate limiting** — noisy tenants are throttled without impacting neighbours
- **Email invitations** — onboard teammates with role assignment; no admin required for self-registration

### Security & Compliance
- **MFA / TOTP** — time-based one-time passwords with QR code provisioning and backup codes
- **Tamper-evident audit log** — SHA-256 hash chaining on every audit entry; the chain breaks if any row is altered
- **JWT + Argon2** — short-lived access tokens (15 min), rotating refresh tokens (7 days), Argon2id password hashing
- **HMAC agent tokens** — agents authenticate with fast HMAC-SHA256 tokens; legacy Argon2 still accepted during migration
- **API key management** — scoped keys for connector integrations; keys are hashed at rest
- **Rate limiting** on every auth endpoint (login, register, MFA, password reset, demo)
- **Content-length middleware** — 10 MiB cap on all inbound requests
- **Strict security headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Observability
- **Prometheus metrics** — HTTP request latency, event throughput, queue depth, active alerts (bearer-token gated)
- **Sentry APM** — distributed traces, performance profiling, and session replay for both backend and frontend
- **Structured JSON logging** — structlog with request-ID propagation through the entire async call chain
- **Health endpoints** — `/api/v1/health` (unauthenticated) and `/api/v1/health/metrics-info` (auth-gated)

### Fleet & Agent Management
- **SOC Agent** — lightweight Python agent for Windows/Linux endpoints; phone-home heartbeat, log forwarding
- **Fleet dashboard** — real-time agent heartbeat, version tracking, and remote status monitoring
- **One-command bootstrap** — PowerShell (`bootstrap.ps1`) for Windows; Python installer for Linux/macOS

### Reports & SOC Metrics
- **PDF report generation** — executive summaries, alert timelines, KPIs, and analyst workload stats
- **Scheduled reports** — generate and email reports automatically on a cron schedule
- **SOC metrics dashboard** — MTTD, MTTR, alert volume trends, false-positive rates, team throughput

---

## Architecture

<div align="center">
<img src="docs/assets/architecture.png" alt="NeuraShield Architecture Diagram" width="100%" />
</div>

<br />

**Data flow summary:**
1. Security tools push raw events to `/api/v1/connectors/{source}/ingest` with a per-tenant API key
2. The ingestion pipeline normalizes each event, enriches it with GeoIP and threat-intel lookups, and appends it to a Redis stream
3. Background workers consume the stream and run correlation and detection rule evaluation
4. Detections create alerts; high-severity alerts trigger configured playbook actions (notify, escalate, block)
5. Analysts triage alerts in the React dashboard and ask the AI Copilot for context
6. Every privileged action is written to the tamper-evident, hash-chained audit log

---

## Tech Stack

| Layer | Technology |
|---|---|
| **API** | Python 3.12+, FastAPI 0.115+, Uvicorn (ASGI) |
| **ORM / Migrations** | SQLAlchemy 2.0 (async + typed), Alembic |
| **Database** | PostgreSQL 16, pgvector (RAG embeddings) |
| **Cache / Queues** | Redis 7 (Hiredis) — streams, pub/sub, distributed locks |
| **Frontend** | React 18, TypeScript 5.6, Vite 8, Tailwind CSS 3 |
| **UI Components** | Radix UI, TanStack Table/Query, XyFlow, Recharts, Framer Motion, dnd-kit |
| **State Management** | Zustand (client state), TanStack Query (server state) |
| **AI / LLM** | Groq (Llama models), Google Gemini — switchable per tenant |
| **Auth** | PyJWT 2.9+, Argon2-cffi, pyotp (TOTP), HMAC-SHA256 |
| **Observability** | Prometheus client, Sentry SDK 2.0+ (FastAPI + React integrations) |
| **Logging** | structlog (async-safe, JSON output) |
| **Email** | Brevo (primary), Resend (secondary), SMTP fallback |
| **Threat Intel** | AbuseIPDB, AlienVault OTX, VirusTotal, MaxMind GeoLite2 |
| **Deployment** | Docker Compose (local / self-hosted), Railway (cloud PaaS) |
| **CI/CD** | GitHub Actions — lint, type-check, unit tests, integration tests, Docker build, deploy |

<br />

<div align="center">
<img src="docs/assets/tech-stack.png" alt="NeuraShield Tech Stack" width="480" />
</div>

---

## Quick Start

### Prerequisites

- **Docker Desktop 24+** with Docker Compose
- **Git**

### 1. Clone and configure

```bash
git clone https://github.com/ai-soc-analyst/soc-saas-v2.git
cd soc-saas-v2

cp backend/.env.example backend/.env
```

Edit `backend/.env` — at minimum, set the JWT secrets:

```bash
# Generate strong secrets (run these, paste the output into .env)
openssl rand -hex 64   # → JWT_SECRET
openssl rand -hex 64   # → JWT_REFRESH_SECRET
```

### 2. Start the full stack

```bash
docker compose up --build
```

All five services start with health-check ordering (`db → redis → backend → worker → frontend`).

| Service | URL |
|---|---|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8000/api/v1 |
| **Swagger UI** | http://localhost:8000/docs |
| **Health check** | http://localhost:8000/api/v1/health |

### 3. Create your first tenant

Visit **http://localhost:5173** → **Get Started** → complete the setup wizard.

Or via API:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YourStr0ng!Pass",
    "tenant_name": "Acme SOC"
  }'
```

---

## Configuration

All settings live in `backend/.env`. Copy `backend/.env.example` for the full reference with inline docs.

<details>
<summary><strong>Core settings</strong></summary>

```dotenv
ENVIRONMENT=production
LOG_LEVEL=INFO

DATABASE_URL=postgresql://user:pass@host:5432/soc_saas
REDIS_URL=redis://host:6379/0

JWT_SECRET=<openssl rand -hex 64>
JWT_REFRESH_SECRET=<openssl rand -hex 64>
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
```
</details>

<details>
<summary><strong>AI / LLM (optional — AI Copilot features)</strong></summary>

```dotenv
# Free tier at console.groq.com
GROQ_API_KEY=gsk_...

# Free at aistudio.google.com/app/apikey
GEMINI_API_KEY=...
```
</details>

<details>
<summary><strong>Threat intelligence (optional — free tiers available)</strong></summary>

```dotenv
ABUSEIPDB_API_KEY=...      # abuseipdb.com — 1 000 lookups/day free
ALIENVAULT_API_KEY=...     # otx.alienvault.com — free
VIRUSTOTAL_API_KEY=...     # virustotal.com — 4 lookups/min free

# Offline GeoIP (recommended — no rate limit, no external calls)
# Register free at dev.maxmind.com, download GeoLite2-City.mmdb
MAXMIND_DB_PATH=/data/GeoLite2-City.mmdb
```
</details>

<details>
<summary><strong>Email (optional — pick one provider)</strong></summary>

```dotenv
# Brevo — recommended; no domain verification needed for dev
BREVO_API_KEY=...
BREVO_FROM_EMAIL=noreply@yourdomain.com

# Resend — alternative; requires verified domain
RESEND_API_KEY=...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```
</details>

<details>
<summary><strong>Observability (optional)</strong></summary>

```dotenv
# Sentry — leave empty in dev to disable
SENTRY_DSN=https://...@sentry.io/...

# Prometheus /metrics auth — leave empty to open-access in dev
METRICS_SECRET_TOKEN=<openssl rand -hex 32>
```
</details>

---

## Connectors

Point your existing security tools at the ingest API. All connectors share the same pattern:

```
POST https://<your-backend>/api/v1/connectors/{source}/ingest
X-API-Key: <tenant-api-key>
Content-Type: application/json
```

Generate an API key under **Dashboard → Settings → API Keys → Create Key**.

| Source | `{source}` | Guide |
|---|---|---|
| Wazuh | `wazuh` | [docs/connectors.md → Wazuh](docs/connectors.md) |
| Suricata IDS | `suricata` | [docs/connectors.md → Suricata](docs/connectors.md) |
| Microsoft Defender ATP | `defender` | [docs/connectors.md → Defender](docs/connectors.md) |
| Syslog (rsyslog / syslog-ng) | `syslog` | [docs/connectors.md → Syslog](docs/connectors.md) |
| Custom / Generic Webhook | `generic` | [docs/connectors.md → Generic](docs/connectors.md) |

See [docs/connectors.md](docs/connectors.md) for copy-paste config snippets for each source.

---

## Deployment

### Railway (recommended, zero-cost setup)

NeuraShield deploys as a Railway project (backend API + background worker + frontend), backed by external free-tier managed Postgres ([Neon](https://neon.tech)) and Redis ([Upstash](https://upstash.com)) — this keeps everything on free tiers with no card required anywhere.

1. **Fork** this repository
2. Create a free [Neon](https://neon.tech) Postgres project and an [Upstash](https://upstash.com) Redis database; copy both connection strings
3. In [Railway](https://railway.app), create a new project → **Deploy from GitHub repo** → select your fork
4. Add three services from the same repo, each with its own **Root Directory** / Dockerfile:
   - **backend** — `backend/Dockerfile`, runs `./start.sh` (applies migrations, then starts uvicorn; runs the worker in-process when `RUN_WORKER_INLINE=true`)
   - **worker** — `backend/Dockerfile` with `WORKER_MODE=true` (skip if running the worker in-process on the backend service instead, to stay within a single free service)
   - **frontend** — `frontend/Dockerfile`
5. Set `DATABASE_URL` / `REDIS_URL` to the Neon/Upstash connection strings on every backend/worker service, plus `JWT_SECRET` / `JWT_REFRESH_SECRET` (generate each with `openssl rand -hex 64`, must differ), `FRONTEND_URL`, and `ALLOWED_ORIGINS`
6. Every push to `main` auto-deploys once GitHub is connected

**Cost note:** Railway's free tier is credit-based (a small monthly allowance) — once it's used up, services pause until the next cycle. Running the worker in-process on the backend service (`RUN_WORKER_INLINE=true`) instead of as a separate service roughly halves credit burn if you're on the free tier.

### Self-hosted (Docker)

```bash
# Build and start all services
docker compose -f docker-compose.yml up -d --build

# Apply database migrations
docker compose exec backend alembic upgrade head
```

**Production environment variables:**

```dotenv
ENVIRONMENT=production
ALLOWED_ORIGINS=["https://app.yourdomain.com"]
FRONTEND_URL=https://app.yourdomain.com
DATABASE_URL=postgresql://...        # managed Postgres (TLS recommended)
REDIS_URL=rediss://...               # managed Redis (TLS)
```

---

## Development

### Backend

```bash
cd backend
pip install -e ".[dev]"          # install with dev extras
alembic upgrade head             # apply migrations
uvicorn app.main:app --reload    # start with hot reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev                      # Vite dev server on :5173
```

### Testing

```bash
cd backend

# Unit tests — no infrastructure required
pytest tests/unit/ -v

# Integration tests — requires running Postgres + Redis
pytest tests/integration/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

### Code quality

```bash
# Backend
ruff check app/          # lint
ruff format app/         # format
mypy app/                # type check (strict)

# Frontend
npm run lint             # ESLint — 0 warnings enforced
npm run type-check       # tsc --noEmit
npm run format:check     # Prettier
```

---

## Security

Security is a first-class concern in NeuraShield. The platform has completed multiple security audit passes covering:

- Authentication & session management (JWT, MFA, HMAC agent tokens)
- Multi-tenant data isolation (database, Redis, rate limits)
- Input validation & content limits at every boundary
- SSRF prevention on outbound webhook calls
- Tamper-evident audit logging with SHA-256 hash chaining
- Dependency vulnerability management (PyJWT migration, npm audit)

**Found a vulnerability?** Please do **not** open a public issue.  
Read our [Security Policy](SECURITY.md) and report privately.

---

## Contributing

Contributions are welcome — bug fixes, new connectors, detection rules, UI improvements.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

Quick guide:
1. Fork the repo and create a branch from `main`
2. Make your changes (include tests where relevant)
3. Ensure `ruff`, `mypy`, `eslint`, and `tsc` all pass
4. Open a PR — the CI pipeline runs automatically

---

## License

[MIT](LICENSE) © 2025 NeuraShield Contributors
