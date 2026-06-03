# Runbook — Setup & Operations

## Prerequisites

| Software | Version | Notes |
|----------|---------|-------|
| Node.js | >= 22 | Required for both backend and frontend. |
| npm | >= 10 | Comes with Node.js. |
| Docker & Docker Compose | Latest | Required only for production mode (Docker stack). |
| SQLite | System default | Used automatically for local development. |

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

# (Optional) Seed the database with 12 realistic users, tweets, follows, and likes
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

The seed script creates 12 realistic users with bios, avatars, 36 tweets, 12 threaded replies, 49 follow relationships, and 72 cross-likes.

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

### Backend tests (111 integration + unit tests, ≥95% coverage)

```bash
cd backend
npm test
```

### Frontend tests (46 component/integration tests)

```bash
cd frontend
npm test
```

### E2E tests (Playwright — 5 specs)

```bash
cd frontend

# Ensure both backend and frontend dev servers are running first
npm run test:e2e
```

---

## Production Mode (Docker Compose)

The Docker Compose stack uses PostgreSQL instead of SQLite and serves the frontend via nginx.

```bash
# From project root
docker compose up --build
```

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
| `JWT_SECRET` | Yes | `change-me-in-production` | Secret key used to sign and verify JWT tokens. **Must be changed in production.** |

---

## Useful Commands

```bash
# Backend — Prisma Studio (browser-based DB editor)
cd backend && npm run db:studio

# Backend — Reset database (deletes all data and re-runs migrations)
cd backend && npm run db:reset

# Backend — Run tests in watch mode
cd backend && npm run test:watch

# Frontend — Run tests in watch mode
cd frontend && npm run test:watch

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
| Docker: `backend` container exits immediately | Check logs with `docker compose logs backend`. Ensure PostgreSQL is healthy (`docker compose logs postgres`). |
| Playwright: `Browser not found` | Run `npx playwright install` in the `frontend/` directory. |
