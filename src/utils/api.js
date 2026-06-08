// Base URL: empty string = use Vite proxy (recommended in dev)
// Prefer explicit env `VITE_API_BASE_URL` (or legacy `VITE_API_BASE`).
// If set, frontend will call that host (e.g. http://192.168.1.8:8000).
let baseUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE ?? ''

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

// network error handler defined later (kept below) — placeholder removed to avoid duplicate declaration

const authHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// POST /api/login
export const login = (payload) => {
  const url = baseUrl ? `${baseUrl}/api/login` : '/api/login'
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch((err) => handleNetworkError(err, url))
}

// POST /api/register
export const register = (payload) => {
  const url = baseUrl ? `${baseUrl}/api/register` : '/api/register'
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch((err) => handleNetworkError(err, url))
}

// GET /api/me
export const me = () => {
  const url = baseUrl ? `${baseUrl}/api/me` : '/api/me'
  return fetch(url, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeader() },
  }).then(handleResponse).catch((err) => handleNetworkError(err, url))
}

// GET /api/quizzes
export const getQuizzes = () => {
  const url = baseUrl ? `${baseUrl}/api/quizzes` : '/api/quizzes'
  return fetch(url, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeader() },
  }).then(handleResponse).catch((err) => handleNetworkError(err, url))
}

// Utility: test backend connectivity
// load saved manual apiBase if present
try {
  const saved = localStorage.getItem('apiBase')
  if (saved) baseUrl = saved
} catch (e) {}

export const clearApiBase = () => {
  baseUrl = ''
  try { localStorage.removeItem('apiBase') } catch (e) {}
}

const handleNetworkError = (err, url) => {
  console.error('[API] Network error:', err, 'url=', url)
  const hint = `Periksa backend (${url}), port, CORS, dan firewall. Gunakan VITE_API_BASE_URL or vite proxy.`
  return { ok: false, status: 0, data: { message: `${err?.message || 'Network error'} — ${hint}` } }
}

