import { useState, useEffect } from 'react'
import { api } from '../api'

export function ManagerView({ user }) {
  const [quotes, setQuotes] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [assigning, setAssigning] = useState(null)
  const [form, setForm] = useState({ technician_id: '', date: '', hour: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/quotes?status=unscheduled').then(setQuotes)
    api.get('/users?role=technician').then(setTechnicians)
  }, [])

  const timeSlots = Array.from({ length: 9 }, (_, i) => {
    const hour = 8 + i
    const label = `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'} – ${(hour + 2) % 12 || 12}:00 ${hour + 2 < 12 ? 'AM' : 'PM'}`
    return { value: hour, label }
  })

  function openForm(quote) {
    setAssigning(quote)
    setForm({ technician_id: '', date: '', hour: '' })
    setError('')
  }

  async function handleAssign(e) {
    e.preventDefault()
    setError('')
    const start = new Date(`${form.date}T${String(form.hour).padStart(2, '0')}:00:00`)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    try {
      await api.post('/jobs', {
        quote_id: assigning.id,
        technician_id: Number(form.technician_id),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      })
      setQuotes((prev) => prev.filter((q) => q.id !== assigning.id))
      setAssigning(null)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-800 mb-4">Unscheduled Quotes</h2>

      {quotes.length === 0 && (
        <p className="text-sm text-slate-500">No unscheduled quotes.</p>
      )}

      <ul className="space-y-2">
        {quotes.map((quote) => (
          <li key={quote.id} className="bg-white border border-slate-200 rounded p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{quote.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">Customer: {quote.customer_name}</p>
              </div>
              <button
                onClick={() => openForm(quote)}
                className="shrink-0 text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700"
              >
                Assign
              </button>
            </div>

            {assigning?.id === quote.id && (
              <form onSubmit={handleAssign} className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Technician</label>
                  <select
                    required
                    value={form.technician_id}
                    onChange={(e) => setForm((f) => ({ ...f, technician_id: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
                  >
                    <option value="" disabled>Select technician...</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Date</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Time slot (2 hours)</label>
                  <select
                    required
                    value={form.hour}
                    onChange={(e) => setForm((f) => ({ ...f, hour: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
                  >
                    <option value="" disabled>Select a time slot...</option>
                    {timeSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssigning(null)}
                    className="text-xs text-slate-500 px-3 py-1.5 rounded hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
