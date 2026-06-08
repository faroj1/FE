import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyQuizzes, createQuiz, updateQuiz, deleteQuiz, logoutApi } from '../utils/api'
import { clearToken, isAuthenticated } from '../utils/auth'
import '../styles/kelolakuis.css'

export default function KelolaKuis() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Semua') // Semua, Aktif, Draft, Selesai
  const [search, setSearch] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit' | 'delete'
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [formData, setFormData] = useState({ title: '', category: '', time_limit: 30, status: 'Draft', access: 'Private' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const navigate = useNavigate()
  const menuRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }
    fetchQuizzes()
  }, [navigate])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchQuizzes = async () => {
    setLoading(true)
    const res = await getMyQuizzes()
    if (res.ok) {
      setQuizzes(res.data?.data || res.data || [])
    } else if (res.status === 401) {
      clearToken()
      navigate('/login')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await logoutApi()
    clearToken()
    navigate('/login')
  }

  const openModal = (mode, quiz = null) => {
    setModalMode(mode)
    setActiveQuiz(quiz)
    setError(null)
    if (mode === 'create') {
      setFormData({ title: '', category: '', time_limit: 30, status: 'Draft', access: 'Private' })
    } else if (mode === 'edit' && quiz) {
      setFormData({
        title: quiz.title || quiz.name || '',
        category: quiz.category || '',
        time_limit: quiz.time_limit || 30,
        status: (quiz.status || 'Draft').charAt(0).toUpperCase() + (quiz.status || 'draft').slice(1),
        access: quiz.access || 'Private'
      })
    }
    setIsModalOpen(true)
    setOpenMenuId(null)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload = { ...formData }
    // Ensure lowercase for API compatibility if needed, but keeping as is for form
    
    let res
    if (modalMode === 'create') {
      res = await createQuiz(payload)
    } else if (modalMode === 'edit') {
      res = await updateQuiz(activeQuiz.id, payload)
    } else if (modalMode === 'delete') {
      res = await deleteQuiz(activeQuiz.id)
    }

    setSubmitting(false)

    if (res.ok) {
      setIsModalOpen(false)
      fetchQuizzes()
    } else {
      setError(res.data?.message || `Gagal memproses permintaan (${res.status})`)
    }
  }

  const filteredQuizzes = quizzes.filter(q => {
    // Tab filter
    const status = (q.status || 'draft').toLowerCase()
    const isActive = status === 'active' || q.is_active
    const isFinished = status === 'finished' || q.is_finished || q.completed
    const isDraft = status === 'draft' || (!isActive && !isFinished)

    if (filter === 'Aktif' && !isActive) return false
    if (filter === 'Draft' && !isDraft) return false
    if (filter === 'Selesai' && !isFinished) return false

    // Search filter
    if (search && !(q.title || q.name || '').toLowerCase().includes(search.toLowerCase())) return false

    return true
  })

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch { return dateStr }
  }

  const renderStatusBadge = (q) => {
    const status = (q.status || 'draft').toLowerCase()
    const isActive = status === 'active' || q.is_active
    const isFinished = status === 'finished' || q.is_finished || q.completed
    
    if (isActive) return <span className="kk-badge aktif">Aktif</span>
    if (isFinished) return <span className="kk-badge selesai">Selesai</span>
    return <span className="kk-badge draft">Draft</span>
  }

  return (
    <div className="kk-root">
      {/* Sidebar */}
      <aside className="kk-sidebar">
        <div>
          <div className="kk-logo" onClick={() => navigate('/')}>KuisKita</div>
          <nav className="kk-nav">
            <button className="kk-nav-item" onClick={() => navigate('/dashboard')}>
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
              </svg>
              Dashboard
            </button>
            <button className="kk-nav-item active">
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Kelola Kuis
            </button>
            <button className="kk-nav-item">
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Profil
            </button>
          </nav>
        </div>

        <div className="kk-sidebar-footer">
          <button className="kk-nav-item">
            <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Bantuan
          </button>
          <button className="kk-nav-item logout" onClick={handleLogout}>
            <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="kk-main">
        <header className="kk-header-row">
          <button className="kk-icon-btn" aria-label="Notifikasi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <div className="kk-icon-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
        </header>

        <div className="kk-container">
          <div className="kk-page-header">
            <div className="kk-page-title">
              <h1>Kelola Kuis</h1>
              <p>Pantau, buat, dan kelola semua kuis Anda dalam satu tempat dengan mudah dan efisien.</p>
            </div>
            <button className="kk-btn-create" onClick={() => openModal('create')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Buat Kuis Baru
            </button>
          </div>

          <div className="kk-toolbar">
            <div className="kk-tabs">
              {['Semua', 'Aktif', 'Draft', 'Selesai'].map(t => (
                <button key={t} className={`kk-tab ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
                  {t}
                </button>
              ))}
            </div>
            <div className="kk-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Cari berdasarkan judul..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="kk-table-wrap">
            <table className="kk-table">
              <thead>
                <tr>
                  <th>Judul Kuis</th>
                  <th>Status</th>
                  <th>Akses</th>
                  <th>Kode</th>
                  <th>Tanggal Dibuat</th>
                  <th style={{ width: 60, textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6">
                      <div className="kk-loading">
                        <div className="kk-spinner"></div>
                        Memuat data kuis...
                      </div>
                    </td>
                  </tr>
                ) : filteredQuizzes.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="kk-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <p>Tidak ada kuis yang ditemukan.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQuizzes.map(q => (
                    <tr key={q.id}>
                      <td>
                        <div className="kk-quiz-title">{q.title || q.name}</div>
                        <div className="kk-quiz-meta">
                          {q.question_count || 0} Pertanyaan • {q.time_limit || 0} Menit
                        </div>
                      </td>
                      <td>{renderStatusBadge(q)}</td>
                      <td>
                        <span className="kk-access">{q.access || 'Public'}</span>
                      </td>
                      <td>
                        {q.code ? <span className="kk-code">{q.code}</span> : <span className="kk-code-empty">—</span>}
                      </td>
                      <td className="kk-date">{formatDate(q.created_at)}</td>
                      <td className="kk-action-cell" ref={openMenuId === q.id ? menuRef : null}>
                        <button className="kk-more-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === q.id ? null : q.id) }}>⋮</button>
                        {openMenuId === q.id && (
                          <div className="kk-dropdown">
                            <button className="kk-dropdown-item" onClick={() => openModal('edit', q)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                              Edit Kuis
                            </button>
                            <button className="kk-dropdown-item" onClick={() => navigate(`/kuis/${q.id}`)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                              Detail Kuis
                            </button>
                            <button className="kk-dropdown-item danger" onClick={() => openModal('delete', q)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                              Hapus
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="kk-footer">
            © 2026 KuisKita. Dibuat dengan kegembiraan.
          </div>
        </div>
      </main>

      {/* Modals */}
      {isModalOpen && (
        <div className="kk-modal-overlay">
          <div className="kk-modal">
            {modalMode === 'delete' ? (
              <>
                <h2>Hapus Kuis</h2>
                <p className="sub">Apakah Anda yakin ingin menghapus kuis <strong>{activeQuiz?.title || activeQuiz?.name}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
                {error && <div className="kk-form-error">{error}</div>}
                <div className="kk-modal-actions">
                  <button className="kk-btn-cancel" onClick={() => setIsModalOpen(false)} disabled={submitting}>Batal</button>
                  <button className="kk-btn-danger" onClick={handleFormSubmit} disabled={submitting}>
                    {submitting ? 'Menghapus...' : 'Ya, Hapus'}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleFormSubmit}>
                <h2>{modalMode === 'create' ? 'Buat Kuis Baru' : 'Edit Kuis'}</h2>
                <p className="sub">Lengkapi informasi di bawah ini untuk kuis Anda.</p>
                
                {error && <div className="kk-form-error">{error}</div>}

                <div className="kk-form-group">
                  <label>Judul Kuis</label>
                  <input type="text" required placeholder="Contoh: Ujian Tengah Semester..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>

                <div className="kk-form-row">
                  <div className="kk-form-group">
                    <label>Kategori</label>
                    <input type="text" placeholder="Contoh: Matematika" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                  </div>
                  <div className="kk-form-group">
                    <label>Batas Waktu (Menit)</label>
                    <input type="number" min="1" required value={formData.time_limit} onChange={e => setFormData({...formData, time_limit: parseInt(e.target.value) || 0})} />
                  </div>
                </div>

                <div className="kk-form-row">
                  <div className="kk-form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Draft">Draft</option>
                      <option value="Aktif">Aktif</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>
                  <div className="kk-form-group">
                    <label>Akses</label>
                    <select value={formData.access} onChange={e => setFormData({...formData, access: e.target.value})}>
                      <option value="Private">Private</option>
                      <option value="Public">Public</option>
                    </select>
                  </div>
                </div>

                <div className="kk-modal-actions">
                  <button type="button" className="kk-btn-cancel" onClick={() => setIsModalOpen(false)} disabled={submitting}>Batal</button>
                  <button type="submit" className="kk-btn-submit" disabled={submitting}>
                    {submitting ? 'Menyimpan...' : 'Simpan Kuis'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
