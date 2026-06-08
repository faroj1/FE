import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { me, getQuizzes } from '../utils/api'
import '../styles/dashboard.css'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      const [uRes, qRes] = await Promise.all([me(), getQuizzes()])
      if (!mounted) return
      
      if (uRes.ok) {
        setUser(uRes.data?.data || uRes.data)
      }
      
      if (qRes.ok) {
        const fetched = qRes.data?.data || qRes.data || []
        setQuizzes(fetched)
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  const handleLogout = () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } catch (e) {}
    navigate('/login')
  }

  // Calculate dynamic stats from API
  const totalCount = quizzes.length
  const activeCount = quizzes.filter(q => q.status === 'active' || q.is_active || q.is_active === undefined).length
  const finishedCount = quizzes.filter(q => q.status === 'finished' || q.is_finished || q.completed).length

  // Helper to choose SVG categories
  const renderCategoryIcon = (category = '') => {
    const catLower = category.toLowerCase()
    if (catLower.includes('bio') || catLower.includes('sains') || catLower.includes('ipa')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2v7.31L4.75 19.3a2 2 0 0 0 1.71 2.7h11.08a2 2 0 0 0 1.71-2.7L14 9.3V2" />
          <line x1="8.5" y1="2" x2="15.5" y2="2" />
          <line x1="10" y1="9" x2="14" y2="9" />
        </svg>
      )
    }
    if (catLower.includes('sej') || catLower.includes('sejarah') || catLower.includes('ips')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    }
    if (catLower.includes('mat') || catLower.includes('hitung') || catLower.includes('angka')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="16" y1="14" x2="16" y2="18" />
          <line x1="8" y1="14" x2="12" y2="14" />
          <line x1="8" y1="18" x2="12" y2="18" />
        </svg>
      )
    }
    // general/default fallback
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    )
  }

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Dibuat baru-baru ini'
    try {
      const options = { day: 'numeric', month: 'short', year: 'numeric' }
      return `Dibuat ${new Date(dateStr).toLocaleDateString('id-ID', options)}`
    } catch (e) {
      return `Dibuat ${dateStr}`
    }
  }

  return (
    <div className="dashboard-root">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div>
          <div className="dashboard-logo" onClick={() => navigate('/')}>KuisKita</div>
          <nav className="dashboard-nav">
            <button className="dashboard-nav-item active">
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              Dashboard
            </button>
            <button className="dashboard-nav-item" onClick={() => navigate('/daftar-kuis')}>
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Kelola Kuis
            </button>
            <button className="dashboard-nav-item">
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profil
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="dashboard-nav-item">
            <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Bantuan
          </button>
          <button className="dashboard-nav-item logout" onClick={handleLogout}>
            <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-main">
        {/* Header bell & user profile */}
        <header className="dashboard-header-row">
          <button className="header-icon-btn" aria-label="Notification">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <div className="header-icon-btn" style={{ padding: 0, overflow: 'hidden' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
        </header>

        {/* Dashboard inner content */}
        <div className="dashboard-container">
          {/* Greeting Hero */}
          <section className="dashboard-hero">
            <div className="dashboard-title-section">
              <h1>
                Halo, Selamat Datang <span className="highlight">{user?.name ? `${user.name}!` : 'Kembali!'}</span>
              </h1>
              <p>Berikut adalah ringkasan aktivitas KuisKita Anda hari ini.</p>
            </div>
            <div className="dashboard-actions-group">
              <button className="btn-kelola" onClick={() => navigate('/daftar-kuis')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Kelola Semua Kuis
              </button>
              <button className="btn-buat" onClick={() => alert('Fitur buat kuis baru segera hadir!')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Buat Kuis Baru
              </button>
            </div>
          </section>

          {/* Cards Grid */}
          <section className="cards-grid">
            {/* Card 1: Total Kuis */}
            <div className="stat-card">
              <div className="stat-icon-wrapper blue">
                <svg viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
              </div>
              <span className="stat-label">Total Kuis</span>
              <span className="stat-value">{loading ? '...' : totalCount}</span>
            </div>

            {/* Card 2: Kuis Aktif */}
            <div className="stat-card">
              <div className="stat-icon-wrapper green">
                <svg viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <span className="stat-label">Kuis Aktif</span>
              <span className="stat-value">{loading ? '...' : activeCount}</span>
            </div>

            {/* Card 3: Kuis Selesai */}
            <div className="stat-card">
              <div className="stat-icon-wrapper gray">
                <svg viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <span className="stat-label">Kuis Selesai</span>
              <span className="stat-value">{loading ? '...' : finishedCount}</span>
            </div>
          </section>

          {/* Kuis Terbaru Section */}
          <section className="quiz-list-section">
            <div className="section-header-row">
              <h2>Kuis Terbaru</h2>
              <a href="/daftar-kuis" className="btn-lihat-semua">Lihat Semua</a>
            </div>

            <div className="quiz-list-wrapper">
              {loading && <div style={{ color: '#64748b' }}>Memuat kuis terbaru...</div>}
              {!loading && quizzes.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                  Belum ada kuis yang terdaftar di database.
                </div>
              )}
              {!loading && quizzes.map((q) => {
                const isActive = q.status === 'active' || q.is_active || q.is_active === undefined
                return (
                  <div key={q.id} className="quiz-row-item">
                    <div className="quiz-left-content">
                      <div className="quiz-icon-circle">
                        {renderCategoryIcon(q.category || '')}
                      </div>
                      <div className="quiz-title-meta">
                        <span className="quiz-row-title">{q.title || q.name || q.label}</span>
                        <span className="quiz-row-meta">{formatDate(q.created_at)}</span>
                      </div>
                    </div>
                    <div className={`badge-status ${isActive ? 'active' : 'finished'}`}>
                      {isActive ? 'AKTIF' : 'SELESAI'}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Footer inside content area */}
          <footer className="dashboard-footer-note">
            © 2026 KuisKita. Dibuat dengan kegembiraan.
          </footer>
        </div>
      </main>
    </div>
  )
}

