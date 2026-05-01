const BASE = 'http://localhost:3000'

function getUserId() {
  return localStorage.getItem('userId')
}

export function saveUserId(id) {
  localStorage.setItem('userId', id)
}

async function request(path, options = {}) {
  const userId = getUserId()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
}
