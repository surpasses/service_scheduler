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

Ensure the database is running before running backend tests (`docker compose up -d`).

```bash
# Backend — integration tests against real Postgres
cd backend && npm test

# Frontend — component tests (no DB required)
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

## Key Implementation Decision and Tradeoffs:

- <u>**For Schema, API or tech stack decision and tradeoffs, they are attached in their respective markdown files inside `docs/`**</u>

- All SQL queries are parameterised (`$1`, `$2`). User input is never inserted directly into a query string, which prevents SQL injection.

- **Conflict prevention** via ```SELECT ... FOR UPDATE``` on the technician row.
    When two managers assign the same technician simultaneously, both requests could pass the overlap check before either one writes, double-booking the technician. We prevent this by locking the technician's row at the start of the transaction ```(SELECT ... FOR UPDATE)```. 
    The second request waits until the first commits, then sees the newly created job and rejects with 409.  

## Final thoughts:
- Overall, the scheduler took me around ~3-4 hours to implement, covering concurrency. If I had more time,
- I would look to use an event-driven approach to simulate notifications rather than just using DB rows, such as using a third-party
- service such as Resend to send emails whenever jobs are completed,
- incorporate authentication,
  and incorporate some frontend tests.