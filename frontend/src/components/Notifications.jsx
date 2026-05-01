import { useState, useEffect } from 'react'
import { api } from '../api'

export function Notifications({ user }) {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    api.get(`/notifications?recipient_id=${user.id}`).then(setNotifications)
  }, [user.id])

  if (notifications.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-slate-800 mb-3">Notifications</h2>
      <ul className="space-y-2">
        {notifications.map((n) => (
          <li key={n.id} className="bg-blue-50 border border-blue-100 rounded px-4 py-2.5 flex items-center justify-between">
            <p className="text-sm text-blue-800">
              {n.type === 'job_assigned'
                ? `You have been assigned Job #${n.job_id}`
                : `Job #${n.job_id} has been completed`}
            </p>
            <span className="text-xs text-blue-400 ml-4 shrink-0">
              {new Date(n.sent_time).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
