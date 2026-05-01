import { useState, useEffect } from 'react'
import { api, saveUserId } from './api'
import { ManagerView } from './components/ManagerView'
import { TechnicianView } from './components/TechnicianView'
import { Notifications } from './components/Notifications'

function App() {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    api.get('/users').then(setUsers)
  }, [])

  function handleSelect(e) {
    const user = users.find((u) => u.id === Number(e.target.value))
    if (!user) return
    saveUserId(user.id)
    setCurrentUser(user)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Service Scheduler</h1>

        {currentUser && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5">
            <span className="text-base font-semibold text-slate-800">{currentUser.name}</span>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              currentUser.role === 'manager'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {currentUser.role}
            </span>
          </div>
        )}

        <select
          onChange={handleSelect}
          defaultValue=""
          className="border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-700 bg-white"
        >
          <option value="" disabled>Select user...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {!currentUser ? (
          <p className="text-slate-500 text-sm">Select a user above to get started.</p>
        ) : (
          <>
            <Notifications user={currentUser} />
            {currentUser.role === 'manager' ? (
              <ManagerView user={currentUser} />
            ) : (
              <TechnicianView user={currentUser} />
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
