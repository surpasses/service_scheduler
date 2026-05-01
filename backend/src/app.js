import express from 'express'
import cors from 'cors'
import { loadUser } from './middleware/auth.js'
import { usersRouter } from './routes/users.js'
import { quotesRouter } from './routes/quotes.js'
import { jobsRouter } from './routes/jobs.js'
import { notificationsRouter } from './routes/notifications.js'

export const app = express()

app.use(cors())
app.use(express.json())
app.use(loadUser)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/users', usersRouter)
app.use('/quotes', quotesRouter)
app.use('/jobs', jobsRouter)
app.use('/notifications', notificationsRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'internal server error' })
})
