import { Router } from 'express'
import { pool, withTransaction } from '../db.js'
import { requireRole } from '../middleware/auth.js'

export const jobsRouter = Router()

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

jobsRouter.post('/', requireRole('manager'), async (req, res) => {
  const { quote_id, technician_id, start_time, end_time } = req.body ?? {}
  if (!quote_id || !technician_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'quote_id, technician_id, start_time, end_time required' })
  }

  const start = new Date(start_time)
  const end = new Date(end_time)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: 'invalid timestamps' })
  }
  if (end <= start) {
    return res.status(400).json({ error: 'end_time must be after start_time' })
  }
  if (end.getTime() - start.getTime() !== TWO_HOURS_MS) {
    return res.status(400).json({ error: 'window must be exactly 2 hours' })
  }

  try {
    const job = await withTransaction(async (client) => {
      // Lock the technician row so concurrent assignments serialise per technician.
      const techRes = await client.query(
        `SELECT id, role FROM users WHERE id = $1 FOR UPDATE`,
        [technician_id],
      )
      const tech = techRes.rows[0]
      if (!tech) {
        const e = new Error('technician not found')
        e.status = 404
        throw e
      }
      if (tech.role !== 'technician') {
        const e = new Error('user is not a technician')
        e.status = 400
        throw e
      }

      const overlap = await client.query(
        `SELECT 1 FROM jobs
          WHERE technician_id = $1
            AND status = 'scheduled'
            AND tstzrange(start_time, end_time, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
          LIMIT 1`,
        [technician_id, start_time, end_time],
      )
      if (overlap.rowCount > 0) {
        const e = new Error('technician has an overlapping scheduled job')
        e.status = 409
        throw e
      }

      const quoteRes = await client.query(
        `SELECT id, status FROM quotes WHERE id = $1 FOR UPDATE`,
        [quote_id],
      )
      const quote = quoteRes.rows[0]
      if (!quote) {
        const e = new Error('quote not found')
        e.status = 404
        throw e
      }
      if (quote.status !== 'unscheduled') {
        const e = new Error('quote is already scheduled or completed')
        e.status = 409
        throw e
      }

      const jobRes = await client.query(
        `INSERT INTO jobs (quote_id, technician_id, manager_id, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [quote_id, technician_id, req.user.id, start_time, end_time],
      )
      const job = jobRes.rows[0]

      await client.query(
        `UPDATE quotes SET status = 'scheduled' WHERE id = $1`,
        [quote_id],
      )

      await client.query(
        `INSERT INTO notifications (recipient_id, job_id, type)
         VALUES ($1, $2, 'job_assigned')`,
        [technician_id, job.id],
      )

      return job
    })
    res.status(201).json(job)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    throw err
  }
})

jobsRouter.get('/', async (req, res) => {
  const { technician_id, status } = req.query
  const where = []
  const params = []
  if (technician_id) {
    params.push(technician_id)
    where.push(`technician_id = $${params.length}`)
  }
  if (status) {
    params.push(status)
    where.push(`status = $${params.length}`)
  }
  const sql = `SELECT * FROM jobs ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY start_time ASC`
  const { rows } = await pool.query(sql, params)
  res.json(rows)
})

jobsRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'job not found' })
  res.json(rows[0])
})

jobsRouter.post('/:id/complete', requireRole('technician'), async (req, res) => {
  try {
    const job = await withTransaction(async (client) => {
      const jobRes = await client.query(
        `SELECT * FROM jobs WHERE id = $1 FOR UPDATE`,
        [req.params.id],
      )
      const job = jobRes.rows[0]
      if (!job) {
        const e = new Error('job not found')
        e.status = 404
        throw e
      }
      if (job.technician_id !== req.user.id) {
        const e = new Error('not the assigned technician')
        e.status = 403
        throw e
      }
      if (job.status !== 'scheduled') {
        const e = new Error('job is not in scheduled state')
        e.status = 409
        throw e
      }

      const updated = await client.query(
        `UPDATE jobs SET status = 'completed' WHERE id = $1 RETURNING *`,
        [job.id],
      )
      await client.query(
        `UPDATE quotes SET status = 'completed' WHERE id = $1`,
        [job.quote_id],
      )
      await client.query(
        `INSERT INTO notifications (recipient_id, job_id, type)
         VALUES ($1, $2, 'job_completed')`,
        [job.manager_id, job.id],
      )
      return updated.rows[0]
    })
    res.json(job)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    throw err
  }
})
