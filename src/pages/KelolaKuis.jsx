import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyQuizzes, createQuiz, updateQuiz, deleteQuiz, logoutApi, publishQuiz, importQuizExcel, getApiBase } from '../utils/api'
import { clearToken, isAuthenticated } from '../utils/auth'
import NotificationDropdown from '../components/NotificationDropdown'
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
  const [formData, setFormData] = useState({ judul: '', kategori: '', mata_pelajaran: '', kelas: '', soal_waktu: 30, akses: 'private' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Import Excel Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const navigate = useNavigate()
  const menuRef = useRef(null)

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' })
    }, 3000)
  }

  const handleCopyCode = (code) => {
    if (!code) {
      showToast('Kuis ini belum memiliki kode. Silakan publikasikan terlebih dahulu.', 'error')
      return
    }
    navigator.clipboard.writeText(code)
      .then(() => {
        showToast(`Kode kuis (${code}) berhasil disalin!`)
      })
      .catch(() => {
        showToast('Gagal menyalin kode kuis.', 'error')
      })
    setOpenMenuId(null)
  }

  const handlePublish = async (id) => {
    setOpenMenuId(null)
    setLoading(true)
    const res = await publishQuiz(id)
    if (res.ok) {
      showToast('Kuis berhasil dipublikasikan!')
      fetchQuizzes()
    } else {
      showToast(res.data?.message || `Gagal mempublikasikan kuis (${res.status})`, 'error')
      setLoading(false)
    }
  }

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

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = async () => {
    setShowLogoutModal(false)
    await logoutApi()
    clearToken()
    navigate('/login')
  }

  const openModal = (mode, quiz = null) => {
    setModalMode(mode)
    setActiveQuiz(quiz)
    setError(null)
    if (mode === 'create') {
      setFormData({ judul: '', kategori: '', mata_pelajaran: '', kelas: '', soal_waktu: 30, akses: 'private' })
    } else if (mode === 'edit' && quiz) {
      setFormData({
        judul: quiz.judul || quiz.title || quiz.name || '',
        kategori: quiz.kategori || quiz.category || '',
        mata_pelajaran: quiz.mata_pelajaran || '',
        kelas: quiz.kelas || quiz.target_class || quiz.targetClass || '',
        soal_waktu: quiz.soal_waktu || quiz.time_limit || 30,
        akses: quiz.akses || quiz.access || 'private',
        status: quiz.status || 'draft'
      })
    }
    setIsModalOpen(true)
    setOpenMenuId(null)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    let res
    if (modalMode === 'create') {
      const payload = {
        judul: formData.judul,
        kategori: formData.kategori,
        mata_pelajaran: formData.mata_pelajaran || formData.kategori,
        kelas: formData.kelas,
        soal_waktu: Number(formData.soal_waktu),
        akses: formData.akses,
        status: 'draft',
      }
      res = await createQuiz(payload)
    } else if (modalMode === 'edit') {
      const payload = {
        judul: formData.judul,
        kategori: formData.kategori,
        mata_pelajaran: formData.mata_pelajaran || formData.kategori,
        kelas: formData.kelas,
        target_class: formData.kelas,
        soal_waktu: Number(formData.soal_waktu),
        akses: formData.akses,
        status: formData.status || 'draft',
      }
      res = await updateQuiz(activeQuiz.kuis_id || activeQuiz.id, payload)
    } else if (modalMode === 'delete') {
      res = await deleteQuiz(activeQuiz.kuis_id || activeQuiz.id)
    }

    setSubmitting(false)

    if (res?.ok) {
      setIsModalOpen(false)
      const msg = modalMode === 'delete'
        ? 'Kuis berhasil dihapus!'
        : modalMode === 'edit'
        ? 'Kuis berhasil diperbarui!'
        : 'Kuis berhasil dibuat!'
      showToast(msg)
      fetchQuizzes()
    } else {
      setError(res?.data?.message || `Gagal memproses permintaan (${res?.status})`)
    }
  }

  const parseImportErrors = (data) => {
    if (!data) return ['Terjadi kesalahan saat mengunggah berkas.']
    if (data.errors) {
      if (Array.isArray(data.errors)) {
        return data.errors
      }
      if (typeof data.errors === 'object') {
        return Object.values(data.errors).flat()
      }
    }
    if (data.message) {
      return [data.message]
    }
    return ['Gagal melakukan import file Excel.']
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const ext = file.name.split('.').pop().toLowerCase()
      if (ext === 'xlsx' || ext === 'xls') {
        setImportFile(file)
        setImportErrors(null)
      } else {
        setImportErrors(['Hanya berkas Excel dengan ekstensi .xlsx atau .xls yang diperbolehkan.'])
      }
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const ext = file.name.split('.').pop().toLowerCase()
      if (ext === 'xlsx' || ext === 'xls') {
        setImportFile(file)
        setImportErrors(null)
      } else {
        setImportErrors(['Hanya berkas Excel dengan ekstensi .xlsx atau .xls yang diperbolehkan.'])
      }
    }
  }

  const handleImportSubmit = async (e) => {
    e.preventDefault()
    if (!importFile) {
      setImportErrors(['Silakan pilih berkas Excel terlebih dahulu.'])
      return
    }

    setImporting(true)
    setImportErrors(null)

    const formData = new FormData()
    formData.append('file', importFile)

    const res = await importQuizExcel(formData)
    setImporting(false)

    if (res.ok) {
      showToast('Kuis berhasil diimport dari Excel!')
      setIsImportModalOpen(false)
      setImportFile(null)
      fetchQuizzes()
    } else {
      const parsedErrors = parseImportErrors(res.data)
      setImportErrors(parsedErrors)
    }
  }

  const filteredQuizzes = quizzes.filter(q => {
    // Tab filter
    const status = (q.status || 'draft').toLowerCase()
    const isActive = status === 'active' || status === 'aktif' || q.is_active
    const isFinished = status === 'finished' || status === 'selesai' || q.is_finished || q.completed
    const isDraft = status === 'draft' || (!isActive && !isFinished)

    if (filter === 'Aktif' && !isActive) return false
    if (filter === 'Draft' && !isDraft) return false
    if (filter === 'Selesai' && !isFinished) return false

    // Search filter
    if (search && !(q.judul || q.title || q.name || '').toLowerCase().includes(search.toLowerCase())) return false

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
    const isActive = status === 'active' || status === 'aktif' || q.is_active
    const isFinished = status === 'finished' || status === 'selesai' || q.is_finished || q.completed
    
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
            <button className="kk-nav-item" onClick={() => navigate('/profil')}>
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Profil
            </button>
          </nav>
        </div>

        <div className="kk-sidebar-footer">
          <button className="kk-nav-item" onClick={() => navigate('/bantuan')}>
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
          <NotificationDropdown buttonClass="kk-icon-btn" />
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
            <div className="kk-page-header-actions">
              <button className="kk-btn-import" onClick={() => { setIsImportModalOpen(true); setImportFile(null); setImportErrors(null); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 12 15 15" />
                </svg>
                Import Excel
              </button>
              <button className="kk-btn-create" onClick={() => navigate('/buat-kuis')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Buat Kuis Baru
              </button>
            </div>
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
                    <tr key={q.kuis_id || q.id}>
                      <td data-label="Judul Kuis">
                        <div className="kk-quiz-title">{q.judul || q.title || q.name}</div>
                        <div className="kk-quiz-meta">
                          {q.jumlah_soal || q.question_count || 0} Pertanyaan • {q.soal_waktu || q.time_limit || 0} Menit
                        </div>
                      </td>
                      <td data-label="Status">{renderStatusBadge(q)}</td>
                      <td data-label="Akses">
                        <span className="kk-access">{q.akses || q.access || 'publik'}</span>
                      </td>
                      <td data-label="Kode">
                        {q.kode_kuis || q.code ? (
                          <span 
                            className="kk-code" 
                            style={{ cursor: 'pointer' }} 
                            onClick={() => handleCopyCode(q.kode_kuis || q.code)}
                            title="Klik untuk menyalin kode kuis"
                          >
                            {q.kode_kuis || q.code}
                          </span>
                        ) : (
                          <span className="kk-code-empty">—</span>
                        )}
                      </td>
                      <td className="kk-date" data-label="Tanggal Dibuat">{formatDate(q.tgl_dibuat || q.created_at)}</td>
                      <td className="kk-action-cell" ref={openMenuId === (q.kuis_id || q.id) ? menuRef : null}>
                        <button className="kk-more-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === (q.kuis_id || q.id) ? null : (q.kuis_id || q.id)) }}>⋮</button>
                        {openMenuId === (q.kuis_id || q.id) && (
                          <div className="kk-dropdown">
                            <button className="kk-dropdown-item" onClick={() => { setOpenMenuId(null); navigate(`/kelola-kuis/detail/${q.kuis_id || q.id}`, { state: { quiz: q } }); }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                              Detail Kuis
                            </button>
                            {!!q.is_published && (
                              <button className="kk-dropdown-item" onClick={() => { setOpenMenuId(null); navigate(`/kelola-kuis/hasil/${q.kuis_id || q.id}`, { state: { quiz: q } }); }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="20" x2="18" y2="10"></line>
                                  <line x1="12" y1="20" x2="12" y2="4"></line>
                                  <line x1="6" y1="20" x2="6" y2="14"></line>
                                </svg>
                                Lihat Hasil
                              </button>
                            )}
                            <button className="kk-dropdown-item" onClick={() => { setOpenMenuId(null); navigate(`/kelola-kuis/detail/${q.kuis_id || q.id}?edit=true`, { state: { quiz: q } }); }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                              </svg>
                              Edit
                            </button>
                            {!q.is_published && (
                              <button className="kk-dropdown-item publish" onClick={() => handlePublish(q.kuis_id || q.id)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 2L11 13"></path>
                                  <path d="M22 2L15 22 11 13 2 9l20-7z"></path>
                                </svg>
                                Publikasikan
                              </button>
                            )}
                            <button className="kk-dropdown-item danger" onClick={() => openModal('delete', q)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
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
          <div className={modalMode === 'delete' ? "global-modal" : "kk-modal"}>
            {modalMode === 'delete' ? (
              <>
                <div className="global-modal-icon danger">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </div>
                <h2>Hapus Kuis</h2>
                <p className="sub" style={{ marginBottom: 20 }}>Apakah Anda yakin ingin menghapus kuis <strong>{activeQuiz?.judul || activeQuiz?.title || activeQuiz?.name}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
                {error && <div className="kk-form-error" style={{ width: '100%' }}>{error}</div>}
                <div className="global-modal-actions">
                  <button className="global-btn-cancel" onClick={() => setIsModalOpen(false)} disabled={submitting}>Batal</button>
                  <button className="global-btn-danger" onClick={handleFormSubmit} disabled={submitting}>
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
                  <input type="text" required placeholder="Contoh: Ujian Tengah Semester..." value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value})} />
                </div>

                <div className="kk-form-row">
                  <div className="kk-form-group">
                    <label>Kategori / Mata Pelajaran</label>
                    <select value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value, mata_pelajaran: e.target.value})} required>
                      <option value="">Pilih Kategori</option>
                      <option>Matematika</option>
                      <option>IPA / Sains</option>
                      <option>IPS / Sejarah</option>
                      <option>Bahasa Indonesia</option>
                      <option>Bahasa Inggris</option>
                      <option>Fisika</option>
                      <option>Kimia</option>
                      <option>Biologi</option>
                      <option>Geografi</option>
                      <option>Lainnya</option>
                    </select>
                  </div>
                  <div className="kk-form-group">
                    <label>Kelas</label>
                    <input type="text" placeholder="Contoh: X, XI, XII" value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})} />
                  </div>
                </div>

                <div className="kk-form-row">
                  <div className="kk-form-group">
                    <label>Batas Waktu Per Soal (Menit)</label>
                    <input type="number" min="1" required value={formData.soal_waktu} onChange={e => setFormData({...formData, soal_waktu: parseInt(e.target.value) || 30})} />
                  </div>
                  <div className="kk-form-group">
                    <label>Akses</label>
                    <select value={formData.akses} onChange={e => setFormData({...formData, akses: e.target.value})}>
                      <option value="private">Private</option>
                      <option value="publik">Publik</option>
                    </select>
                  </div>
                </div>

                {modalMode === 'edit' && (
                  <div className="kk-form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="draft">Draft</option>
                      <option value="aktif">Aktif</option>
                      <option value="selesai">Selesai</option>
                    </select>
                  </div>
                )}

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

      {isImportModalOpen && (
        <div className="kk-modal-overlay">
          <div className="kk-modal kk-import-modal">
            <h2>Import Kuis dari Excel</h2>
            <p className="sub">Buat kuis dan soal sekaligus dengan mengunggah berkas template Excel yang telah diisi.</p>

            <div className="kk-import-steps">
              <div className="kk-import-step">
                <span className="kk-step-num">1</span>
                <div className="kk-step-content">
                  <strong>Unduh Template Excel</strong>
                  <p>Gunakan format template standar agar data terbaca dengan benar oleh sistem.</p>
                  <a 
                    href={`${getApiBase()}/api/kuis/template-excel`} 
                    download="Template_Kuis.xlsx"
                    className="kk-btn-download-template"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Unduh Template Excel
                  </a>
                </div>
              </div>

              <div className="kk-import-step">
                <span className="kk-step-num">2</span>
                <div className="kk-step-content">
                  <strong>Isi Data Kuis & Soal</strong>
                  <p>Lengkapi kolom seperti judul kuis, kategori, pertanyaan, dan pilihan jawaban di Excel.</p>
                </div>
              </div>

              <div className="kk-import-step">
                <span className="kk-step-num">3</span>
                <div className="kk-step-content">
                  <strong>Unggah Berkas Excel</strong>
                  <p>Seret berkas ke area di bawah atau klik untuk mencari berkas dari komputer Anda.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleImportSubmit} onDragEnter={handleDrag}>
              <div 
                className={`kk-import-drag-zone ${dragActive ? 'active' : ''} ${importFile ? 'has-file' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                {!importFile ? (
                  <label className="kk-import-label">
                    <input 
                      type="file" 
                      className="kk-import-input" 
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                    />
                    <div className="kk-import-icon-wrap">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <span className="kk-import-text-main">Pilih berkas Excel (.xlsx, .xls)</span>
                    <span className="kk-import-text-sub">atau seret dan lepas berkas di sini</span>
                  </label>
                ) : (
                  <div className="kk-import-file-details">
                    <svg className="kk-file-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="kk-file-info">
                      <span className="kk-file-name">{importFile.name}</span>
                      <span className="kk-file-size">{(importFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button 
                      type="button" 
                      className="kk-btn-remove-file"
                      onClick={() => setImportFile(null)}
                      disabled={importing}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {importErrors && importErrors.length > 0 && (
                <div className="kk-import-error-box">
                  <div className="kk-import-error-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Gagal Mengimpor Data
                  </div>
                  <div className="kk-import-error-list">
                    {importErrors.map((err, idx) => (
                      <div key={idx} className="kk-import-error-item">{err}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="kk-modal-actions">
                <button 
                  type="button" 
                  className="kk-btn-cancel" 
                  onClick={() => setIsImportModalOpen(false)} 
                  disabled={importing}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="kk-btn-submit kk-btn-import-submit" 
                  disabled={importing || !importFile}
                >
                  {importing ? (
                    <>
                      <div className="kk-spinner-btn"></div>
                      Mengimpor...
                    </>
                  ) : 'Mulai Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {toast.show && (
        <div className={`kk-toast ${toast.type}`}>
          <div className="kk-toast-content">
            {toast.type === 'success' ? (
              <svg className="kk-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg className="kk-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
      {showLogoutModal && (
        <div className="global-modal-overlay">
          <div className="global-modal">
            <div className="global-modal-icon warning">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h2>Konfirmasi Keluar</h2>
            <p className="sub">Apakah Anda yakin ingin keluar dari akun Anda?</p>
            <div className="global-modal-actions">
              <button className="global-btn-cancel" onClick={() => setShowLogoutModal(false)}>Batal</button>
              <button className="global-btn-danger" onClick={confirmLogout}>Keluar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
