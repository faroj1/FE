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

export const login = (payload) => {
  return fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)
}

export const register = (payload) => {
  return fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse).catch(handleNetworkError)
}

export const me = () => {
  const token = localStorage.getItem('token')
  return fetch(`${baseUrl}/api/me`, {
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '' 
    },
  }).then(handleResponse).catch(handleNetworkError)
}

export const getQuizzes = () => {
  const token = localStorage.getItem('token')
  return fetch(`${baseUrl}/api/quizzes`, {
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
  }).then(handleResponse).catch(handleNetworkError)
}

