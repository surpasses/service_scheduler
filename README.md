# service_scheduler

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** React + Vite + Tailwind CSS
- **Database:** PostgreSQL (via Docker)
- **Testing:** Vitest

## Prerequisites

- Node.js 20+ and npm
- Docker Desktop (for Postgres)

## Setup

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install backend deps and configure env
cd backend
npm install
cp .env.example .env

# 3. Install frontend deps
cd ../frontend
npm install
```

## Running

Open three terminals from the project root:

```bash
# Terminal 1 — database
docker compose up -d

# Terminal 2 — backend (http://localhost:3000)
cd backend && npm run dev

# Terminal 3 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

Health check: `curl http://localhost:3000/health` → `{"status":"ok"}`

## Testing

```bash
cd backend && npm test
cd frontend && npm test
```

## Database

Defaults (see `backend/.env.example` and `docker-compose.yml`):

| Setting  | Value               |
| -------- | ------------------- |
| Host     | `localhost`         |
| Port     | `5432`              |
| User     | `postgres`          |
| Password | `postgres`          |
| Database | `service_scheduler` |

Useful commands:

```bash
docker compose exec db psql -U postgres -d service_scheduler   # open psql
docker compose down                                            # stop (keeps data)
docker compose down -v                                         # stop + wipe data
```

## Project Structure

```
backend/    Express API + Postgres client
frontend/   Vite + React + Tailwind app
docs/       Schema, API, tech stack notes
docker-compose.yml
```
