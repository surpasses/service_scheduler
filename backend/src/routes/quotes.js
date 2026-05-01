import { Router } from 'express'
import { pool } from '../db.js'
import { requireRole } from '../middleware/auth.js'

export const quotesRouter = Router()

quotesRouter.post('/', requireRole('manager'), async (req, res) => {
  const { description, customer_name } = req.body ?? {}
  if (!description || !customer_name) {
    return res.status(400).json({ error: 'description and customer_name required' })
  }
  const { rows } = await pool.query(
    `INSERT INTO quotes (description, customer_name, created_by_manager_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [description, customer_name, req.user.id],
  )
  res.status(201).json(rows[0])
})

quotesRouter.get('/', async (req, res) => {
  const { status } = req.query
  const { rows } = status
    ? await pool.query('SELECT * FROM quotes WHERE status = $1 ORDER BY id', [status])
    : await pool.query('SELECT * FROM quotes ORDER BY id')
  res.json(rows)
})

quotesRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM quotes WHERE id = $1', [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'quote not found' })
  res.json(rows[0])
})
