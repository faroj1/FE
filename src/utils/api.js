let baseUrl = import.meta.env.VITE_API_BASE || ''

export const setApiBase = (url) => {
  baseUrl = (url || '').replace(/\/$/, '')
}

const handleResponse = async (res) => {
  const text = await res.text().catch(() => '')
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (res.ok) return { ok: true, data }
  return { ok: false, status: res.status, data }
}

const clearAuthStorage = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

const safeFetch = async (url, opts) => {
  try {
    const res = await fetch(url, opts)
    const result = await handleResponse(res)
    if (result.status === 401) {
      clearAuthStorage()
    }
    return result
  } catch (err) {
    return { ok: false, status: 0, data: { message: err.message || 'Network error' } }
  }
}
const defaultHeaders = (hasJson = true) => {
  const h = { Accept: 'application/json' }
  if (hasJson) h['Content-Type'] = 'application/json'
  return h
}

const authHeaders = () => {
  const token = localStorage.getItem('token')
  const h = defaultHeaders(false)
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export const login = (payload) => {
  return safeFetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: defaultHeaders(true),
    body: JSON.stringify(payload),
  })
}

export const register = (payload) => {
  return safeFetch(`${baseUrl}/api/register`, {
    method: 'POST',
    headers: defaultHeaders(true),
    body: JSON.stringify(payload),
  })
}

export const me = () => {
  return safeFetch(`${baseUrl}/api/me`, {
    method: 'GET',
    headers: authHeaders(),
  })
}

export const logout = () => {
  return safeFetch(`${baseUrl}/api/logout`, {
    method: 'POST',
    headers: authHeaders(),
  })
}

export const isAuthenticated = () => !!localStorage.getItem('token')

export const clearAuth = () => clearAuthStorage()

// Auto-detect a reachable base URL from candidates.
export const detectAndSetBase = async (candidates = []) => {
  if (baseUrl) return baseUrl

  if (!candidates || candidates.length === 0) {
    // No hardcoded fallback IPs — configure VITE_API_BASE in .env instead.
    return ''
  }

  const delay = (ms) => new Promise((res) => setTimeout(res, ms))

  const probe = async (url) => {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 3000)
      await fetch(url + '/api', { method: 'GET', mode: 'no-cors', signal: controller.signal })
      clearTimeout(id)
      return true
    } catch {
      return false
    }
  }

  for (const cand of candidates) {
    const ok = await probe(cand)
    if (ok) {
      baseUrl = cand.replace(/\/$/, '')
      return baseUrl
    }
    await delay(200)
  }

  return ''
}
