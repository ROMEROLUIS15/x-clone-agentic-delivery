# Runbook — Setup & Operations

## Prerequisites

| Software | Version | Notes |
|----------|---------|-------|
| Node.js | >= 22 (24 recommended) | Required for both backend and frontend. The Docker image uses Node 24. |
| npm | >= 10 | Comes with Node.js. |
| Docker & Docker Compose | Latest | Required only for production mode (Docker stack). Ships PostgreSQL 16. |
| SQLite | System default | Used automatically for local development (and the E2E test DB). |

---

## Quick Start (Local Development)

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd x-clone-agentic-delivery

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure environment

Both projects use `.env` files. Copy the example template and adjust if needed:

```bash
# Backend (from project root)
cp .env.example backend/.env

# Frontend — no .env needed for dev (Vite proxies /api to localhost:4000)
```

Default `backend/.env`:

```
DATABASE_URL="file:./dev.db"
PORT=4000
JWT_SECRET="change-me-in-production"
```

### 3. Set up the database

```bash
cd backend

# Generate Prisma client and apply migrations
npx prisma migrate dev

# (Optional) Seed the database with realistic users, tweets, replies,
# follows, likes, and notifications (see "Seed Data" below for exact counts)
npm run db:seed
```

### 4. Start development servers

Open **two terminals**:

```bash
# Terminal 1 — Backend (http://localhost:4000)
cd backend
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm run dev
```

The frontend dev server proxies `/api/*` requests to `http://localhost:4000` (configured in `vite.config.ts`).

---

## Seed Data

The seed script creates 12 realistic users with bios, avatars, 36 tweets, 12 threaded replies, 49 follow relationships, 72 cross-likes, and 6 sample notifications for `user1`.

```bash
cd backend
npm run db:seed
```

### Test credentials

All 12 users share the same password:

| Email | Password |
|-------|----------|
| `user1@example.com` | `password123` |
| `user2@example.com` | `password123` |
| `...` | `password123` |
| `user12@example.com` | `password123` |

User 1 (`Carlos García`) follows 5 users and has followers from 5 others, making it the best account for testing the timeline (it shows tweets from multiple followed users).

---

## Running Tests

### Backend tests (138 integration + unit tests, ≥95% coverage)

```bash
cd backend
npm test
```

### Frontend tests (54 component/integration tests)

```bash
cd frontend
npm test
```

### E2E tests (Playwright — 10 tests across 8 specs)

Self-contained and isolated: Playwright boots both the backend (with
`NODE_ENV=test`, which relaxes the auth rate limiter) and the frontend
automatically, so no servers need to be started manually. A **dedicated,
throwaway `e2e.db`** is provisioned in `globalSetup` and deleted in
`globalTeardown`, so the E2E run never touches — or leaves residue in — the dev
database.

```bash
cd frontend
npm run test:e2e
```

---

## Production Mode (Docker Compose)

The Docker Compose stack uses PostgreSQL instead of SQLite and serves the frontend via nginx.

> **Before you start:** make sure **Docker Desktop is installed and running**
> (its status must read "running") — this is the most common reason the command
> below appears to hang or fail.

```bash
# From project root
docker compose up --build
```

> The **first build takes a few minutes** (it pulls base images, runs `npm ci`,
> and builds both the backend and the frontend). It's ready when the logs show
> `Database seeded successfully!` followed by `Server running on http://localhost:4000`.

This starts three services:

| Service | Container | Port |
|---------|-----------|------|
| PostgreSQL 16 | `xclone-db` | 5432 |
| Backend (Node.js) | `xclone-backend` | 4000 |
| Frontend (nginx) | `xclone-frontend` | 5173 |

On first start, the backend automatically:
1. Pushes the Prisma schema to PostgreSQL (`prisma db push`)
2. Seeds the database with realistic data
3. Starts the Express server

Visit **http://localhost:5173** and log in with `user1@example.com` / `password123`.

> **Secrets in Docker.** For a quick evaluator run the stack boots with built-in
> defaults (and logs a loud warning that `JWT_SECRET` is a known-weak default).
> For any real deployment, create a `.env` at the repo root and set at least
> `JWT_SECRET` and `POSTGRES_PASSWORD` (see the Docker section of `.env.example`).
>
> **Uploaded images** persist across restarts on the `uploads` Docker volume and
> are served through the nginx `/uploads` proxy.

### Clean shutdown

```bash
docker compose down
# To also delete the database volume:
docker compose down -v
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `file:./dev.db` | Prisma connection string. SQLite for local dev (`file:./dev.db`), PostgreSQL for Docker (`postgresql://xclone:xclone@postgres:5432/xclone`). |
| `PORT` | No | `4000` | Backend Express server port. |
| `JWT_SECRET` | Yes | `change-me-in-production` | Secret key used to sign and verify JWT tokens. **Must be changed in production.** In production the backend refuses to start if it is unset. |
| `NODE_ENV` | No | _(unset)_ | `production` enables prod guards (fail-fast on weak `JWT_SECRET`); `test` relaxes the rate limiter for the test/E2E suites. Unset in normal local dev. |
| `UPLOAD_DIR` | No | `uploads` (relative to backend cwd) | Directory where uploaded images are stored. In Docker this is a persistent volume mounted at `/app/uploads`. |
| `MAX_UPLOAD_BYTES` | No | `5242880` (5 MB) | Maximum accepted image upload size in bytes. |

---

## Useful Commands

```bash
# Backend — Prisma Studio (browser-based DB editor)
cd backend && npm run db:studio

# Backend — Reset database (deletes all data and re-runs migrations)
cd backend && npm run db:reset

# Backend — Test coverage report (single-fork, IPC-safe on Windows)
cd backend && npm run test:coverage

# Backend — Type-check everything (src + prisma/seed.ts) without emitting
cd backend && npm run typecheck

# Backend — Compile to dist/ (production build)
cd backend && npm run build

# Frontend — Build for production (outputs to dist/)
cd frontend && npm run build
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `prisma: command not found` | Run `npx prisma ...` or install dependencies with `npm install`. |
| `Port 4000 already in use` | Change the `PORT` in `backend/.env` or kill the existing process. |
| `Cannot find module @prisma/client` | Run `npx prisma generate` in the `backend/` directory. |
| Docker: port `5432` already allocated | A local PostgreSQL is using 5432. Stop it, or add a `docker-compose.override.yml` remapping the published port (e.g. `ports: ["5433:5432"]`) — inter-container comms use the Docker network regardless. |
| Docker: `backend` container exits immediately | Check logs with `docker compose logs backend`. Ensure PostgreSQL is healthy (`docker compose logs postgres`). |
| E2E: tests fail at registration with 429 | A stale dev backend on port 4000 is being reused with the strict rate limiter. Stop it so Playwright starts its own (`NODE_ENV=test`) instance. |
| Playwright: `Browser not found` | Run `npx playwright install` in the `frontend/` directory. |
