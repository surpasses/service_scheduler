import { Router } from 'express'
import { pool } from '../db.js'

export const usersRouter = Router()

usersRouter.post('/', async (req, res) => {
  const { name, role } = req.body ?? {}
  if (!name || !role) return res.status(400).json({ error: 'name and role required' })
  if (role !== 'manager' && role !== 'technician') {
    return res.status(400).json({ error: 'role must be manager or technician' })
  }
  const { rows } = await pool.query(
    'INSERT INTO users (name, role) VALUES ($1, $2) RETURNING *',
    [name, role],
  )
  res.status(201).json(rows[0])
})

usersRouter.get('/', async (req, res) => {
  const { role } = req.query
  const { rows } = role
    ? await pool.query('SELECT * FROM users WHERE role = $1 ORDER BY id', [role])
    : await pool.query('SELECT * FROM users ORDER BY id')
  res.json(rows)
})

usersRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'user not found' })
  res.json(rows[0])
})
