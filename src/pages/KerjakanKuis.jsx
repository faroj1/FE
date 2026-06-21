import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getMyQuizzes, getSoalByKuis } from '../utils/api'
import { isAuthenticated } from '../utils/auth'
import '../styles/kerjakankuis.css'

export default function KerjakanKuis() {
  const { kodeKuis } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})   // { soalIndex: 'A'|'B'|'C'|'D' }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)

  // Get participant name from location state or sessionStorage
  const participantName = location.state?.nama || sessionStorage.getItem('quiz_participant_name') || 'Peserta'

  // Fetch quiz data by kode_kuis
  useEffect(() => {
    if (!isAuthenticated()) {
      sessionStorage.setItem('quiz_redirect', `/kerjakan-kuis/${kodeKuis}`)
      navigate('/login', { replace: true })
      return
    }

    const loadQuiz = async () => {
      setLoading(true)
      try {
        // Fetch all quizzes and find by kode_kuis
        const res = await getMyQuizzes()
        if (!res.ok) {
          setError('Gagal memuat data kuis. Pastikan Anda sudah login.')
          setLoading(false)
          return
        }

        const allQuizzes = res.data?.data || res.data || []
        const quizList = Array.isArray(allQuizzes) ? allQuizzes : []
        const found = quizList.find(q => q.kode_kuis === kodeKuis)

        if (!found) {
          setError(`Kuis dengan kode "${kodeKuis}" tidak ditemukan.`)
          setLoading(false)
          return
        }

        setQuiz(found)
        setTimeLeft((found.soal_waktu || 30) * 60)  // convert minutes to seconds

        // Fetch questions
        const kuisId = found.kuis_id || found.id
        const soalRes = await getSoalByKuis(kuisId)
        if (soalRes.ok) {
          const soalData = soalRes.data?.data || soalRes.data || []
          const soalList = Array.isArray(soalData) ? soalData : []
          setQuestions(soalList)
          if (soalList.length === 0) {
            setError('Kuis ini belum memiliki soal.')
          }
        } else {
          // If soal fetch fails (403 etc), create mock questions from quiz data
          setError('Tidak dapat memuat soal kuis. ' + (soalRes.data?.message || ''))
        }
      } catch (err) {
        console.error(err)
        setError('Terjadi kesalahan saat memuat kuis.')
      }
      setLoading(false)
    }

    loadQuiz()
  }, [kodeKuis, navigate])

  // Timer countdown
  useEffect(() => {
    if (loading || submitted || timeLeft <= 0 || questions.length === 0) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [loading, submitted, questions.length])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const timerClass = timeLeft <= 60 ? 'danger' : timeLeft <= 300 ? 'warning' : ''

  const selectAnswer = (letter) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [currentIdx]: letter }))
  }

  const handleSubmit = useCallback(() => {
    if (submitted) return
    setSubmitted(true)

    // Calculate score
    let correct = 0
    let totalPoin = 0
    let earnedPoin = 0

    questions.forEach((q, idx) => {
      const poin = q.poin !== undefined ? q.poin : (q.bobot_poin || 10)
      totalPoin += poin
      const userAnswer = answers[idx]
      const correctAnswer = q.jawaban_benar
      if (userAnswer && correctAnswer && userAnswer.toUpperCase() === correctAnswer.toUpperCase()) {
        correct++
        earnedPoin += poin
      }
    })

    setScore({
      correct,
      wrong: questions.length - correct,
      total: questions.length,
      earnedPoin,
      totalPoin,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
    })
  }, [submitted, questions, answers])

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="kk-quiz-root">
        <div className="kk-quiz-loading">
          <div className="kk-quiz-loading-spinner" />
          Memuat kuis...
        </div>
      </div>
    )
  }

  // ─── Error State ───
  if (error && questions.length === 0) {
    return (
      <div className="kk-quiz-root">
        <div className="kk-quiz-topbar">
          <div className="kk-quiz-topbar-left">
            <div className="kk-quiz-topbar-logo" onClick={() => navigate('/')}>KuisKita</div>
          </div>
        </div>
        <div className="kk-quiz-error">
          <div style={{ fontSize: 48 }}>😢</div>
          <h2>Oops!</h2>
          <p>{error}</p>
          <button className="kk-quiz-result-btn kk-quiz-result-btn-primary" onClick={() => navigate('/')}>
            Kembali ke Beranda
          </button>
        </div>
      </div>
    )
  }

  // ─── Result State ───
  if (submitted && score) {
    const emoji = score.percentage >= 80 ? '🎉' : score.percentage >= 50 ? '👍' : '😅'
    return (
      <div className="kk-quiz-root">
        <div className="kk-quiz-topbar">
          <div className="kk-quiz-topbar-left">
            <div className="kk-quiz-topbar-logo" onClick={() => navigate('/')}>KuisKita</div>
            <span className="kk-quiz-topbar-title">{quiz?.judul || 'Hasil Kuis'}</span>
          </div>
        </div>
        <div className="kk-quiz-result">
          <div className="kk-quiz-result-card">
            <div className="kk-quiz-result-icon">{emoji}</div>
            <div className="kk-quiz-result-title">Kuis Selesai!</div>
            <div className="kk-quiz-result-subtitle">
              Hai <strong>{participantName}</strong>, berikut hasil kuis kamu
            </div>
            <div className="kk-quiz-result-score">
              <span className="kk-quiz-result-score-num">{score.percentage}</span>
              <span className="kk-quiz-result-score-total">/ 100</span>
            </div>
            <div className="kk-quiz-result-stats">
              <div className="kk-quiz-result-stat correct">
                <div className="kk-quiz-result-stat-value">{score.correct}</div>
                <div className="kk-quiz-result-stat-label">Benar</div>
              </div>
              <div className="kk-quiz-result-stat wrong">
                <div className="kk-quiz-result-stat-value">{score.wrong}</div>
                <div className="kk-quiz-result-stat-label">Salah</div>
              </div>
              <div className="kk-quiz-result-stat">
                <div className="kk-quiz-result-stat-value">{score.total}</div>
                <div className="kk-quiz-result-stat-label">Total Soal</div>
              </div>
            </div>
            <div className="kk-quiz-result-actions">
              <button className="kk-quiz-result-btn kk-quiz-result-btn-primary" onClick={() => navigate('/')}>
                Kembali ke Beranda
              </button>
              <button className="kk-quiz-result-btn kk-quiz-result-btn-secondary" onClick={() => navigate('/daftar-kuis')}>
                Kuis Lainnya
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Quiz Taking State ───
  const currentQ = questions[currentIdx]
  if (!currentQ) return null

  const answeredCount = Object.keys(answers).length

  return (
    <div className="kk-quiz-root">
      {/* Top Bar */}
      <div className="kk-quiz-topbar">
        <div className="kk-quiz-topbar-left">
          <div className="kk-quiz-topbar-logo" onClick={() => navigate('/')}>KuisKita</div>
          <span className="kk-quiz-topbar-title">{quiz?.judul || 'Kuis'}</span>
        </div>
        <div className={`kk-quiz-timer ${timerClass}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="kk-quiz-body">
        {/* Sidebar navigation */}
        <aside className="kk-quiz-sidebar">
          <div className="kk-quiz-nav-card">
            <div className="kk-quiz-nav-title">Navigasi Soal</div>
            <div className="kk-quiz-nav-grid">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  className={`kk-quiz-nav-btn ${idx === currentIdx ? 'active' : ''} ${answers[idx] ? 'answered' : ''}`}
                  onClick={() => setCurrentIdx(idx)}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="kk-quiz-nav-info">
              Dijawab: <strong>{answeredCount}</strong> / {questions.length}<br />
              Peserta: <strong>{participantName}</strong>
            </div>
          </div>
        </aside>

        {/* Main Question */}
        <main className="kk-quiz-main">
          <div className="kk-quiz-question-card">
            <div className="kk-quiz-question-header">
              <div className="kk-quiz-question-num">{currentIdx + 1}</div>
              <div className="kk-quiz-question-badge">
                Bobot: {currentQ.poin !== undefined ? currentQ.poin : (currentQ.bobot_poin || 10)} Poin
              </div>
            </div>

            <div className="kk-quiz-question-text">
              {currentQ.soal_soal || currentQ.pertanyaan || currentQ.text || 'Pertanyaan tidak tersedia'}
            </div>

            <div className="kk-quiz-answers">
              {['A', 'B', 'C', 'D'].map(letter => {
                const key = `jawaban_${letter.toLowerCase()}`
                const text = currentQ[key] || ''
                if (!text) return null
                const isSelected = answers[currentIdx] === letter
                return (
                  <button
                    key={letter}
                    className={`kk-quiz-answer-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectAnswer(letter)}
                  >
                    <div className="kk-quiz-answer-letter">{letter}</div>
                    <div className="kk-quiz-answer-text">{text}</div>
                  </button>
                )
              })}
            </div>

            <div className="kk-quiz-footer">
              <button
                className="kk-quiz-btn kk-quiz-btn-prev"
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
              >
                ← Sebelumnya
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  className="kk-quiz-btn kk-quiz-btn-next"
                  onClick={() => setCurrentIdx(currentIdx + 1)}
                >
                  Selanjutnya →
                </button>
              ) : (
                <button
                  className="kk-quiz-btn kk-quiz-btn-submit"
                  onClick={() => {
                    if (answeredCount < questions.length) {
                      if (!confirm(`Anda baru menjawab ${answeredCount} dari ${questions.length} soal. Yakin ingin mengirim?`)) return
                    }
                    handleSubmit()
                  }}
                >
                  ✓ Kirim Jawaban
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
