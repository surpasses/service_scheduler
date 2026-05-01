import { Router } from 'express'
import { pool } from '../db.js'

export const notificationsRouter = Router()

notificationsRouter.get('/', async (req, res) => {
  const { recipient_id } = req.query
  const { rows } = recipient_id
    ? await pool.query(
        'SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY sent_time DESC',
        [recipient_id],
      )
    : await pool.query('SELECT * FROM notifications ORDER BY sent_time DESC')
  res.json(rows)
})
