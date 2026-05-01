import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { pool } from '../db.js'

let managerId, technicianId, quoteId1, quoteId2

beforeEach(async () => {
  await pool.query(`
    TRUNCATE notifications, jobs RESTART IDENTITY CASCADE;
    UPDATE quotes SET status = 'unscheduled';
  `)

  const manager = await pool.query(
    `INSERT INTO users (name, role) VALUES ('Test Manager', 'manager') RETURNING id`,
  )
  managerId = manager.rows[0].id

  const tech = await pool.query(
    `INSERT INTO users (name, role) VALUES ('Test Tech', 'technician') RETURNING id`,
  )
  technicianId = tech.rows[0].id

  const q1 = await pool.query(
    `INSERT INTO quotes (description, customer_name, created_by_manager_id)
     VALUES ('Fix tap', 'Smith', $1) RETURNING id`,
    [managerId],
  )
  quoteId1 = q1.rows[0].id

  const q2 = await pool.query(
    `INSERT INTO quotes (description, customer_name, created_by_manager_id)
     VALUES ('Service boiler', 'Jones', $1) RETURNING id`,
    [managerId],
  )
  quoteId2 = q2.rows[0].id
})

afterEach(async () => {
  await pool.query(`
    DELETE FROM notifications;
    DELETE FROM jobs;
    DELETE FROM quotes WHERE description IN ('Fix tap', 'Service boiler');
    DELETE FROM users WHERE name IN ('Test Manager', 'Test Tech');
  `)
})

afterAll(async () => {
  await pool.end()
})

function assignJob(quoteId, { start = '2026-06-01T09:00:00Z', end = '2026-06-01T11:00:00Z' } = {}) {
  return request(app)
    .post('/jobs')
    .set('X-User-Id', String(managerId))
    .send({ quote_id: quoteId, technician_id: technicianId, start_time: start, end_time: end })
}

describe('POST /jobs', () => {
  it('happy path — creates job, updates quote, fires notification', async () => {
    const res = await assignJob(quoteId1)

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('scheduled')
    expect(res.body.technician_id).toBe(technicianId)

    const quote = await pool.query('SELECT status FROM quotes WHERE id = $1', [quoteId1])
    expect(quote.rows[0].status).toBe('scheduled')

    const notif = await pool.query('SELECT type FROM notifications WHERE job_id = $1', [res.body.id])
    expect(notif.rows[0].type).toBe('job_assigned')
  })

  it('rejects a window that is not exactly 2 hours (400)', async () => {
    const res = await assignJob(quoteId1, {
      start: '2026-06-01T09:00:00Z',
      end: '2026-06-01T10:00:00Z',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/2 hours/)
  })

  it('rejects an overlapping job for the same technician (409)', async () => {
    await assignJob(quoteId1)

    const res = await assignJob(quoteId2, {
      start: '2026-06-01T10:00:00Z',
      end: '2026-06-01T12:00:00Z',
    })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/overlapping/)
  })

  it('allows back-to-back jobs (no overlap)', async () => {
    await assignJob(quoteId1, { start: '2026-06-01T09:00:00Z', end: '2026-06-01T11:00:00Z' })

    const res = await assignJob(quoteId2, {
      start: '2026-06-01T11:00:00Z',
      end: '2026-06-01T13:00:00Z',
    })
    expect(res.status).toBe(201)
  })

  it('rejects assigning the same quote twice (409)', async () => {
    await assignJob(quoteId1)
    const res = await assignJob(quoteId1, {
      start: '2026-06-01T13:00:00Z',
      end: '2026-06-01T15:00:00Z',
    })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already scheduled/)
  })

  it('rejects a non-manager caller (403)', async () => {
    const res = await request(app)
      .post('/jobs')
      .set('X-User-Id', String(technicianId))
      .send({ quote_id: quoteId1, technician_id: technicianId, start_time: '2026-06-01T09:00:00Z', end_time: '2026-06-01T11:00:00Z' })
    expect(res.status).toBe(403)
  })

  it('concurrent assignments — exactly one wins', async () => {
    const [res1, res2] = await Promise.all([
      assignJob(quoteId1),
      assignJob(quoteId2, { start: '2026-06-01T09:00:00Z', end: '2026-06-01T11:00:00Z' }),
    ])

    const statuses = [res1.status, res2.status].sort()
    expect(statuses).toEqual([201, 409])
  })
})

describe('POST /jobs/:id/complete', () => {
  it('happy path — marks job and quote completed, fires notification', async () => {
    const assign = await assignJob(quoteId1)
    const jobId = assign.body.id

    const res = await request(app)
      .post(`/jobs/${jobId}/complete`)
      .set('X-User-Id', String(technicianId))

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('completed')

    const quote = await pool.query('SELECT status FROM quotes WHERE id = $1', [quoteId1])
    expect(quote.rows[0].status).toBe('completed')

    const notif = await pool.query(
      `SELECT type, recipient_id FROM notifications WHERE job_id = $1 AND type = 'job_completed'`,
      [jobId],
    )
    expect(notif.rows[0].type).toBe('job_completed')
    expect(notif.rows[0].recipient_id).toBe(managerId)
  })

  it('rejects completing a non-scheduled job (409)', async () => {
    const assign = await assignJob(quoteId1)
    const jobId = assign.body.id

    await request(app).post(`/jobs/${jobId}/complete`).set('X-User-Id', String(technicianId))

    const res = await request(app)
      .post(`/jobs/${jobId}/complete`)
      .set('X-User-Id', String(technicianId))

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/not in scheduled/)
  })

  it('rejects a non-assigned technician (403)', async () => {
    const assign = await assignJob(quoteId1)

    const other = await pool.query(
      `INSERT INTO users (name, role) VALUES ('Other Tech', 'technician') RETURNING id`,
    )

    const res = await request(app)
      .post(`/jobs/${assign.body.id}/complete`)
      .set('X-User-Id', String(other.rows[0].id))

    expect(res.status).toBe(403)

    await pool.query(`DELETE FROM users WHERE id = $1`, [other.rows[0].id])
  })
})
