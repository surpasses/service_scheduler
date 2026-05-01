import { pool } from '../db.js'

export async function loadUser(req, res, next) {
  const id = req.header('X-User-Id')
  if (!id) {
    req.user = null
    return next()
  }
  const { rows } = await pool.query('SELECT id, role, name FROM users WHERE id = $1', [id])
  req.user = rows[0] ?? null
  next()
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(403).json({ error: 'X-User-Id required' })
    if (req.user.role !== role) return res.status(403).json({ error: `${role} role required` })
    next()
  }
}
