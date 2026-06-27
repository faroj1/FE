import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { getApiBase, me } from './api'
import { authHeader, decodeToken, getToken, getUser, saveUser } from './auth'

const EVENT_NAMES = {
  pesertaSubmit: 'peserta.submit',
  kuisPublished: 'kuis.dipublikasikan',
}

let echo = null
let channels = new Map()
let activeGuruIds = []
let status = 'idle'
let notifications = []
const listeners = new Set()

const emit = (latest = null) => {
  const snapshot = {
    latest,
    status,
    notifications: [...notifications],
  }
  listeners.forEach(listener => listener(snapshot))
}

export const getCurrentGuruId = () => {
  return getGuruIdCandidates()[0] || null
}

const addCandidate = (ids, value) => {
  if (value === undefined || value === null || value === '') return
  const normalized = String(value)
  if (!ids.includes(normalized)) ids.push(normalized)
}

const getGuruIdCandidates = (user = getUser()) => {
  const tokenPayload = decodeToken(getToken())
  const ids = []

  addCandidate(ids, user?.guru_id)
  addCandidate(ids, user?.guruId)
  addCandidate(ids, user?.id)
  addCandidate(ids, user?.user_id)
  addCandidate(ids, user?.userId)
  addCandidate(ids, user?.teacher_id)
  addCandidate(ids, user?.teacherId)
  addCandidate(ids, tokenPayload?.guru_id)
  addCandidate(ids, tokenPayload?.guruId)
  addCandidate(ids, tokenPayload?.sub)
  addCandidate(ids, tokenPayload?.id)
  addCandidate(ids, tokenPayload?.user_id)

  return ids
}

const getBroadcastAuthHeaders = () => {
  const token = getToken() || localStorage.getItem('token')
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : authHeader()),
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  }
}

const resolveGuruIds = async (givenGuruId) => {
  if (givenGuruId) return [String(givenGuruId)]

  const localGuruIds = getGuruIdCandidates()
  if (localGuruIds.length > 0) return localGuruIds

  const res = await me()
  if (!res.ok) return []

  const user = res.data?.data || res.data
  if (user) saveUser(user)

  return getGuruIdCandidates(user)
}

const getAuthEndpoint = () => {
  const configured = import.meta.env.VITE_PUSHER_AUTH_ENDPOINT
  if (configured) return configured
  const apiBase = getApiBase()
  return apiBase ? `${apiBase}/api/broadcasting/auth` : '/api/broadcasting/auth'
}

const normalizeEventName = (eventName) => String(eventName || '').replace(/^\\|\./, '').toLowerCase()

const isSupportedEvent = (eventName) => {
  const normalized = normalizeEventName(eventName)
  return (
    normalized.includes(EVENT_NAMES.pesertaSubmit) ||
    normalized.includes(EVENT_NAMES.kuisPublished) ||
    normalized.includes('pesertasubmitkuis') ||
    normalized.includes('kuisdipublikasikan') ||
    (normalized.includes('peserta') && normalized.includes('submit')) ||
    (normalized.includes('kuis') && normalized.includes('publik'))
  )
}

const unwrapPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return {}
  if (payload.data && typeof payload.data === 'object') return unwrapPayload(payload.data)
  if (payload.notification && typeof payload.notification === 'object') return unwrapPayload(payload.notification)
  return payload
}

const getByPath = (source, path) => {
  const parts = path.split('.')
  let current = source
  for (const part of parts) {
    if (!current || current[part] === undefined || current[part] === null) return undefined
    current = current[part]
  }
  return current
}

