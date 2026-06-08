let baseUrl = ''

export const setApiBase = (url) => {
  baseUrl = (url || '').replace(/\/$/, '')
}

export const getApiBase = () => baseUrl

const handleResponse = async (res) => {
  const text = await res.text().catch(() => '')
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (res.ok) return { ok: true, data }
  return { ok: false, status: res.status, data }
}

export const login = (payload) => {
  return fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse)
}

export const register = (payload) => {
  return fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse)
}

export const me = () => {
  const token = localStorage.getItem('token')
  return fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  }).then(handleResponse)
}

export const getQuizzes = () => {
  return fetch(`${baseUrl}/quizzes`, {
    headers: { 'Content-Type': 'application/json' },
  }).then(handleResponse)
}
