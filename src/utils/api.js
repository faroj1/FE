import { authHeader } from './auth'

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

/** POST /api/login */
export const login = (payload) =>
  fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

/** POST /api/register */
export const register = (payload) =>
  fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/me */
export const me = () =>
  fetch(`${baseUrl}/api/me`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** POST /api/logout */
export const logoutApi = () =>
  fetch(`${baseUrl}/api/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/quizzes — public quiz list */
export const getQuizzes = () =>
  fetch(`${baseUrl}/api/quizzes`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

// ─── Kelola Kuis (Teacher Quiz Management) ───────────────────────────────────

/** GET /api/quizzes — teacher's own quizzes (same endpoint, filtered by auth) */
export const getMyQuizzes = () =>
  fetch(`${baseUrl}/api/quizzes`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/quizzes/{id} */
export const getQuizDetail = (id) =>
  fetch(`${baseUrl}/api/quizzes/${id}`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** POST /api/quizzes — create new quiz */
export const createQuiz = (payload) =>
  fetch(`${baseUrl}/api/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeader() },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

/** PUT /api/quizzes/{id} — update quiz */
export const updateQuiz = (id, payload) =>
  fetch(`${baseUrl}/api/quizzes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeader() },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

/** DELETE /api/quizzes/{id} */
export const deleteQuiz = (id) =>
  fetch(`${baseUrl}/api/quizzes/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/quizzes/{id}/results */
export const getQuizResults = (id) =>
  fetch(`${baseUrl}/api/quizzes/${id}/results`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)
