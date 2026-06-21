import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPublicQuizzes, getApiBase } from '../utils/api'
import '../styles/quizlist.css'

import coverAgama from '../assets/cover_agama.png'
import coverBahasa from '../assets/cover_bahasa.png'
import coverMatematika from '../assets/cover_matematika.png'

// Map category to cover image
const getCoverByCategory = (cat) => {
  const c = (cat || '').toLowerCase()
  if (c.includes('agama')) return coverAgama
  if (c.includes('bahasa')) return coverBahasa
  if (c.includes('matematika') || c.includes('math')) return coverMatematika
  return coverAgama
}

export default function QuizList({ searchTerm }) {
  const [quizzes, setQuizzes] = useState([])
  const [filteredQuizzes, setFilteredQuizzes] = useState([])
  const [activeFilter, setActiveFilter] = useState('Semua')
  const [loading, setLoading] = useState(true)

  // Modal state
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [nama, setNama] = useState('')
  const [namaError, setNamaError] = useState('')

  const navigate = useNavigate()

  // Fetch public quizzes from backend (no auth required)
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        // Try without auth first
        const result = await getPublicQuizzes()
        const rawData = result.data?.data || result.data || []
        const dataArr = Array.isArray(rawData) ? rawData : []

        const apiBase = getApiBase()

        const getFullImageUrl = (img) => {
          if (!img) return null
          if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img
          return apiBase ? `${apiBase}/${img.replace(/^\//, '')}` : img
        }

        // Filter only public quizzes (akses === 'publik')
        const mapped = dataArr
          .filter(item => (item.akses || item.access || '').toLowerCase() === 'publik')
          .map(item => ({
            id: item.kuis_id || item.id,
            kode_kuis: item.kode_kuis || '',
            title: item.judul || item.title || item.name || 'Kuis Tanpa Judul',
            description: item.deskripsi || item.description || 'Uji pengetahuanmu dengan kuis ini!',
            image: getFullImageUrl(item.image || item.cover_image) || getCoverByCategory(item.kategori || item.category),
            questions: (item.jumlah_soal || item.questions_count || item.questions) ?? 0,
            timeLimit: `${item.soal_waktu || item.time_limit || 15} Menit`,
            targetClass: item.kelas || item.targetClass || item.target_class || 'Umum',
            category: item.kategori || item.category || 'Umum',
            status: item.status || 'Draft',
          }))

        setQuizzes(mapped)
        setFilteredQuizzes(mapped)
      } catch (error) {
        console.error('Error fetching quizzes:', error)
        setQuizzes([])
        setFilteredQuizzes([])
      } finally {
        setLoading(false)
      }
    }

    fetchQuizzes()
  }, [])

  // Filter quizzes by category and search term
  useEffect(() => {
    let filtered = quizzes

    if (activeFilter !== 'Semua') {
      filtered = filtered.filter(quiz => (quiz.category || '').toLowerCase().includes(activeFilter.toLowerCase()))
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(quiz =>
        (quiz.title || '').toLowerCase().includes(searchLower) ||
        (quiz.description || '').toLowerCase().includes(searchLower)
      )
    }

    setFilteredQuizzes(filtered)
  }, [activeFilter, searchTerm, quizzes])

  // Open modal for a selected quiz
  const openModal = (quiz) => {
    // Pre-fill if name already saved
    const savedName = sessionStorage.getItem('quiz_participant_name') || ''
    setNama(savedName)
    setNamaError('')
    setSelectedQuiz(quiz)
  }

  const closeModal = () => {
    setSelectedQuiz(null)
    setNama('')
    setNamaError('')
  }

  const handleLanjut = () => {
    if (!nama.trim()) {
      setNamaError('Nama tidak boleh kosong.')
      return
    }
    sessionStorage.setItem('quiz_participant_name', nama.trim())

    // Public quiz: no kode_kuis, route by ID
    // Private quiz: has kode_kuis, route by code
    if (selectedQuiz.kode_kuis) {
      navigate(`/kerjakan-kuis/${selectedQuiz.kode_kuis}`, {
        state: { nama: nama.trim() }
      })
    } else {
      navigate(`/kerjakan-kuis/publik/${selectedQuiz.id}`, {
        state: { nama: nama.trim() }
      })
    }
  }

  // Extract unique categories for filter tabs
  const categories = ['Semua', ...new Set(quizzes.map(q => q.category).filter(Boolean))]

  return (
    <div className="quizlist-root">
      {/* Banner Section */}
      <div className="quizlist-banner">
        <div className="banner-icon banner-icon-book">📖</div>
        <div className="banner-icon banner-icon-rocket">🚀</div>
        <div className="banner-icon banner-icon-graduation">🎓</div>
        <div className="banner-icon banner-icon-lightbulb">💡</div>
        <div className="banner-content">
          <h1>Tingkatkan Kemampuanmu dengan Kuis KuisKita</h1>
          <p>Telusuri dan pilih kuis sesuai kategori untuk mengasah pengetahuan dan keterampilanmu</p>
        </div>
      </div>

      {/* Quiz List Section */}
      <div className="quizlist-container">
        <div className="quizlist-header-row">
          <div className="section-title-wrapper">
            <h2 className="section-main-title">Daftar Kuis Publik</h2>
            <p className="section-subtitle">Telusuri berbagai kuis menarik dan uji pengetahuanmu sekarang!</p>
          </div>

          {/* Filter Tabs — dynamic from actual data */}
          <div className="filter-tabs">
            {categories.map(filter => (
              <button
                key={filter}
                className={`filter-tab ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Quiz Cards Grid */}
        {loading ? (
          <div className="loading-state">
            <div className="ql-spinner"></div>
            <p>Memuat kuis...</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p>Belum ada kuis publik yang tersedia saat ini.</p>
          </div>
        ) : (
          <div className="quiz-grid">
            {filteredQuizzes.map(quiz => (
              <div key={quiz.id} className="quiz-card">
                <div className="quiz-image">
                  <img src={quiz.image} alt={quiz.title} />
                  <div className={`quiz-category-badge badge-${(quiz.category || 'umum').toLowerCase()}`}>
                    {(quiz.category || 'UMUM').toUpperCase()}
                  </div>
                </div>
                <div className="quiz-content">
                  <h3 className="quiz-title">{quiz.title}</h3>
                  <p className="quiz-description">{quiz.description}</p>

                  <div className="quiz-footer">
                    <div className="quiz-meta">
                      <span className="meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        {quiz.questions} Soal
                      </span>
                      <span className="meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {quiz.timeLimit}
                      </span>
                      <span className="meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5"/></svg>
                        {quiz.targetClass}
                      </span>
                    </div>

                    <button
                      className="start-btn"
                      onClick={() => openModal(quiz)}
                    >
                      Mulai Kuis
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Siap Mengerjakan Kuis? */}
      {selectedQuiz && (
        <div className="ql-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="ql-modal">
            {/* Top icon */}
            <div className="ql-modal-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>

            <h2 className="ql-modal-title">Siap Mengerjakan Kuis?</h2>
            <p className="ql-modal-sub">
              Silakan masukkan nama kamu sebelum memulai. Dan<br />
              siap-siap untuk perjalanan kuis yang seru!
            </p>

            <div className="ql-modal-field">
              <label>Nama Kuis</label>
              <div className="ql-modal-quiz-name">{selectedQuiz.title}</div>
            </div>

            <div className="ql-modal-field">
              <label>Nama Kamu</label>
              <input
                type="text"
                value={nama}
                onChange={e => { setNama(e.target.value); setNamaError('') }}
                placeholder="Masukkan nama kamu..."
                className={namaError ? 'ql-input error' : 'ql-input'}
                onKeyDown={e => e.key === 'Enter' && handleLanjut()}
                autoFocus
              />
              {namaError && <div className="ql-input-error">{namaError}</div>}
            </div>

            <button className="ql-modal-btn" onClick={handleLanjut}>
              Lanjut
            </button>

            <p className="ql-modal-link">
              Ingin membuat kuis sendiri? <a href="/login">Daftarkan Guru kamu!</a>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
