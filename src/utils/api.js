import { authHeader } from './auth'

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Read the API base URL from environment variables.
// Vite exposes env vars that start with VITE_ on import.meta.env.
let baseUrl = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export const setApiBase = (url) => {
  baseUrl = (url || '').replace(/\/$/, '')
}

export const getApiBase = () => baseUrl

// Helper to convert full ngrok / local image URLs to relative storage paths for proxying
export const getImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  if (url.startsWith('/storage/')) return url
  const storageIndex = url.indexOf('/storage/')
  if (storageIndex !== -1) {
    return url.substring(storageIndex)
  }
  return `/storage/${url}`
}

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

/** GET /api/kuis/publik — public quiz list (no auth required) */
export const getPublicQuizzes = () =>
  fetch(`${baseUrl}/api/kuis/publik`, {
    headers: commonHeaders(),
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/kuis/publik/{id} — public quiz detail and questions (no auth required) */
export const getPublicQuizDetail = (id) =>
  fetch(`${baseUrl}/api/kuis/publik/${id}`, {
    headers: commonHeaders(),
  }).then(handleResponse).catch(handleNetworkError)

/** POST /api/kuis/join — join private quiz via code (no auth required) */
export const joinQuizByCode = (kodeKuis) =>
  fetch(`${baseUrl}/api/kuis/join`, {
    method: 'POST',
    headers: commonHeaders(),
    body: JSON.stringify({ kode_kuis: kodeKuis }),
  }).then(handleResponse).catch(handleNetworkError)


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

/** POST /api/soal — create a question for a quiz
 * Accepts either a plain object (JSON) or FormData (multipart, when gambar_soal is included).
 * When FormData is passed, Content-Type is NOT set manually — browser sets it automatically. */
export const createSoal = (payload) => {
  const isFormData = payload instanceof FormData
  const headers = isFormData
    ? { ...authHeader(), 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    : { ...commonHeaders(), ...authHeader() }
  return fetch(`${baseUrl}/api/soal`, {
    method: 'POST',
    headers,
    body: isFormData ? payload : JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)
}

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

/** GET /api/kuis/{id}/results (legacy, kept for compatibility) */
export const getQuizResults = (id) =>
  fetch(`${baseUrl}/api/kuis/${id}/results`, {
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/kuis/{id}/hasil — quiz results summary: statistik, podium, daftar peserta (teacher, authenticated) */
export const getQuizHasil = (id) =>
  fetch(`${baseUrl}/api/kuis/${id}/hasil`, {
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/kuis/{id}/hasil/{riwayatId} — detail jawaban per soal dari 1 peserta (teacher, authenticated) */
export const getQuizHasilDetail = (id, riwayatId) =>
  fetch(`${baseUrl}/api/kuis/${id}/hasil/${riwayatId}`, {
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** GET /api/kuis/{id}/hasil/export — download CSV hasil semua peserta (teacher, authenticated) */
export const exportQuizHasil = async (id, quizTitle = 'hasil_kuis') => {
  try {
    const res = await fetch(`${baseUrl}/api/kuis/${id}/hasil/export`, {
      headers: {
        ...authHeader(),
        'ngrok-skip-browser-warning': 'true',
        'Accept': 'text/csv,application/csv,*/*',
      },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      let msg = ''
      try { msg = JSON.parse(text)?.message } catch { msg = text }
      return { ok: false, status: res.status, message: msg || `Export gagal (${res.status})` }
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${quizTitle.replace(/[^a-z0-9]/gi, '_')}_export.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return { ok: true }
  } catch (err) {
    console.error('[API exportQuizHasil]', err)
    return { ok: false, status: 0, message: 'Koneksi gagal' }
  }
}

/** POST /api/kuis/{id}/submit — submit student answers (no auth required) */
export const submitQuiz = (id, payload) =>
  fetch(`${baseUrl}/api/kuis/${id}/submit`, {
    method: 'POST',
    headers: commonHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

/** POST /api/kuis/{id}/publish — publish a quiz */
export const publishQuiz = (id) =>
  fetch(`${baseUrl}/api/kuis/${id}/publish`, {
    method: 'POST',
    headers: { ...commonHeaders(), ...authHeader() },
    body: JSON.stringify({}),
  }).then(handleResponse).catch(handleNetworkError)

/** POST /api/kuis/import-excel — import quiz from Excel file */
export const importQuizExcel = (formData) => {
  const headers = {
    ...authHeader(),
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  }
  return fetch(`${baseUrl}/api/kuis/import-excel`, {
    method: 'POST',
    headers,
    body: formData,
  }).then(handleResponse).catch(handleNetworkError)
}

/** GET /api/kuis/{id}/soal — get questions for a quiz */
export const getSoalByKuis = (id) =>
  fetch(`${baseUrl}/api/kuis/${id}/soal`, {
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** PUT /api/soal/{id} — update a question
 * Accepts either a plain object (JSON) or FormData (multipart, when gambar_soal is included).
 * For FormData: uses POST + _method=PUT method spoofing (Laravel doesn't support PUT multipart).
 * For plain objects: uses standard PUT with JSON. */
export const updateSoal = (id, payload) => {
  const isFormData = payload instanceof FormData
  if (isFormData) {
    // Method spoofing required: POST with _method=PUT field
    if (!payload.has('_method')) payload.append('_method', 'PUT')
    return fetch(`${baseUrl}/api/soal/${id}`, {
      method: 'POST',  // Must stay POST — browser sets multipart Content-Type automatically
      headers: { ...authHeader(), 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: payload,
    }).then(handleResponse).catch(handleNetworkError)
  }
  return fetch(`${baseUrl}/api/soal/${id}`, {
    method: 'PUT',
    headers: { ...commonHeaders(), ...authHeader() },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)
}

/** DELETE /api/soal/{id} — delete a question */
export const deleteSoal = (id) =>
  fetch(`${baseUrl}/api/soal/${id}`, {
    method: 'DELETE',
    headers: { ...commonHeaders(), ...authHeader() },
  }).then(handleResponse).catch(handleNetworkError)

/** PUT /api/profile with fallback to PUT /api/me */
export const updateProfile = async (payload) => {
  let res = await fetch(`${baseUrl}/api/profile`, {
    method: 'PUT',
    headers: { ...commonHeaders(), ...authHeader() },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

  if (!res.ok && res.status === 404) {
    console.log('[API] PUT /api/profile got 404, falling back to PUT /api/me')
    res = await fetch(`${baseUrl}/api/me`, {
      method: 'PUT',
      headers: { ...commonHeaders(), ...authHeader() },
      body: JSON.stringify(payload),
    }).then(handleResponse).catch(handleNetworkError)
  }
  return res
}

/** PUT /api/change-password with fallback to PUT /api/user/password */
export const updatePassword = async (payload) => {
  let res = await fetch(`${baseUrl}/api/change-password`, {
    method: 'PUT',
    headers: { ...commonHeaders(), ...authHeader() },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)

  if (!res.ok && res.status === 404) {
    console.log('[API] PUT /api/change-password got 404, falling back to PUT /api/user/password')
    res = await fetch(`${baseUrl}/api/user/password`, {
      method: 'PUT',
      headers: { ...commonHeaders(), ...authHeader() },
      body: JSON.stringify(payload),
    }).then(handleResponse).catch(handleNetworkError)
  }

  if (!res.ok && res.status === 404) {
    console.log('[API] PUT /api/user/password got 404, falling back to POST /api/change-password')
    res = await fetch(`${baseUrl}/api/change-password`, {
      method: 'POST',
      headers: { ...commonHeaders(), ...authHeader() },
      body: JSON.stringify(payload),
    }).then(handleResponse).catch(handleNetworkError)
  }
  return res
}

/** POST /api/profile/avatar — upload user profile avatar */
export const uploadAvatar = async (formData) => {
  const headers = {
    ...authHeader(),
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  }
  let res = await fetch(`${baseUrl}/api/profile/avatar`, {
    method: 'POST',
    headers,
    body: formData,
  }).then(handleResponse).catch(handleNetworkError)

  if (!res.ok && res.status === 404) {
    console.log('[API] POST /api/profile/avatar got 404, falling back to POST /api/user/avatar')
    res = await fetch(`${baseUrl}/api/user/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(handleResponse).catch(handleNetworkError)
  }
  return res
}

