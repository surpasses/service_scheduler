CREATE TABLE IF NOT EXISTS users (
  id    SERIAL PRIMARY KEY,
  role  VARCHAR(16) NOT NULL CHECK (role IN ('manager', 'technician')),
  name  VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id                    SERIAL PRIMARY KEY,
  description           TEXT NOT NULL,
  customer_name         VARCHAR(120) NOT NULL,
  status                VARCHAR(16) NOT NULL DEFAULT 'unscheduled'
                          CHECK (status IN ('unscheduled', 'scheduled', 'completed')),
  created_by_manager_id INTEGER NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id            SERIAL PRIMARY KEY,
  quote_id      INTEGER NOT NULL UNIQUE REFERENCES quotes(id),
  technician_id INTEGER NOT NULL REFERENCES users(id),
  manager_id    INTEGER NOT NULL REFERENCES users(id),
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'completed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS jobs_technician_start_idx
  ON jobs (technician_id, start_time);

CREATE TABLE IF NOT EXISTS notifications (
  id           SERIAL PRIMARY KEY,
  recipient_id INTEGER NOT NULL REFERENCES users(id),
  job_id       INTEGER NOT NULL REFERENCES jobs(id),
  type         VARCHAR(32) NOT NULL CHECK (type IN ('job_assigned', 'job_completed')),
  sent_time    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx
  ON notifications (recipient_id, sent_time DESC);

-- Seed
INSERT INTO users (role, name) VALUES
  ('manager',    'Alice Manager'),
  ('manager',    'Bob Manager'),
  ('technician', 'Carol Tech'),
  ('technician', 'Dan Tech'),
  ('technician', 'Eve Tech')
ON CONFLICT DO NOTHING;

INSERT INTO quotes (description, customer_name, created_by_manager_id) VALUES
  ('Replace kitchen tap',     'Smith',    1),
  ('Service boiler',          'Johnson',  1),
  ('Install ceiling fan',     'Williams', 2),
  ('Repair leaking shower',   'Brown',    2),
  ('Wire new garage outlet',  'Davis',    1)
ON CONFLICT DO NOTHING;
