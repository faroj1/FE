import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { getMyQuizzes, getSoalByKuis, updateQuiz, deleteQuiz, updateSoal, deleteSoal, createSoal, logoutApi } from '../utils/api'
import { clearToken, isAuthenticated } from '../utils/auth'
import '../styles/detailkuis.css'

const ANSWER_LETTERS = ['A', 'B', 'C', 'D']

export default function DetailKuis() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isEditMode = searchParams.get('edit') === 'true'

  const [quiz, setQuiz] = useState(location.state?.quiz || null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [openQuestionMenuId, setOpenQuestionMenuId] = useState(null)
  const questionMenuRef = useRef(null)

  // Close question dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (questionMenuRef.current && !questionMenuRef.current.contains(e.target)) {
        setOpenQuestionMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  // Modal state: null | 'editQuiz' | 'deleteQuiz' | 'editSoal' | 'deleteSoal' | 'addSoal'
  const [modalType, setModalType] = useState(null)
  const [activeSoal, setActiveSoal] = useState(null)
  const [modalError, setModalError] = useState(null)

  // Edit Quiz form
  const [quizForm, setQuizForm] = useState({})

  // Edit/Add Soal form
  const [soalForm, setSoalForm] = useState({
    soal_soal: '', jawaban_a: '', jawaban_b: '', jawaban_c: '', jawaban_d: '',
    jawaban_benar: 'A', bobot_poin: 10
  })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  const fetchQuizFromList = useCallback(async () => {
    const listRes = await getMyQuizzes()
    if (listRes.ok) {
      const list = listRes.data?.data || listRes.data || []
      return list.find(q => String(q.kuis_id || q.id) === String(id)) || null
    }
    return null
  }, [id])

  const fetchSoal = useCallback(async () => {
    const soalRes = await getSoalByKuis(id)
    if (soalRes.ok) {
      const data = soalRes.data?.data || soalRes.data || []
      setQuestions(Array.isArray(data) ? data : [])
    } else {
      console.warn('[DetailKuis] soal fetch:', soalRes.status)
    }
  }, [id])

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/login', { replace: true }); return }

    const init = async () => {
      setLoading(true)
      let quizData = quiz
      if (!quizData) {
        quizData = await fetchQuizFromList()
        if (!quizData) { setError('Kuis tidak ditemukan.'); setLoading(false); return }
        setQuiz(quizData)
      }
      await fetchSoal()
      setLoading(false)
    }
    init()
  }, [id, navigate]) // eslint-disable-line

  const handleLogout = async () => { await logoutApi(); clearToken(); navigate('/login') }

  const formatDate = (d) => {
    if (!d) return '-'
    try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  const getStatusClass = (s) => {
    const v = (s || 'draft').toLowerCase()
    if (v === 'active' || v === 'aktif') return 'aktif'
    if (v === 'finished' || v === 'selesai') return 'selesai'
    return 'draft'
  }

  const getStatusLabel = (s) => {
    const v = (s || 'draft').toLowerCase()
    if (v === 'active' || v === 'aktif') return 'AKTIF'
    if (v === 'finished' || v === 'selesai') return 'SELESAI'
    return 'DRAFT'
  }

  // ─── Open Modals ─────────────────────────────────────────────────────
  const openEditQuiz = () => {
    setQuizForm({
      judul: quiz.judul || '',
      kategori: quiz.kategori || '',
      mata_pelajaran: quiz.mata_pelajaran || quiz.kategori || '',
      kelas: quiz.kelas || quiz.target_class || quiz.targetClass || '',
      soal_waktu: quiz.soal_waktu || 30,
      akses: quiz.akses || 'private',
      status: quiz.status || 'draft',
    })
    setModalError(null)
    setModalType('editQuiz')
  }

  const openDeleteQuiz = () => { setModalError(null); setModalType('deleteQuiz') }

  const openEditSoal = (soal) => {
    setActiveSoal(soal)
    setSoalForm({
      soal_soal: soal.soal_soal || soal.pertanyaan || '',
      jawaban_a: soal.jawaban_a || '',
      jawaban_b: soal.jawaban_b || '',
      jawaban_c: soal.jawaban_c || '',
      jawaban_d: soal.jawaban_d || '',
      jawaban_benar: (soal.jawaban_benar || 'A').toUpperCase(),
      bobot_poin: soal.poin !== undefined ? soal.poin : (soal.bobot_poin || 10),
    })
    setModalError(null)
    setModalType('editSoal')
  }

  const openDeleteSoal = (soal) => { setActiveSoal(soal); setModalError(null); setModalType('deleteSoal') }

  const openAddSoal = () => {
    setSoalForm({ soal_soal: '', jawaban_a: '', jawaban_b: '', jawaban_c: '', jawaban_d: '', jawaban_benar: 'A', bobot_poin: 10 })
    setActiveSoal(null)
    setModalError(null)
    setModalType('addSoal')
  }

  const closeModal = () => { setModalType(null); setActiveSoal(null); setModalError(null) }

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleEditQuiz = async (e) => {
    e.preventDefault()
    setSubmitting(true); setModalError(null)
    const payload = {
      judul: quizForm.judul,
      kategori: quizForm.kategori,
      mata_pelajaran: quizForm.mata_pelajaran || quizForm.kategori,
      kelas: quizForm.kelas,
      target_class: quizForm.kelas,
      soal_waktu: Number(quizForm.soal_waktu),
      akses: quizForm.akses,
      status: quizForm.status || 'draft',
    }
    const res = await updateQuiz(quiz.kuis_id || quiz.id, payload)
    setSubmitting(false)
    if (res.ok) {
      setQuiz(prev => ({ ...prev, ...payload }))
      closeModal()
      showToast('Kuis berhasil diperbarui!')
    } else {
      setModalError(res.data?.message || `Gagal memperbarui kuis (${res.status})`)
    }
  }

  const handleDeleteQuiz = async () => {
    setSubmitting(true); setModalError(null)
    const res = await deleteQuiz(quiz.kuis_id || quiz.id)
    setSubmitting(false)
    if (res.ok) {
      showToast('Kuis berhasil dihapus!')
      setTimeout(() => navigate('/kelola-kuis'), 1200)
    } else {
      setModalError(res.data?.message || `Gagal menghapus kuis (${res.status})`)
    }
  }

  const handleSaveSoal = async (e) => {
    e.preventDefault()
    setSubmitting(true); setModalError(null)
    const payload = {
      soal_soal: soalForm.soal_soal,
      jawaban_a: soalForm.jawaban_a,
      jawaban_b: soalForm.jawaban_b,
      jawaban_c: soalForm.jawaban_c,
      jawaban_d: soalForm.jawaban_d,
      jawaban_benar: soalForm.jawaban_benar.toLowerCase(),
      bobot_poin: Number(soalForm.bobot_poin),
      poin: Number(soalForm.bobot_poin),
    }

    let res
    if (modalType === 'addSoal') {
      res = await createSoal({ ...payload, kuis_id: quiz.kuis_id || quiz.id })
    } else {
      res = await updateSoal(activeSoal.id || activeSoal.soal_id, payload)
    }

    setSubmitting(false)
    if (res.ok) {
      closeModal()
      await fetchSoal()
      // Refresh quiz from list to update jumlah_soal count
      const updated = await fetchQuizFromList()
      if (updated) setQuiz(updated)
      showToast(modalType === 'addSoal' ? 'Soal berhasil ditambahkan!' : 'Soal berhasil diperbarui!')
    } else {
      setModalError(res.data?.message || `Gagal menyimpan soal (${res.status})`)
    }
  }

  const handleDeleteSoal = async () => {
    setSubmitting(true); setModalError(null)
    const res = await deleteSoal(activeSoal.id || activeSoal.soal_id)
    setSubmitting(false)
    if (res.ok) {
      closeModal()
      await fetchSoal()
      const updated = await fetchQuizFromList()
      if (updated) setQuiz(updated)
      showToast('Soal berhasil dihapus!')
    } else {
      setModalError(res.data?.message || `Gagal menghapus soal (${res.status})`)
    }
  }

  // ─── Loading / Error states ────────────────────────────────────────
  if (loading) return (
    <div className="dk-root">
      <div className="dk-loading"><div className="dk-spinner"></div>Memuat detail kuis...</div>
    </div>
  )

  if (error || !quiz) return (
    <div className="dk-root">
      <div className="dk-error">
        <div className="dk-error-icon">😢</div>
        <h2>Gagal Memuat Kuis</h2>
        <p>{error || 'Kuis tidak ditemukan.'}</p>
        <button className="dk-btn-back" onClick={() => navigate('/kelola-kuis')}>Kembali ke Kelola Kuis</button>
      </div>
    </div>
  )

  return (
    <div className="dk-root">
      {/* Sidebar */}
      <aside className="dk-sidebar">
        <div>
          <div className="dk-logo" onClick={() => navigate('/')}>KuisKita</div>
          <nav className="dk-nav">
            <button className="dk-nav-item" onClick={() => navigate('/dashboard')}>
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
              </svg>Dashboard
            </button>
            <button className="dk-nav-item active" onClick={() => navigate('/kelola-kuis')}>
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>Kelola Kuis
            </button>
            <button className="dk-nav-item">
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>Profil
            </button>
          </nav>
        </div>
        <div className="dk-sidebar-footer">
          <button className="dk-nav-item">
            <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>Bantuan
          </button>
          <button className="dk-nav-item logout" onClick={handleLogout}>
            <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="dk-main">
        <header className="dk-header-row">
          <button className="dk-icon-btn" aria-label="Notifikasi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <div className="dk-icon-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
        </header>

        <div className="dk-container">
          {/* Breadcrumb */}
          <div className="dk-breadcrumb">
            <a onClick={() => navigate('/kelola-kuis')} style={{ cursor: 'pointer' }}>Kelola Kuis</a>
            <span>›</span><span className="current">Detail Kuis</span>
          </div>

          {/* Title + Actions */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            <div className="dk-title-section" style={{ marginBottom: 0 }}>
              <h1 className="dk-quiz-title">{quiz.judul || quiz.title}</h1>
              <div className="dk-badges">
                <span className={`dk-badge-status ${getStatusClass(quiz.status)}`}>{getStatusLabel(quiz.status)}</span>
                {quiz.kategori && <span className="dk-access" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>{quiz.kategori}</span>}
                {quiz.kode_kuis && <span className="dk-badge-code">{quiz.kode_kuis}</span>}
                <span className="dk-badge-date">Dibuat: {formatDate(quiz.tgl_dibuat || quiz.created_at)}</span>
              </div>
            </div>

            {/* Action buttons */}
            {!isEditMode ? (
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button className="dk-btn-edit-quiz" onClick={() => navigate(`/kelola-kuis/detail/${id}?edit=true`, { state: { quiz } })}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Ubah Kuis & Soal
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button 
                  className="dk-btn-edit-quiz" 
                  style={{ background: '#64748b', borderColor: '#64748b' }} 
                  onClick={() => navigate(`/kelola-kuis/detail/${id}`, { state: { quiz } })}
                >
                  Selesai
                </button>
                <button className="dk-btn-edit-quiz" onClick={openEditQuiz}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Edit Kuis
                </button>
                <button className="dk-btn-delete-quiz" onClick={openDeleteQuiz}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Hapus Kuis
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="dk-stats-row">
            <div className="dk-stat-card">
              <div className="dk-stat-icon blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <div>
                <div className="dk-stat-label">Total Pertanyaan</div>
                <div className="dk-stat-value">{questions.length} <span className="dk-stat-unit">Soal</span></div>
              </div>
            </div>
            <div className="dk-stat-card">
              <div className="dk-stat-icon green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div>
                <div className="dk-stat-label">Durasi Per Soal</div>
                <div className="dk-stat-value">{quiz.soal_waktu || 0} <span className="dk-stat-unit">Menit</span></div>
              </div>
            </div>
          </div>

          {/* Soal Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px' }}>
            <span className="dk-section-title" style={{ borderBottom: '3px solid #2563eb', paddingBottom: '11px', marginBottom: '-14px', display: 'inline-block' }}>
              📘 Daftar Soal Kuis
            </span>
            {isEditMode && (
              <button className="dk-btn-add-soal" onClick={openAddSoal}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tambah Soal
              </button>
            )}
          </div>

          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '18px', border: '1px dashed #cbd5e1', color: '#94a3b8' }}>
              <p style={{ marginBottom: 16 }}>Kuis ini belum memiliki soal.</p>
              {isEditMode && <button className="dk-btn-add-soal" onClick={openAddSoal}>+ Tambah Soal Pertama</button>}
            </div>
          ) : (
            <div className="dk-questions-list">
              {questions.map((q, idx) => (
                <div className="dk-question-card" key={q.id || q.soal_id || idx}>
                  <div className="dk-question-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="dk-question-num">{idx + 1}</span>
                      <span className="dk-question-poin">{q.poin !== undefined ? q.poin : (q.bobot_poin || 10)} Poin</span>
                    </div>
                    {/* Soal action menu (only in edit mode) */}
                    {isEditMode && (
                      <div 
                        style={{ position: 'relative' }} 
                        ref={openQuestionMenuId === (q.id || q.soal_id) ? questionMenuRef : null}
                      >
                        <button 
                          type="button"
                          className="dk-more-btn" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setOpenQuestionMenuId(openQuestionMenuId === (q.id || q.soal_id) ? null : (q.id || q.soal_id)); 
                          }}
                          title="Menu aksi soal"
                        >
                          ⋮
                        </button>
                        {openQuestionMenuId === (q.id || q.soal_id) && (
                          <div className="dk-dropdown">
                            <button 
                              type="button" 
                              className="dk-dropdown-item" 
                              onClick={() => { setOpenQuestionMenuId(null); openEditSoal(q); }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                              Edit Soal
                            </button>
                            <button 
                              type="button" 
                              className="dk-dropdown-item danger" 
                              onClick={() => { setOpenQuestionMenuId(null); openDeleteSoal(q); }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Hapus Soal
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="dk-question-text">{q.soal_soal || q.pertanyaan}</div>

                  <div className="dk-answers">
                    {ANSWER_LETTERS.map(letter => {
                      const key = `jawaban_${letter.toLowerCase()}`
                      const text = q[key] || ''
                      if (!text) return null
                      const isCorrect = (q.jawaban_benar || '').toUpperCase() === letter
                      return (
                        <div className={`dk-answer-option ${isCorrect ? 'correct' : ''}`} key={letter}>
                          <span className="dk-answer-letter">{letter}</span>
                          <span className="dk-answer-text">{text}</span>
                          {isCorrect && (
                            <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="dk-footer">© 2026 KuisKita. Dibuat dengan kegembiraan.</div>
        </div>
      </main>

      {/* ─── Modals ─────────────────────────────────────────────── */}
      {modalType && (
        <div className="dk-modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="dk-modal">

            {/* Edit Quiz Modal */}
            {modalType === 'editQuiz' && (
              <form onSubmit={handleEditQuiz}>
                <h2 className="dk-modal-title">✏️ Edit Informasi Kuis</h2>
                {modalError && <div className="dk-modal-error">{modalError}</div>}
                <div className="dk-form-group">
                  <label>Judul Kuis</label>
                  <input type="text" required value={quizForm.judul} onChange={e => setQuizForm(p => ({ ...p, judul: e.target.value }))} placeholder="Judul kuis..." />
                </div>
                <div className="dk-form-row">
                  <div className="dk-form-group">
                    <label>Kategori</label>
                    <select value={quizForm.kategori} onChange={e => setQuizForm(p => ({ ...p, kategori: e.target.value, mata_pelajaran: e.target.value }))} required>
                      <option value="">Pilih Kategori</option>
                      <option>Matematika</option><option>IPA / Sains</option><option>IPS / Sejarah</option>
                      <option>Bahasa Indonesia</option><option>Bahasa Inggris</option><option>Fisika</option>
                      <option>Kimia</option><option>Biologi</option><option>Geografi</option><option>Lainnya</option>
                    </select>
                  </div>
                  <div className="dk-form-group">
                    <label>Kelas</label>
                    <input type="text" value={quizForm.kelas} onChange={e => setQuizForm(p => ({ ...p, kelas: e.target.value }))} placeholder="X, XI, XII..." />
                  </div>
                </div>
                <div className="dk-form-row">
                  <div className="dk-form-group">
                    <label>Durasi Per Soal (Menit)</label>
                    <input type="number" min="1" required value={quizForm.soal_waktu} onChange={e => setQuizForm(p => ({ ...p, soal_waktu: parseInt(e.target.value) || 1 }))} />
                  </div>
                  <div className="dk-form-group">
                    <label>Akses</label>
                    <select value={quizForm.akses} onChange={e => setQuizForm(p => ({ ...p, akses: e.target.value }))}>
                      <option value="private">Private</option>
                      <option value="publik">Publik</option>
                    </select>
                  </div>
                </div>
                <div className="dk-form-row">
                  <div className="dk-form-group">
                    <label>Status</label>
                    <select value={quizForm.status} onChange={e => setQuizForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="draft">Draft</option>
                      <option value="aktif">Aktif</option>
                      <option value="selesai">Selesai</option>
                    </select>
                  </div>
                </div>
                <div className="dk-modal-actions">
                  <button type="button" className="dk-btn-cancel" onClick={closeModal} disabled={submitting}>Batal</button>
                  <button type="submit" className="dk-btn-save" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                </div>
              </form>
            )}

            {/* Delete Quiz Modal */}
            {modalType === 'deleteQuiz' && (
              <>
                <div className="dk-modal-icon-danger">🗑️</div>
                <h2 className="dk-modal-title">Hapus Kuis</h2>
                <p className="dk-modal-sub">Apakah Anda yakin ingin menghapus kuis <strong>"{quiz.judul}"</strong>? Semua soal dan data kuis akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.</p>
                {modalError && <div className="dk-modal-error">{modalError}</div>}
                <div className="dk-modal-actions">
                  <button className="dk-btn-cancel" onClick={closeModal} disabled={submitting}>Batal</button>
                  <button className="dk-btn-danger" onClick={handleDeleteQuiz} disabled={submitting}>{submitting ? 'Menghapus...' : 'Ya, Hapus Kuis'}</button>
                </div>
              </>
            )}

            {/* Add / Edit Soal Modal */}
            {(modalType === 'addSoal' || modalType === 'editSoal') && (
              <form onSubmit={handleSaveSoal}>
                <h2 className="dk-modal-title">{modalType === 'addSoal' ? '➕ Tambah Soal Baru' : '✏️ Edit Soal'}</h2>
                {modalError && <div className="dk-modal-error">{modalError}</div>}

                <div className="dk-form-group">
                  <label>Pertanyaan</label>
                  <textarea required rows={3} value={soalForm.soal_soal} onChange={e => setSoalForm(p => ({ ...p, soal_soal: e.target.value }))} placeholder="Tuliskan pertanyaan..." />
                </div>

                {ANSWER_LETTERS.map(letter => (
                  <div className="dk-form-group" key={letter}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
                        background: soalForm.jawaban_benar === letter ? '#16a34a' : '#eff6ff',
                        color: soalForm.jawaban_benar === letter ? '#fff' : '#2563eb'
                      }}>{letter}</span>
                      Pilihan {letter}
                      {soalForm.jawaban_benar === letter && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Benar</span>}
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text" required style={{ flex: 1 }}
                        value={soalForm[`jawaban_${letter.toLowerCase()}`]}
                        onChange={e => setSoalForm(p => ({ ...p, [`jawaban_${letter.toLowerCase()}`]: e.target.value }))}
                        placeholder={`Jawaban ${letter}...`}
                      />
                      <button type="button" className={`dk-btn-correct ${soalForm.jawaban_benar === letter ? 'active' : ''}`}
                        onClick={() => setSoalForm(p => ({ ...p, jawaban_benar: letter }))}>
                        {soalForm.jawaban_benar === letter ? '✓ Benar' : 'Tandai Benar'}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="dk-form-group">
                  <label>Bobot Poin</label>
                  <input type="number" min="1" max="100" value={soalForm.bobot_poin} onChange={e => setSoalForm(p => ({ ...p, bobot_poin: parseInt(e.target.value) || 10 }))} />
                </div>

                <div className="dk-modal-actions">
                  <button type="button" className="dk-btn-cancel" onClick={closeModal} disabled={submitting}>Batal</button>
                  <button type="submit" className="dk-btn-save" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan Soal'}</button>
                </div>
              </form>
            )}

            {/* Delete Soal Modal */}
            {modalType === 'deleteSoal' && (
              <>
                <div className="dk-modal-icon-danger">🗑️</div>
                <h2 className="dk-modal-title">Hapus Soal</h2>
                <p className="dk-modal-sub">Apakah Anda yakin ingin menghapus soal ini? Tindakan ini tidak dapat dibatalkan.</p>
                <div className="dk-modal-soal-preview">"{activeSoal?.soal_soal || activeSoal?.pertanyaan}"</div>
                {modalError && <div className="dk-modal-error">{modalError}</div>}
                <div className="dk-modal-actions">
                  <button className="dk-btn-cancel" onClick={closeModal} disabled={submitting}>Batal</button>
                  <button className="dk-btn-danger" onClick={handleDeleteSoal} disabled={submitting}>{submitting ? 'Menghapus...' : 'Ya, Hapus'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className={`dk-toast ${toast.type}`}>
          <div className="dk-toast-content">
            {toast.type === 'success'
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            }
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}
