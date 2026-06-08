import { useState, useEffect } from 'react'
import { getQuizzes, getApiBase } from '../utils/api'
import '../styles/quizlist.css'

import coverAgama from '../assets/cover_agama.png'
import coverBahasa from '../assets/cover_bahasa.png'
import coverMatematika from '../assets/cover_matematika.png'

export default function QuizList({ searchTerm }) {
  const [quizzes, setQuizzes] = useState([])
  const [filteredQuizzes, setFilteredQuizzes] = useState([])
  const [activeFilter, setActiveFilter] = useState('Semua')
  const [loading, setLoading] = useState(true)

  // Fetch quizzes from backend
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const result = await getQuizzes()
        if (result.ok && result.data && Array.isArray(result.data) && result.data.length > 0) {
          const apiBase = getApiBase()
          
          // Helper to get full image URL
          const getFullImageUrl = (img) => {
            if (!img) return coverAgama
            if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
              return img
            }
            if (img.startsWith('/src/assets/') || img.startsWith('src/assets/')) {
              return img
            }
            return apiBase ? `${apiBase}/${img.replace(/^\//, '')}` : img
          }

          // Map backend data dynamically supporting camelCase and snake_case
          const mapped = result.data.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            image: getFullImageUrl(item.image || item.cover_image || item.image_url),
            questions: item.questions ?? item.questions_count ?? 20,
            timeLimit: item.timeLimit ?? item.time_limit ?? '15 Menit',
            targetClass: item.targetClass ?? item.target_class ?? item.class ?? 'Kelas 10',
            category: item.category ?? 'Umum'
          }))

          setQuizzes(mapped)
          setFilteredQuizzes(mapped)
        } else {
          throw new Error('No data or failed response')
        }
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
    
    // Filter by category
    if (activeFilter !== 'Semua') {
      filtered = filtered.filter(quiz => quiz.category === activeFilter)
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(quiz =>
        quiz.title.toLowerCase().includes(searchLower) ||
        quiz.description.toLowerCase().includes(searchLower)
      )
    }
    
    setFilteredQuizzes(filtered)
  }, [activeFilter, searchTerm, quizzes])

  const handleStartQuiz = (quizId) => {
    console.log('Starting quiz:', quizId)
    // Implement quiz start or navigation logic here
    alert(`Memulai kuis dengan ID: ${quizId}`)
  }

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
            <h2 className="section-main-title">Daftar Kuis</h2>
            <p className="section-subtitle">Telusuri berbagai kuis menarik dan uji pengetahuanmu sekarang!</p>
          </div>

          {/* Filter Tabs */}
          <div className="filter-tabs">
            {['Semua', 'Agama', 'Bahasa', 'Matematika'].map(filter => (
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
            <p>Memuat kuis...</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="empty-state">
            <p>Tidak ada kuis yang ditemukan.</p>
          </div>
        ) : (
          <div className="quiz-grid">
            {filteredQuizzes.map(quiz => (
              <div key={quiz.id} className="quiz-card">
                <div className="quiz-image">
                  <img src={quiz.image} alt={quiz.title} />
                  <div className={`quiz-category-badge badge-${quiz.category.toLowerCase()}`}>
                    {quiz.category.toUpperCase()}
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
                      onClick={() => handleStartQuiz(quiz.id)}
                    >
                      Mulai
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Arrows */}
        <div className="pagination-wrapper">
          <div className="pagination-arrows">
            <button className="arrow-btn" aria-label="Sebelumnya">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button className="arrow-btn" aria-label="Selanjutnya">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
