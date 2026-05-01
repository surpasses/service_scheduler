# CLAUDE.md

Context and progress tracker for the **Service Scheduling & Notification System** take-home.

## Role context

- simplicity > cleverness.  Not production-grade. If anything is cut, document it

## Problem (one-liner)

Multiple managers assign **Quotes** to **Technicians** as **Jobs** in 2-hour windows. The backend must prevent overlapping jobs per technician. Technicians complete jobs. Notifications fire on assignment and completion.

## Stack (already scaffolded)

- Backend: Node.js + Express (`backend/`)
- Frontend: React + Vite + Tailwind (`frontend/`)
- DB: Postgres via Docker (`docker-compose.yml`)
- Tests: Vitest (both sides)
- Auth: stubbed via `X-User-Id` header (see `docs/api.md`)

## Reference docs

- [`docs/techStack.md`](docs/techStack.md) — stack choices and rationale
- [`docs/schema.md`](docs/schema.md) — DB tables, relationships, decisions
- [`docs/schema.png`](docs/schema.png) — ERD
- [`docs/api.md`](docs/api.md) — endpoints, error codes, auth stub

## Guiding principles

- Match the schema and API in `docs/` — they are the source of truth.
- Enforce conflict prevention **on the backend**, not the UI. Use a DB-level guarantee where possible (transaction + overlap check, or an exclusion constraint).
- Keep notifications simple: a row in the `Notification` table is enough.
- One job per quote (unique constraint on `Job.quote_id`).
- Job windows must be exactly 2 hours; validate server-side.
- Status transitions: `scheduled → completed` only.
- Don't over-engineer: skip real auth, real email/push, queues, microservices.

## Progress

### 0. Setup
- [x] Repo scaffolded (backend, frontend, docker-compose, tests passing)
- [x] README setup guide
- [x] Docs drafted (schema, api, techStack)

### 1. Database
- [x] SQL migration / init script for `users`, `quotes`, `jobs`, `notifications`
- [x] Indexes: `jobs(technician_id, start_time)`, unique on `jobs(quote_id)`
- [x] Seed script: a few managers, technicians, and unscheduled quotes
- [x] Wire migrations/seed into `docker compose` (mounted to `/docker-entrypoint-initdb.d/`)

### 2. Backend — users & auth stub
- [x] `X-User-Id` middleware that loads the user and exposes `req.user`
- [x] `POST /users`, `GET /users/:id`, `GET /users?role=`
- [x] Role guard helper (`requireRole('manager' | 'technician')`)

### 3. Backend — quotes
- [ ] `POST /quotes` (manager only)
- [ ] `GET /quotes/:id`
- [ ] `GET /quotes?status=unscheduled`

### 4. Backend — jobs (the core)
- [ ] `POST /jobs` — assign quote to technician (manager only)
  - [ ] Validate window is exactly 2 hours and `end > start`
  - [ ] Reject if quote already scheduled (409)
  - [ ] Reject if technician has overlapping scheduled job (409)
  - [ ] Single transaction: create job + flip quote to `scheduled` + insert `job_assigned` notification
- [ ] `GET /jobs/:id`
- [ ] `GET /jobs?technician_id=&status=` (ordered by `start_time`)
- [ ] `POST /jobs/:id/complete` — technician only, must own job
  - [ ] Reject if not in `scheduled` state (409)
  - [ ] Single transaction: job → completed, quote → completed, insert `job_completed` notification for manager

### 5. Conflict prevention — row lock on technician

Approach: inside the `POST /jobs` transaction, take a row lock on the technician
before checking for overlaps. Concurrent assignments for the same technician
serialise; the second one sees the new job and is rejected with 409.

```sql
BEGIN;
SELECT id FROM users WHERE id = $tech FOR UPDATE;
SELECT 1 FROM jobs
  WHERE technician_id = $tech
    AND status = 'scheduled'
    AND tstzrange(start_time, end_time) && tstzrange($start, $end);
-- if row found → ROLLBACK + 409
INSERT INTO jobs (...);
INSERT INTO notifications (...);
UPDATE quotes SET status = 'scheduled' WHERE id = $quote;
COMMIT;
```

- [ ] Wrap `POST /jobs` in a transaction
- [ ] `SELECT ... FOR UPDATE` on the technician row at the start
- [ ] Overlap query using `tstzrange(...) && tstzrange(...)` against scheduled jobs
- [ ] Return `409` if overlap found, otherwise insert job + notification + update quote
- [ ] Test: two concurrent assignments to same technician/window — exactly one wins

### 6. Notifications
- [ ] Insert `Notification` row inside the same transaction as the triggering action
- [ ] (Optional) `GET /notifications?recipient_id=` for the UI/log view

### 7. Frontend
- [ ] Identity picker (dropdown of users → `localStorage` → `X-User-Id` header)
- [ ] Manager view: list unscheduled quotes, assign form (technician + 2-hour window)
- [ ] Technician view: list of own jobs, "mark complete" button
- [ ] Surface notifications somewhere (toast, sidebar, or simple list)
- [ ] Tailwind for layout — keep it plain

### 8. Tests (Vitest)
- [ ] Backend: happy-path assign + complete
- [ ] Backend: overlap rejected (409)
- [ ] Backend: non-2-hour window rejected (400)
- [ ] Backend: completing a non-scheduled job rejected (409)

### 9. README write-up
- [ ] Setup guide
- [ ] How to run tests

### 10. Submission
- [ ] Push to GitHub
- [ ] Verify clean clone → `docker compose up -d` → tests pass → app runs

## Out of scope (call out in README)

- Real auth (passwords, sessions, JWT)
- Real notifications (email, push, websockets)
- Pagination, search, role admin UI
- Rescheduling / cancellation flows
- Multi-day or non-2-hour windows
