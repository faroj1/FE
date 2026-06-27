import { useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteNotificationLocal,
  markAllNotificationsReadLocal,
  markNotificationReadLocal,
  subscribeGuruNotifications,
} from '../utils/realtimeNotifications'
import '../styles/notification.css'

const formatNotificationTime = (value) => {
  if (!value) return ''
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (diffSeconds < 60) return 'Baru saja'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} menit yang lalu`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} jam yang lalu`
  if (diffSeconds < 172800) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const getIconStyle = (type) => {
  if (type === 'peserta-submit') {
    return { bgColor: '#eff6ff', iconColor: '#2563eb', kind: 'user' }
  }
  if (type === 'kuis-published') {
    return { bgColor: '#f0fdf4', iconColor: '#16a34a', kind: 'success' }
  }
  return { bgColor: '#f8fafc', iconColor: '#475569', kind: 'info' }
}

function NotificationIcon({ kind }) {
  if (kind === 'user') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }

  if (kind === 'success') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    )
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

const getStatusText = (status) => {
  if (status === 'missing-config') return 'Konfigurasi Pusher belum tersedia.'
  if (status === 'auth-error') return 'Gagal mengakses private channel notifikasi.'
  if (status === 'missing-user') return 'Data guru belum tersedia untuk channel notifikasi.'
  if (status === 'failed' || status === 'unavailable' || status === 'error') return 'Koneksi notifikasi realtime bermasalah.'
  if (status === 'connecting') return 'Menghubungkan realtime...'
  return null
}

export default function NotificationDropdown({ buttonClass }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('idle')
  const [toast, setToast] = useState(null)
  const dropdownRef = useRef(null)
  const toastTimerRef = useRef(null)

  const unreadCount = useMemo(
    () => notifications.filter(item => !item.read).length,
    [notifications]
  )

  useEffect(() => {
    const unsubscribe = subscribeGuruNotifications(({ notifications: nextNotifications, latest, status }) => {
      setConnectionStatus(status)
      setNotifications(nextNotifications)

      if (latest) {
        setToast(latest)
        window.clearTimeout(toastTimerRef.current)
        toastTimerRef.current = window.setTimeout(() => setToast(null), 4500)
      }
    })

    return () => {
      unsubscribe()
      window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRead = (item) => {
    if (!item.read) {
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n))
      markNotificationReadLocal(item.id)
    }
  }

  const handleReadAll = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setNotifications(prev => prev.map(item => ({ ...item, read: true })))
    markAllNotificationsReadLocal()
  }

  const handleDelete = (event, item) => {
    event.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== item.id))
    deleteNotificationLocal(item.id)
  }

  const statusText = getStatusText(connectionStatus)

  return (
    <div className="notif-wrapper" ref={dropdownRef}>
      <button
        className={`${buttonClass} notif-bell-btn`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Notifikasi"
        style={{ position: 'relative' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-badge-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {toast && (
        <div className="notif-toast" role="status">
          <div
            className="notif-icon-circle"
            style={{
              backgroundColor: getIconStyle(toast.type).bgColor,
              color: getIconStyle(toast.type).iconColor,
            }}
          >
            <NotificationIcon kind={getIconStyle(toast.type).kind} />
          </div>
          <div className="notif-content">
            <p className="notif-text">{toast.title}</p>
            <span className="notif-time">Baru saja</span>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <h3>Notifikasi</h3>
            <button className="notif-header-action" onClick={handleReadAll} disabled={notifications.length === 0}>
              Tandai dibaca
            </button>
          </div>

          <div className="notif-dropdown-body">
            {notifications.length === 0 ? (
              <div className="notif-state">
                {statusText || 'Belum ada notifikasi realtime pada sesi ini.'}
              </div>
            ) : (
              <>
                {statusText && <div className="notif-state compact">{statusText}</div>}
                {notifications.map((item) => {
                  const iconStyle = getIconStyle(item.type)
                  return (
                    <div
                      className={`notif-item ${!item.read ? 'unread' : ''}`}
                      key={item.id}
                      onClick={() => handleRead(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => event.key === 'Enter' && handleRead(item)}
                    >
                      <div
                        className="notif-icon-circle"
                        style={{ backgroundColor: iconStyle.bgColor, color: iconStyle.iconColor }}
                      >
                        <NotificationIcon kind={iconStyle.kind} />
                      </div>
                      <div className="notif-content">
                        <p className="notif-text">{item.title}</p>
                        <span className="notif-time">{formatNotificationTime(item.time)}</span>
                      </div>
                      <button
                        className="notif-delete-btn"
                        onClick={(event) => handleDelete(event, item)}
                        title="Hapus notifikasi dari sesi ini"
                        aria-label="Hapus notifikasi"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          <div className="notif-dropdown-footer">
            <span className="notif-session-note">Realtime, tidak tersimpan sebagai riwayat.</span>
          </div>
        </div>
      )}
    </div>
  )
}