const getPayloadValue = (payload, keys, fallback = '') => {
  for (const key of keys) {
    const value = key.includes('.') ? getByPath(payload, key) : payload?.[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return fallback
}

const formatScore = (payload) => {
  const score = getPayloadValue(payload, [
    'skor',
    'score',
    'nilai',
    'total_skor',
    'totalSkor',
    'hasil.skor',
    'hasil.total_skor',
    'riwayat.skor',
    'riwayat.total_skor',
  ], null)
  if (score === null) return ''
  return ` dengan skor ${score}`
}

const createNotification = (eventName, payload = {}) => {
  const normalized = normalizeEventName(eventName)
  const eventPayload = unwrapPayload(payload)
  const now = new Date()

  if (
    normalized.includes(EVENT_NAMES.pesertaSubmit) ||
    normalized.includes('pesertasubmitkuis') ||
    (normalized.includes('peserta') && normalized.includes('submit'))
  ) {
    const participant = getPayloadValue(eventPayload, [
      'nama_peserta',
      'namaPeserta',
      'peserta',
      'nama',
      'student_name',
      'riwayat.nama_peserta',
      'peserta.nama',
      'peserta.name',
    ], 'Peserta')
    const quizTitle = getPayloadValue(eventPayload, [
      'judul_kuis',
      'judulKuis',
      'kuis_judul',
      'quiz_title',
      'judul',
      'kuis.judul',
      'kuis.title',
      'quiz.judul',
      'quiz.title',
    ], 'kuis')
    return {
      id: `${Date.now()}-${Math.random()}`,
      type: 'peserta-submit',
      title: `${participant} baru saja menyelesaikan ${quizTitle}${formatScore(eventPayload)}.`,
      time: now.toISOString(),
      read: false,
      payload: eventPayload,
    }
  }

  const quizTitle = getPayloadValue(eventPayload, [
    'judul_kuis',
    'judulKuis',
    'kuis_judul',
    'quiz_title',
    'judul',
    'kuis.judul',
    'kuis.title',
  ], 'Kuis')
  const code = getPayloadValue(eventPayload, ['kode_kuis', 'kodeKuis', 'kode', 'code', 'kuis.kode_kuis'], '')
  return {
    id: `${Date.now()}-${Math.random()}`,
    type: 'kuis-published',
    title: `${quizTitle} berhasil dipublikasikan${code ? ` dengan kode ${code}` : ''}.`,
    time: now.toISOString(),
    read: false,
    payload: eventPayload,
  }
}

const handleRealtimeEvent = (eventName, payload) => {
  console.log('[RealtimeNotification] event:', eventName, payload)
  if (!isSupportedEvent(eventName)) return
  const notification = createNotification(eventName, payload)
  const signature = `${notification.type}:${notification.title}`
  const isDuplicate = notifications.some(item =>
    `${item.type}:${item.title}` === signature &&
    Date.now() - new Date(item.time).getTime() < 5000
  )
  if (isDuplicate) return

  notifications = [notification, ...notifications].slice(0, 30)
  emit(notification)
}

const bindConnectionStatus = (pusher) => {
  pusher.connection.bind('connected', () => {
    status = 'connected'
    emit()
  })
  pusher.connection.bind('connecting', () => {
    status = 'connecting'
    emit()
  })
  pusher.connection.bind('unavailable', () => {
    status = 'unavailable'
    emit()
  })
  pusher.connection.bind('failed', () => {
    status = 'failed'
    emit()
  })
  pusher.connection.bind('error', (error) => {
    status = 'error'
    console.error('[RealtimeNotification] connection error:', error)
    emit()
  })
}

const makeEcho = () => {
  const key = import.meta.env.VITE_PUSHER_APP_KEY || import.meta.env.VITE_PUSHER_KEY
  const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || import.meta.env.VITE_PUSHER_CLUSTER || 'mt1'

  if (!key) {
    status = 'missing-config'
    console.warn('[RealtimeNotification] VITE_PUSHER_APP_KEY belum diset di .env')
    emit()
    return null
  }

  window.Pusher = Pusher

  const instance = new Echo({
    broadcaster: 'pusher',
    key,
    cluster,
    forceTLS: true,
    authEndpoint: getAuthEndpoint(),
    auth: {
      headers: getBroadcastAuthHeaders(),
    },
  })

  window.Echo = instance
  bindConnectionStatus(instance.connector.pusher)
  return instance
}

const attachChannelListeners = (guruId) => {
  const nextChannel = echo.private(`guru.${guruId}`)
    // broadcastAs(): 'peserta.submit' / 'kuis.dipublikasikan'
    .listen(`.${EVENT_NAMES.pesertaSubmit}`, payload => handleRealtimeEvent(EVENT_NAMES.pesertaSubmit, payload))
    .listen(`.${EVENT_NAMES.kuisPublished}`, payload => handleRealtimeEvent(EVENT_NAMES.kuisPublished, payload))
    // Class event names, if backend does not use broadcastAs().
    .listen('PesertaSubmitKuis', payload => handleRealtimeEvent('PesertaSubmitKuis', payload))
    .listen('KuisDipublikasikan', payload => handleRealtimeEvent('KuisDipublikasikan', payload))
    // Exact aliases, if backend uses broadcastAs() with PascalCase.
    .listen('.PesertaSubmitKuis', payload => handleRealtimeEvent('PesertaSubmitKuis', payload))
    .listen('.KuisDipublikasikan', payload => handleRealtimeEvent('KuisDipublikasikan', payload))

  nextChannel.subscription?.bind_global?.((eventName, payload) => {
    handleRealtimeEvent(eventName, payload)
  })

  nextChannel.subscribed(() => {
    status = 'connected'
    emit()
  })

  nextChannel.error((error) => {
    status = 'auth-error'
    console.error(`[RealtimeNotification] subscription auth failed for private-guru.${guruId}`, error)
    emit()
  })

  return nextChannel
}

const ensureSubscribed = async (requestedGuruId) => {
  const guruIds = await resolveGuruIds(requestedGuruId)

  if (guruIds.length === 0) {
    status = 'missing-user'
    console.warn('[RealtimeNotification] Guru ID tidak ditemukan. Pastikan /api/me mengembalikan id/guru_id.')
    emit()
    return
  }

  if (!echo) echo = makeEcho()
  if (!echo) return
  echo.options.auth.headers = getBroadcastAuthHeaders()

  const sameChannels =
    activeGuruIds.length === guruIds.length &&
    activeGuruIds.every(id => guruIds.includes(id))
  if (sameChannels) return

  for (const existingId of activeGuruIds) {
    if (!guruIds.includes(existingId)) {
      echo.leave(`guru.${existingId}`)
      channels.delete(existingId)
    }
  }

  activeGuruIds = guruIds
  status = 'connecting'

  for (const guruId of guruIds) {
    if (channels.has(guruId)) continue
    console.log(`[RealtimeNotification] subscribing private-guru.${guruId}`)
    channels.set(guruId, attachChannelListeners(guruId))
  }

  emit()
}

export const subscribeGuruNotifications = (listener, guruId = getCurrentGuruId()) => {
  listeners.add(listener)
  listener({ latest: null, status, notifications: [...notifications] })
  ensureSubscribed(guruId)

  return () => {
    listeners.delete(listener)
  }
}

export const markNotificationReadLocal = (id) => {
  notifications = notifications.map(item => item.id === id ? { ...item, read: true } : item)
  emit()
}

export const markAllNotificationsReadLocal = () => {
  notifications = notifications.map(item => ({ ...item, read: true }))
  emit()
}

export const deleteNotificationLocal = (id) => {
  notifications = notifications.filter(item => item.id !== id)
  emit()
}
