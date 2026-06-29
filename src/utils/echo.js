import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

let echoInstance = null

export const initializeEcho = () => {
  if (echoInstance) return echoInstance

  window.Pusher = Pusher

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY || '',
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'ap1',
    wsHost: import.meta.env.VITE_PUSHER_WS_HOST,
    wsPort: import.meta.env.VITE_PUSHER_WS_PORT || 6001,
    wssPort: import.meta.env.VITE_PUSHER_WSS_PORT || 443,
    forceTLS: import.meta.env.VITE_PUSHER_FORCE_TLS !== 'false',
    encrypted: true,
    enabledTransports: ['ws', 'wss'],
  })

  return echoInstance
}

export const getEcho = () => {
  if (!echoInstance) {
    return initializeEcho()
  }
  return echoInstance
}

export const listenQuizStart = (quizId, callback) => {
  const echo = getEcho()
  if (!echo) {
    console.warn('[Echo] Echo not initialized')
    return null
  }

  const channel = echo.channel(`kuis.${quizId}`)
  channel.listen('.kuis.dimulai', (data) => {
    console.log('[Echo] Kuis dimulai event received:', data)
    if (callback) callback(data)
  })

  return channel
}

export const listenQuizParticipants = (quizId, callback) => {
  const echo = getEcho()
  if (!echo) {
    console.warn('[Echo] Echo not initialized')
    return null
  }

  const channel = echo.channel(`kuis.${quizId}`)
  const handler = (eventName) => (data) => {
    const payload = { ...(data || {}), __eventName: eventName }
    console.log('[Echo] Peserta lobby event received:', payload)
    if (callback) callback(payload)
  }

  channel
    .listen('.peserta.bergabung', handler('peserta.bergabung'))
    .listen('.peserta.keluar', handler('peserta.keluar'))
    .listen('.peserta.meninggalkan', handler('peserta.meninggalkan'))
    .listen('.peserta.leave', handler('peserta.leave'))
    .listen('.peserta.left', handler('peserta.left'))

  return channel
}

export const listenQuizEnd = (quizId, callback) => {
  const echo = getEcho()
  if (!echo) {
    console.warn('[Echo] Echo not initialized')
    return null
  }

  const channel = echo.channel(`kuis.${quizId}`)
  const handler = (data) => {
    console.log('[Echo] Kuis selesai event received:', data)
    if (callback) callback(data)
  }

  channel
    .listen('.kuis.selesai', handler)
    .listen('.kuis.diakhiri', handler)
    .listen('.kuis.berakhir', handler)

  return channel
}

export const disconnectQuizChannel = (quizId) => {
  const echo = getEcho()
  if (echo) {
    echo.leaveChannel(`kuis.${quizId}`)
  }
}
