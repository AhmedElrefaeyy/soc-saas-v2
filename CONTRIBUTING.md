# Contributing to NeuraShield

Thank you for taking the time to contribute. This guide covers everything you need to get your changes merged quickly.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Commit Convention](#commit-convention)
- [Code Style](#code-style)
- [Testing](#testing)

---

## Code of Conduct

Be respectful and constructive. We welcome contributors of all experience levels.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/soc-saas-v2.git
   cd soc-saas-v2
   ```
3. **Add the upstream remote** so you can pull in future updates:
   ```bash
   git remote add upstream https://github.com/ai-soc-analyst/soc-saas-v2.git
   ```

---

## Development Setup

### Prerequisites

| Tool | Minimum Version |
|---|---|
| Docker Desktop | 24+ |
| Python | 3.12+ |
| Node.js | 20+ |
| Git | 2.40+ |

### One-command setup (Docker)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set JWT_SECRET and JWT_REFRESH_SECRET at minimum
docker compose up --build
```

### Local backend (faster iteration)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Requires local Postgres and Redis. The Docker services work fine alongside a locally-run backend — just set `DATABASE_URL` and `REDIS_URL` in `.env` to `localhost`.

### Local frontend

```bash
cd frontend
npm install
npm run dev   # starts Vite on :5173
```

---

## Making Changes

### Branch naming

| Type | Convention | Example |
|---|---|---|
| New feature | `feat/<short-description>` | `feat/slack-connector` |
| Bug fix | `fix/<short-description>` | `fix/alert-assignee-validation` |
| Documentation | `docs/<short-description>` | `docs/wazuh-connector-guide` |
| Refactor | `refactor/<short-description>` | `refactor/correlation-engine` |
| Tests | `test/<short-description>` | `test/ueba-unit-coverage` |

Always branch off `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature
```

### Adding a connector

1. Create `backend/app/connectors/parsers/<source>.py` — implement `parse(raw: dict) -> NormalizedEvent`
2. Register the source in `backend/app/connectors/registry.py`
3. Add documentation in `docs/connectors.md` with a full config example
4. Add at least one unit test in `backend/tests/unit/connectors/`

### Adding a detection rule type

1. Implement the rule evaluator in `backend/app/detection/`
2. Add the rule schema to `backend/app/schemas/rules.py`
3. Wire the API endpoint in `backend/app/api/v1/rules.py`
4. Add migration if the `DetectionRule` model changed

---

## Pull Request Process

1. **Run the full quality check locally** before pushing (see [Code Style](#code-style) and [Testing](#testing))
2. **Open the PR against `main`**
3. Fill in the PR template — description, test plan, and checklist
4. The CI pipeline will run automatically; all jobs must pass before merge
5. At least one maintainer review is required
6. Squash-merge is preferred for feature PRs; merge commits for release branches

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `security`

**Examples:**

```
feat(connectors): add CrowdStrike Falcon parser
fix(auth): prevent timing attack on agent token comparison
security(jwt): migrate python-jose → PyJWT 2.9
docs(connectors): add Suricata eve-http setup guide
```

---

## Code Style

### Backend (Python)

```bash
cd backend
ruff check app/ tests/    # lint — must pass with 0 errors
ruff format app/ tests/   # format
mypy app/                 # type check (strict mode)
```

- Line length: **100** characters (enforced by ruff)
- Type annotations are required on all public functions
- No `as any` equivalents — use proper types or `cast()`
- No `print()` or `console.log()` statements — use the logger

### Frontend (TypeScript)

```bash
cd frontend
npm run lint          # ESLint — 0 warnings enforced
npm run type-check    # tsc --noEmit
npm run format:check  # Prettier
```

- Strict TypeScript — no `any`, no implicit `any`
- Component files: PascalCase (`AlertCard.tsx`)
- Hooks: `useXxx.ts`
- Stores: `xxxStore.ts`

---

## Testing

### Backend

```bash
cd backend

# Unit tests — no infrastructure required
pytest tests/unit/ -v

# Integration tests — requires Postgres + Redis
# (set DATABASE_URL and REDIS_URL in your environment or .env)
pytest tests/integration/ -v

# Full suite with coverage
pytest tests/ --cov=app --cov-report=term-missing
```

**Guidelines:**
- Unit tests must not hit the database or Redis — mock at the service boundary
- Integration tests should use a real database; do not mock SQLAlchemy
- Every new endpoint needs at least one integration test covering the happy path
- New parser/connector code needs at least one unit test with a real event payload sample

### Frontend

Frontend component tests are in scope for complex interactive components. Run:

```bash
cd frontend
# (add your test framework command here — Vitest / Testing Library)
```

---

## Questions?

Open a [GitHub Discussion](https://github.com/ai-soc-analyst/soc-saas-v2/discussions) for design questions, or a [GitHub Issue](https://github.com/ai-soc-analyst/soc-saas-v2/issues) for confirmed bugs.
