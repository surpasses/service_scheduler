import { useState, useEffect } from 'react'
import { api } from '../api'

export function TechnicianView({ user }) {
  const [jobs, setJobs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/jobs?technician_id=${user.id}`).then(setJobs)
  }, [user.id])

  async function handleComplete(jobId) {
    setError('')
    try {
      const updated = await api.post(`/jobs/${jobId}/complete`)
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)))
    } catch (err) {
      setError(err.message)
    }
  }

  const scheduled = jobs.filter((j) => j.status === 'scheduled')
  const completed = jobs.filter((j) => j.status === 'completed')

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Scheduled Jobs</h2>

        {scheduled.length === 0 && (
          <p className="text-sm text-slate-500">No scheduled jobs.</p>
        )}

        <ul className="space-y-2">
          {scheduled.map((job) => (
            <li key={job.id} className="bg-white border border-slate-200 rounded p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{formatWindow(job)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Job #{job.id} · Quote #{job.quote_id}</p>
              </div>
              <button
                onClick={() => handleComplete(job.id)}
                className="shrink-0 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
              >
                Mark Complete
              </button>
            </li>
          ))}
        </ul>

        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-4">Completed Jobs</h2>
          <ul className="space-y-2">
            {completed.map((job) => (
              <li key={job.id} className="bg-slate-50 border border-slate-200 rounded p-4">
                <p className="text-sm text-slate-600">{formatWindow(job)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Job #{job.id} · Quote #{job.quote_id}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function formatWindow(job) {
  const start = new Date(job.start_time)
  const end = new Date(job.end_time)
  return `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}
