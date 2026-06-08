import { getToken, authHeader } from './auth'

let baseUrl = ''

export const setApiBase = (url) => {
  baseUrl = (url || '').replace(/\/$/, '')
}

export const getApiBase = () => baseUrl

const handleResponse = async (res) => {
  const text = await res.text().catch(() => '')
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (res.ok) return { ok: true, data }
  return { ok: false, status: res.status, data }
}

const handleNetworkError = (err) => {
  console.error('[API Error]', err)
  return { ok: false, status: 0, data: null }
}

/** POST /api/login — returns JWT token in response */
export const login = (payload) => {
  return fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)
}

/** POST /api/register */
export const register = (payload) => {
  return fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)
}

/** GET /api/me — requires JWT Bearer token */
export const me = () => {
  return fetch(`${baseUrl}/api/me`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...authHeader(),
    },
  }).then(handleResponse).catch(handleNetworkError)
}

/** POST /api/logout — invalidates token on server */
export const logoutApi = () => {
  return fetch(`${baseUrl}/api/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...authHeader(),
    },
  }).then(handleResponse).catch(handleNetworkError)
}

/** GET /api/quizzes — requires JWT Bearer token */
export const getQuizzes = () => {
  return fetch(`${baseUrl}/api/quizzes`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...authHeader(),
    },
  }).then(handleResponse).catch(handleNetworkError)
}
