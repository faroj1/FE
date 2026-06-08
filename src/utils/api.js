let baseUrl = import.meta.env.VITE_API_BASE || ''

export const setApiBase = (url) => {
  baseUrl = (url || '').replace(/\/$/, '')
}

console.log('API baseUrl =', baseUrl)

const handleResponse = async (res) => {
  let text = ''
  try {
    text = await res.text()
  } catch (err) {
    console.warn('Failed to read response body:', err)
  }
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch (parseErr) {
    console.warn('Response is not JSON, using raw text. Parse error:', parseErr.message)
    data = text
  }
  if (res.ok) return { ok: true, data }
  return { ok: false, status: res.status, data }
}

const safeFetch = async (url, opts) => {
  try {
    const res = await fetch(url, opts)
    return handleResponse(res)
  } catch (err) {
    // network error or CORS error
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

// Auto-detect a reachable base URL from candidates.
export const detectAndSetBase = async (candidates = []) => {
  // if already set via env or manual set, skip
  if (baseUrl) return baseUrl

  // default candidates if none provided
  if (!candidates || candidates.length === 0) {
    candidates = [
      'http://192.168.1.20:8000',
      'http://192.168.1.20:8080',
      'http://192.168.1.20',
    ]
  }

  const timeout = (ms) => new Promise((res) => setTimeout(res, ms))

  const probe = async (url) => {
    try {
      // Use no-cors to only check reachability (may return opaque response)
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 3000)
      await fetch(url + '/api', { method: 'GET', mode: 'no-cors', signal: controller.signal })
      clearTimeout(id)
      return true
    } catch (err) {
      console.debug(`Probe ${url} failed:`, err.message)
      return false
    }
  }

  for (const cand of candidates) {
    // try candidate root quickly
    // if reachable, set and return
    // attempt probe
    const ok = await probe(cand)
    if (ok) {
      baseUrl = cand.replace(/\/$/, '')
      console.log('Detected API baseUrl =', baseUrl)
      return baseUrl
    }
    // short wait before next
    await timeout(200)
  }

  // fallback: leave empty
  console.warn('No reachable API base detected from candidates')
  return ''
}

// VITE_API_BASE="http://192.168.1.20:8000"
