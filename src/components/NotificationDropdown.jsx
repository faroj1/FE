import { useState, useEffect, useRef } from 'react'
import '../styles/notification.css'

export default function NotificationDropdown({ buttonClass }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(true)
  const dropdownRef = useRef(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      // Clear unread badge when opened
      setHasUnread(false)
    }
  }

  const notifications = [
    {
      id: 1,
      type: 'user',
      title: '10 Siswa baru saja menyelesaikan kuis Biologi Dasar',
      time: '2 menit yang lalu',
      bgColor: '#eff6ff',
      iconColor: '#2563eb',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      id: 2,
      type: 'warning',
      title: 'Kuis Matematika Aljabar telah mencapai batas waktu',
      time: '1 jam yang lalu',
      bgColor: '#fef2f2',
      iconColor: '#ef4444',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )
    },
    {
      id: 3,
      type: 'info',
      title: 'Pembaruan sistem: Fitur impor Excel kini lebih stabil',
      time: 'Kemarin',
      bgColor: '#f0fdf4',
      iconColor: '#16a34a',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
    }
  ]

  return (
    <div className="notif-wrapper" ref={dropdownRef}>
      <button 
        className={`${buttonClass} notif-bell-btn`} 
        onClick={handleToggle}
        aria-label="Notifikasi"
        style={{ position: 'relative' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasUnread && <span className="notif-badge-dot" />}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <h3>Notifikasi</h3>
          </div>
          <div className="notif-dropdown-body">
            {notifications.map((item) => (
              <div className="notif-item" key={item.id}>
                <div 
                  className="notif-icon-circle"
                  style={{ backgroundColor: item.bgColor, color: item.iconColor }}
                >
                  {item.icon}
                </div>
                <div className="notif-content">
                  <p className="notif-text">{item.title}</p>
                  <span className="notif-time">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="notif-dropdown-footer">
            <button 
              className="notif-see-all-btn"
              onClick={() => {
                setIsOpen(false)
                alert('Semua notifikasi telah ditandai sebagai dibaca.')
              }}
            >
              Lihat Semua
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
