import { authHeader } from './auth'

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Read the API base URL from environment variables.
// Vite exposes env vars that start with VITE_ on import.meta.env.
let baseUrl = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export const setApiBase = (url) => {
  baseUrl = (url || '').replace(/\/$/, '')
}

export const getApiBase = () => baseUrl

// ─── Common Headers ───────────────────────────────────────────────────────────
// Always include ngrok-skip-browser-warning so ngrok free tier does not return
// its HTML interstitial page instead of JSON.
const commonHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'ngrok-skip-browser-warning': 'true',
})

// ─── Response Handling ────────────────────────────────────────────────────────
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

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** POST /api/login */
export const login = (payload) =>
  fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: commonHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

/** POST /api/register */
export const register = (payload) =>
  fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    headers: commonHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/me */
export const me = () =>
  fetch(`${baseUrl}/api/me`, {
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** POST /api/logout */
export const logoutApi = () =>
  fetch(`${baseUrl}/api/logout`, {
    method: 'POST',
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

// ─── Kuis (Quiz) ──────────────────────────────────────────────────────────────

/** GET /api/kuis — public quiz list */
export const getQuizzes = () =>
  fetch(`${baseUrl}/api/kuis`, {
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/kuis — teacher's own quizzes (same endpoint, filtered by auth) */
export const getMyQuizzes = () =>
  fetch(`${baseUrl}/api/kuis`, {
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/kuis/{id} */
export const getQuizDetail = (id) =>
  fetch(`${baseUrl}/api/kuis/${id}`, {
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** POST /api/kuis — create new quiz */
export const createQuiz = (payload) =>
  fetch(`${baseUrl}/api/kuis`, {
    method: 'POST',
    headers: { ...commonHeaders(), ...authHeader() },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

/** POST /api/soal — create a question for a quiz */
export const createSoal = (payload) =>
  fetch(`${baseUrl}/api/soal`, {
    method: 'POST',
    headers: { ...commonHeaders(), ...authHeader() },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

/** PUT /api/kuis/{id} — update quiz */
export const updateQuiz = (id, payload) =>
  fetch(`${baseUrl}/api/kuis/${id}`, {
    method: 'PUT',
    headers: { ...commonHeaders(), ...authHeader() },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

/** DELETE /api/kuis/{id} */
export const deleteQuiz = (id) =>
  fetch(`${baseUrl}/api/kuis/${id}`, {
    method: 'DELETE',
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/kuis/{id}/results */
export const getQuizResults = (id) =>
  fetch(`${baseUrl}/api/kuis/${id}/results`, {
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** POST /api/kuis/{id}/publish — publish a quiz */
export const publishQuiz = (id) =>
  fetch(`${baseUrl}/api/kuis/${id}/publish`, {
    method: 'POST',
    headers: { ...commonHeaders(), ...authHeader() },
    body: JSON.stringify({}),
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/kuis/{id}/soal — get questions for a quiz */
export const getSoalByKuis = (id) =>
  fetch(`${baseUrl}/api/kuis/${id}/soal`, {
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** PUT /api/soal/{id} — update a question */
export const updateSoal = (id, payload) =>
  fetch(`${baseUrl}/api/soal/${id}`, {
    method: 'PUT',
    headers: { ...commonHeaders(), ...authHeader() },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

/** DELETE /api/soal/{id} — delete a question */
export const deleteSoal = (id) =>
  fetch(`${baseUrl}/api/soal/${id}`, {
    method: 'DELETE',
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)
