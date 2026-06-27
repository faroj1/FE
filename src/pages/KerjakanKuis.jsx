import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getPublicQuizDetail, joinQuizByCode, submitQuiz, getImageUrl } from '../utils/api'
import '../styles/kerjakankuis.css'

// Format a Date as "YYYY-MM-DDTHH:mm:ss" in LOCAL time
// Backend PHP Carbon::parse() expects local server time, not UTC
const toLocalISOString = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export default function KerjakanKuis() {
  // Route params — one of these will be defined depending on the route
  const { kodeKuis, id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Determine mode: public (/publik/:id) or private (/:kodeKuis)
  const isPublic = Boolean(id)

  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})   // { soalIndex: 'A'|'B'|'C'|'D' }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)
  const startTimeRef   = useRef(null)  // ISO string when quiz loaded
  const handleSubmitRef = useRef(null)  // stable ref to latest handleSubmit (avoids stale closure in timer)
  const elapsedRef      = useRef(0)     // seconds elapsed (updated each tick)

  // Get participant name from location state or sessionStorage
  const participantName = location.state?.nama || sessionStorage.getItem('quiz_participant_name') || 'Peserta'

  // Fetch quiz data — no authentication required
  useEffect(() => {
    const loadQuiz = async () => {
      setLoading(true)
      try {
        let res
        if (isPublic) {
          // Public quiz: GET /api/kuis/publik/:id
          res = await getPublicQuizDetail(id)
        } else {
          // Private quiz: POST /api/kuis/join with kode_kuis
          res = await joinQuizByCode(kodeKuis)
        }

        if (!res.ok) {
          let msg
          if (res.status === 0) {
            msg = 'Tidak dapat terhubung ke server. Pastikan koneksi internet aktif dan coba lagi.'
          } else if (res.status === 404) {
            msg = isPublic ? 'Kuis tidak ditemukan atau sudah tidak tersedia.' : 'Kode kuis tidak valid atau sudah kedaluwarsa.'
          } else {
            msg = res.data?.message || `Gagal memuat kuis (${res.status || 'error jaringan'}).`
          }
          setError(msg)
          setLoading(false)
          return
        }

        // Backend response shapes we try to support:
        // Shape A (join): { kuis: {...}, soal: [...] }
        // Shape B (publik/:id): { data: { ...kuis, soal: [...] } }
        // Shape C: { data: { kuis: {...}, soal: [...] } }
        // Shape D: { soal: [...], ...kuisFields }
        const payload = res.data?.data || res.data || {}
        const kuisData = payload.kuis || payload

        // Try every key name the backend might use for the question list
        const soalData =
          payload.soal       || payload.questions  || payload.pertanyaan ||
          kuisData.soal      || kuisData.questions || kuisData.pertanyaan ||
          (Array.isArray(payload.data) ? payload.data : null) ||
          []

        // Debug: log full raw response to help diagnose backend response shape
        console.log('[KerjakanKuis] raw res.data:', JSON.stringify(res.data)?.slice(0, 400))
        console.log('[KerjakanKuis] payload keys:', Object.keys(payload))
        console.log('[KerjakanKuis] soalData length:', Array.isArray(soalData) ? soalData.length : soalData)

        setQuiz(kuisData)
        setTimeLeft((kuisData.soal_waktu || 30) * 60)
        // Use LOCAL time — backend Carbon::parse expects server local timezone, not UTC
        startTimeRef.current = toLocalISOString(new Date())

        const soalList = Array.isArray(soalData) ? soalData : []
        setQuestions(soalList)

        if (soalList.length === 0) {
          setError('Kuis ini belum memiliki soal.')
        }
      } catch (err) {
        console.error(err)
        setError('Terjadi kesalahan saat memuat kuis.')
      }
      setLoading(false)
    }

    loadQuiz()
  }, [id, kodeKuis, isPublic])



  // Timer countdown — uses ref to avoid stale closure on auto-submit
  useEffect(() => {
    if (loading || submitted || timeLeft <= 0 || questions.length === 0) return
    const timer = setInterval(() => {
      elapsedRef.current += 1
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmitRef.current?.()  // always calls the latest version
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

  const handleSubmit = useCallback(async () => {
    if (submitted) return
    setSubmitted(true)

    const endDate = new Date()
    // Backend requires waktu_selesai to be strictly AFTER waktu_mulai.
    // Guard against same-second submissions (very fast quiz or test).
    const startDate = startTimeRef.current
      ? new Date(startTimeRef.current)  // parse stored local ISO string
      : new Date(endDate.getTime() - 60000)
    if (endDate.getTime() <= startDate.getTime()) {
      endDate.setTime(startDate.getTime() + 2000)
    }
    // Freeze elapsed seconds at the moment of submission
    elapsedRef.current = Math.max(elapsedRef.current, Math.floor((endDate - startDate) / 1000))
    // Use LOCAL time for both timestamps so PHP Carbon::parse stores them correctly
    const endTime = toLocalISOString(endDate)

    // Calculate score
    let correct = 0
    let totalPoin = 0
    let earnedPoin = 0

    const jawabanPayload = questions.map((q, idx) => {
      const poin = q.poin !== undefined ? q.poin : (q.bobot_poin || 10)
      totalPoin += poin
      const userAnswer = answers[idx]
      const correctAnswer = q.jawaban_benar
      if (userAnswer && correctAnswer && userAnswer.toUpperCase() === correctAnswer.toUpperCase()) {
        correct++
        earnedPoin += poin
      }
      return {
        soal_id: q.soal_id || q.id,
        jawaban_dipilih: userAnswer ? userAnswer.toLowerCase() : null  // 'a'/'b'/'c'/'d' or null if unanswered
      }
    })

    const elapsedSec = elapsedRef.current
    const elapsedMin = Math.floor(elapsedSec / 60)
    const elapsedS   = elapsedSec % 60
    const durasiLabel = `${String(elapsedMin).padStart(2, '0')}:${String(elapsedS).padStart(2, '0')}`

    setScore({
      correct,
      wrong: questions.length - correct,
      total: questions.length,
      earnedPoin,
      totalPoin,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
      durasi: durasiLabel,
    })

    // Submit to backend (fire and forget — don't block UI)
    const quizId = quiz?.kuis_id || quiz?.id
    if (quizId) {
      try {
        await submitQuiz(quizId, {
          nama_peserta: participantName,
          waktu_mulai: startTimeRef.current || endTime,
          waktu_selesai: endTime,
          jawaban: jawabanPayload
        })
      } catch (err) {
        console.warn('[KerjakanKuis] Failed to submit results to backend:', err)
      }
    }
  }, [submitted, questions, answers, participantName, quiz])

  // Keep handleSubmitRef in sync with the latest handleSubmit
  // Must be AFTER handleSubmit definition to avoid TDZ ReferenceError
  useEffect(() => { handleSubmitRef.current = handleSubmit }, [handleSubmit])

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
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="kk-quiz-result-btn kk-quiz-result-btn-primary"
              onClick={() => { setError(null); setLoading(true); window.location.reload() }}
            >
              🔄 Coba Lagi
            </button>
            <button className="kk-quiz-result-btn kk-quiz-result-btn-secondary" onClick={() => navigate('/')}>
              Kembali ke Beranda
            </button>
          </div>
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
              <div className="kk-quiz-result-stat">
                <div className="kk-quiz-result-stat-value" style={{ fontSize: 22 }}>{score.durasi}</div>
                <div className="kk-quiz-result-stat-label">Waktu Pengerjaan</div>
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
  // Fallback: if loading done but somehow currentQ is missing, show error UI
  if (!currentQ) {
    return (
      <div className="kk-quiz-root">
        <div className="kk-quiz-topbar">
          <div className="kk-quiz-topbar-left">
            <div className="kk-quiz-topbar-logo" onClick={() => navigate('/')}>KuisKita</div>
          </div>
        </div>
        <div className="kk-quiz-error">
          <div style={{ fontSize: 48 }}>📭</div>
          <h2>Kuis Tidak Tersedia</h2>
          <p>{error || 'Soal kuis tidak dapat dimuat. Hubungi guru atau coba kuis lain.'}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="kk-quiz-result-btn kk-quiz-result-btn-primary"
              onClick={() => { window.location.reload() }}
            >
              🔄 Coba Lagi
            </button>
            <button className="kk-quiz-result-btn kk-quiz-result-btn-secondary" onClick={() => navigate('/daftar-kuis')}>
              Kembali ke Daftar Kuis
            </button>
          </div>
        </div>
      </div>
    )
  }

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

            {currentQ.soal_soal !== '-' && (
              <div className="kk-quiz-question-text">
                {currentQ.soal_soal || currentQ.pertanyaan || currentQ.text || 'Pertanyaan tidak tersedia'}
              </div>
            )}

            {/* Display question image — backend provides full URL in gambar_soal_url, with fallback to gambar_soal */}
            {(currentQ.gambar_soal_url || currentQ.gambar_soal) && (
              <div style={{ margin: '12px 0 4px', textAlign: 'center' }}>
                <img
                  src={getImageUrl(currentQ.gambar_soal_url || currentQ.gambar_soal)}
                  alt="Gambar soal"
                  style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 12, objectFit: 'contain', border: '1px solid #e2e8f0' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
            )}

            <div className="kk-quiz-answers">
              {['A', 'B', 'C', 'D'].map(letter => {
                const key = `jawaban_${letter.toLowerCase()}`
                const text = currentQ[key] || ''
                if (!text) return null
                const isSelected = answers[currentIdx] === letter
                const imgKey = `gambar_jawaban_${letter.toLowerCase()}_url`
                const fallbackImgKey = `gambar_jawaban_${letter.toLowerCase()}`
                const imgUrl = currentQ[imgKey] || currentQ[fallbackImgKey]
                return (
                  <button
                    key={letter}
                    className={`kk-quiz-answer-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectAnswer(letter)}
                    style={{ height: 'auto', display: 'flex', alignItems: 'center' }}
                  >
                    <div className="kk-quiz-answer-letter">{letter}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      {text !== '-' && <div className="kk-quiz-answer-text">{text}</div>}
                      {imgUrl && (
                        <div style={{ marginTop: 6, display: 'inline-block' }}>
                          <img
                            src={getImageUrl(imgUrl)}
                            alt={`Gambar jawaban ${letter}`}
                            style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, objectFit: 'contain', border: '1px solid rgba(0,0,0,0.08)' }}
                            onError={e => { e.target.style.display = 'none' }}
                          />
                        </div>
                      )}
                    </div>
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
