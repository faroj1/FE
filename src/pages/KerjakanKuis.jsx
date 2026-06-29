import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Swal from 'sweetalert2'
import { getPublicQuizDetail, joinQuizByCode, leaveQuizByCode, submitQuiz, submitQuizBeacon, getImageUrl } from '../utils/api'
import { listenQuizStart, listenQuizParticipants, listenQuizEnd, disconnectQuizChannel } from '../utils/echo'
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
  const [waitingParticipants, setWaitingParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)
  const startTimeRef   = useRef(null)  // ISO string when quiz loaded
  const handleSubmitRef = useRef(null)  // stable ref to latest handleSubmit (avoids stale closure in timer)
  const elapsedRef      = useRef(0)     // seconds elapsed (updated each tick)
  const waitingQuestionsRef = useRef([])
  const latestQuizRef = useRef(null)
  const latestQuestionsRef = useRef([])
  const latestAnswersRef = useRef({})
  const latestSubmittedRef = useRef(false)
  const autoSubmittedRef = useRef(false)

  // Get participant name from location state or sessionStorage
  const participantName = location.state?.nama || sessionStorage.getItem('quiz_participant_name') || 'Peserta'

  const quizSessionKey = `quiz_session_${isPublic ? `publik_${id}` : `kode_${kodeKuis}`}`

  useEffect(() => {
    latestQuizRef.current = quiz
    latestQuestionsRef.current = questions
    latestAnswersRef.current = answers
    latestSubmittedRef.current = submitted
  }, [quiz, questions, answers, submitted])

  const isPrivateQuiz = (quiz) => {
    const akses = (quiz?.akses || quiz?.access || '').toString().toLowerCase()
    return akses === 'private' || akses === 'privat'
  }

  const isQuizEnded = (quiz) => {
    const status = (quiz?.status || quiz?.aktif || quiz?.is_active || '').toString().toLowerCase()
    return Boolean(
      quiz?.is_finished ||
      quiz?.finished_at ||
      quiz?.ended_at ||
      quiz?.waktu_selesai ||
      ['finished', 'selesai', 'ended', 'berakhir'].includes(status)
    )
  }

  const isPrivateWaiting = quiz && !isPublic && isPrivateQuiz(quiz) && questions.length === 0 && !loading && !error

  const normalizeParticipants = (source) => {
    if (!Array.isArray(source)) return []
    return Array.from(new Set(source
      .map(item => {
        if (typeof item === 'string') return item
        return item?.nama_peserta || item?.nama || item?.name || item?.peserta || ''
      })
      .filter(Boolean)))
  }

  const getEventParticipantList = (event) => normalizeParticipants(
    event?.peserta ||
    event?.participants ||
    event?.peserta_bergabung ||
    event?.pesertaBergabung ||
    []
  )

  const hasParticipantListPayload = (event) => (
    Array.isArray(event?.peserta) ||
    Array.isArray(event?.participants) ||
    Array.isArray(event?.peserta_bergabung) ||
    Array.isArray(event?.pesertaBergabung)
  )

  const getLeavingParticipantName = (event) => {
    const value =
      event?.nama_peserta ||
      event?.namaPeserta ||
      event?.nama ||
      event?.name ||
      event?.peserta_keluar ||
      event?.pesertaKeluar ||
      event?.participant

    if (!value) return ''
    if (typeof value === 'string') return value
    return value?.nama_peserta || value?.nama || value?.name || value?.peserta || ''
  }

  const isLeavingParticipantEvent = (event) => {
    const eventName = (
      event?.__eventName ||
      event?.event ||
      event?.type ||
      event?.action ||
      ''
    ).toString().toLowerCase()
    return eventName.includes('keluar') || eventName.includes('meninggalkan') || eventName.includes('leave') || eventName.includes('left')
  }

  const getSavedQuizSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem(quizSessionKey) || 'null')
    } catch {
      return null
    }
  }

  const persistQuizSession = (updates) => {
    const base = getSavedQuizSession() || {}
    const next = {
      ...base,
      ...updates,
      startTime: base.startTime || startTimeRef.current,
      participantName,
    }
    sessionStorage.setItem(quizSessionKey, JSON.stringify(next))
  }

  const clearQuizSession = () => {
    sessionStorage.removeItem(quizSessionKey)
  }

  const beginQuiz = useCallback((kuisData, soalList, participants = waitingParticipants) => {
    if (!Array.isArray(soalList) || soalList.length === 0) {
      window.location.reload()
      return
    }

    const durationSeconds = (kuisData?.soal_waktu || 30) * 60
    const nowIso = toLocalISOString(new Date())
    startTimeRef.current = nowIso
    elapsedRef.current = 0

    const activeQuiz = { ...kuisData, status: kuisData?.status || 'aktif' }
    setQuiz(activeQuiz)
    setQuestions(soalList)
    setCurrentIdx(0)
    setAnswers({})
    setTimeLeft(durationSeconds)
    setError(null)
    setLoading(false)
    clearQuizSession()
    persistQuizSession({
      started: true,
      startTime: nowIso,
      currentIdx: 0,
      answers: {},
      participants,
    })
  }, [waitingParticipants]) // eslint-disable-line react-hooks/exhaustive-deps

  if (location.state?.nama) {
    sessionStorage.setItem('quiz_participant_name', location.state.nama)
  }

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
          res = await joinQuizByCode(kodeKuis, participantName)
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

        const soalList = Array.isArray(soalData) ? soalData : []
        waitingQuestionsRef.current = soalList

        // Debug: log full raw response to help diagnose backend response shape
        console.log('[KerjakanKuis] raw res.data:', JSON.stringify(res.data)?.slice(0, 400))
        console.log('[KerjakanKuis] payload keys:', Object.keys(payload))
        console.log('[KerjakanKuis] soalData length:', Array.isArray(soalData) ? soalData.length : soalData)
        // Additional debug: show parsed kuisData and flags for private/active so we can debug waiting UI
        console.log('[KerjakanKuis] kuisData:', kuisData)
        console.log('[KerjakanKuis] isPrivate:', isPrivateQuiz(kuisData), 'soalCount:', Array.isArray(soalList) ? soalList.length : soalList)

        const durationSeconds = (kuisData.soal_waktu || 30) * 60
        const savedSession = getSavedQuizSession()
        const storedStartTime = savedSession?.startTime
        const restoredAnswers = savedSession?.answers || {}
        let restoredIdx = typeof savedSession?.currentIdx === 'number' ? savedSession.currentIdx : 0
        const participantSource =
          payload.peserta_bergabung ||
          payload.pesertaBergabung ||
          payload.participants ||
          payload.peserta ||
          kuisData.peserta_bergabung ||
          kuisData.pesertaBergabung ||
          kuisData.peserta ||
          kuisData.participants ||
          savedSession?.participants ||
          []
        const parsedParticipants = normalizeParticipants(participantSource)
        const initialParticipants = parsedParticipants.length > 0 ? parsedParticipants : (participantName ? [participantName] : [])

        // Private quiz participants must always land in the lobby first.
        // Only the realtime kuis.dimulai event is allowed to open the questions.
        if (isPrivateQuiz(kuisData)) {
          clearQuizSession()
          persistQuizSession({ currentIdx: 0, answers: {}, participants: initialParticipants })
          startTimeRef.current = null
          setQuiz(kuisData)
          setQuestions([])
          setCurrentIdx(0)
          setAnswers({})
          setWaitingParticipants(initialParticipants)
          setLoading(false)
          return
        }

        if (storedStartTime) {
          const parsedStart = new Date(storedStartTime)
          const elapsed = Number.isNaN(parsedStart.getTime()) ? null : Math.floor((new Date() - parsedStart) / 1000)
          if (elapsed !== null && elapsed >= durationSeconds) {
            setError('Waktu kuis sudah habis. Silakan mulai kembali.')
            setTimeLeft(0)
            clearQuizSession()
            setQuestions([])
            setQuiz(kuisData)
            setWaitingParticipants(initialParticipants)
            setLoading(false)
            return
          } else {
            startTimeRef.current = storedStartTime
            setTimeLeft(durationSeconds - (elapsed || 0))
          }
        }

        if (!startTimeRef.current) {
          const nowIso = toLocalISOString(new Date())
          startTimeRef.current = nowIso
          setTimeLeft(durationSeconds)
        }

        setQuiz(kuisData)
        setQuestions(soalList)
        setCurrentIdx(restoredIdx >= 0 && restoredIdx < soalList.length ? restoredIdx : 0)
        setAnswers(restoredAnswers)
        setWaitingParticipants(initialParticipants)
        persistQuizSession({
          startTime: startTimeRef.current,
          currentIdx: restoredIdx,
          answers: restoredAnswers,
          participants: initialParticipants,
        })

        if (soalList.length === 0 && !isPrivateQuiz(kuisData)) {
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

  useEffect(() => {
    if (!isPrivateWaiting || !quiz) return undefined

    const quizId = quiz?.kuis_id || quiz?.id
    if (!quizId) return undefined

    listenQuizParticipants(quizId, (event) => {
      if (hasParticipantListPayload(event)) {
        const nextParticipants = getEventParticipantList(event)
        setWaitingParticipants(nextParticipants)
        persistQuizSession({ participants: nextParticipants })
        return
      }

      if (!isLeavingParticipantEvent(event)) return

      const leavingName = getLeavingParticipantName(event)
      if (!leavingName) return

      setWaitingParticipants(prevParticipants => {
        const nextParticipants = prevParticipants.filter(name => name !== leavingName)
        persistQuizSession({ participants: nextParticipants })
        return nextParticipants
      })
    })

    const channel = listenQuizStart(quizId, () => {
      console.log('[KerjakanKuis] kuis.dimulai diterima untuk kuis:', quizId)
      beginQuiz(
        { ...quiz, status: 'aktif' },
        waitingQuestionsRef.current,
        waitingParticipants
      )
    })

    return () => {
      if (channel) disconnectQuizChannel(quizId)
    }
  }, [isPrivateWaiting, quiz, beginQuiz, waitingParticipants])



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

  useEffect(() => {
    if (!quiz || submitted) return
    persistQuizSession({ currentIdx, answers })
  }, [currentIdx, answers, quiz, submitted])

  const selectAnswer = (letter) => {
    if (submitted) return
    setAnswers(prev => {
      const next = { ...prev, [currentIdx]: letter }
      persistQuizSession({ answers: next, currentIdx })
      return next
    })
  }

  const buildJawabanPayload = useCallback((sourceQuestions = [], sourceAnswers = {}) => (
    sourceQuestions.map((q, idx) => ({
      soal_id: q.soal_id ?? q.id,
      jawaban_dipilih: sourceAnswers[idx] ? sourceAnswers[idx].toLowerCase() : null,
    })).filter(item => item.soal_id !== undefined && item.soal_id !== null)
  ), [])

  const buildSubmissionData = useCallback((sourceQuiz = quiz, sourceQuestions = questions, sourceAnswers = answers) => {
    const endDate = new Date()
    const startDate = startTimeRef.current
      ? new Date(startTimeRef.current)
      : new Date(endDate.getTime() - 60000)

    if (endDate.getTime() <= startDate.getTime()) {
      endDate.setTime(startDate.getTime() + 2000)
    }

    elapsedRef.current = Math.max(elapsedRef.current, Math.floor((endDate - startDate) / 1000))
    const endTime = toLocalISOString(endDate)
    let correct = 0
    let totalPoin = 0
    let earnedPoin = 0

    sourceQuestions.forEach((q, idx) => {
      const poin = q.poin !== undefined ? q.poin : (q.bobot_poin || 10)
      totalPoin += poin
      const userAnswer = sourceAnswers[idx]
      const correctAnswer = q.jawaban_benar
      if (userAnswer && correctAnswer && userAnswer.toUpperCase() === correctAnswer.toUpperCase()) {
        correct++
        earnedPoin += poin
      }
    })

    const jawabanPayload = buildJawabanPayload(sourceQuestions, sourceAnswers)

    const elapsedSec = elapsedRef.current
    const elapsedMin = Math.floor(elapsedSec / 60)
    const elapsedS = elapsedSec % 60

    return {
      quizId: sourceQuiz?.kuis_id || sourceQuiz?.id,
      scoreData: {
        correct,
        wrong: sourceQuestions.length - correct,
        total: sourceQuestions.length,
        earnedPoin,
        totalPoin,
        percentage: sourceQuestions.length > 0 ? Math.round((correct / sourceQuestions.length) * 100) : 0,
        durasi: `${String(elapsedMin).padStart(2, '0')}:${String(elapsedS).padStart(2, '0')}`,
      },
      payload: {
        nama_peserta: participantName,
        waktu_mulai: startTimeRef.current || endTime,
        waktu_selesai: endTime,
        jawaban: jawabanPayload,
      },
    }
  }, [quiz, questions, answers, participantName, buildJawabanPayload])

  const autoSubmitKuis = useCallback(() => {
    if (latestSubmittedRef.current || autoSubmittedRef.current) return false

    const sourceQuiz = latestQuizRef.current
    const sourceQuestions = latestQuestionsRef.current
    const sourceAnswers = latestAnswersRef.current
    if (!sourceQuiz || !Array.isArray(sourceQuestions) || sourceQuestions.length === 0) return false

    const { quizId, scoreData, payload } = buildSubmissionData(sourceQuiz, sourceQuestions, sourceAnswers)
    if (!quizId || payload.jawaban.length === 0) return false

    autoSubmittedRef.current = true
    latestSubmittedRef.current = true
    clearQuizSession()
    setSubmitted(true)
    setScore(scoreData)
    submitQuizBeacon(quizId, payload)
    return true
  }, [buildSubmissionData])

  const handleSubmit = useCallback(async () => {
    if (submitted) return
    setSubmitted(true)
    latestSubmittedRef.current = true
    clearQuizSession()

    const { quizId, scoreData, payload } = buildSubmissionData()
    setScore(scoreData)

    // Submit to backend (fire and forget — don't block UI)
    if (quizId) {
      try {
        await submitQuiz(quizId, payload)
      } catch (err) {
        console.warn('[KerjakanKuis] Failed to submit results to backend:', err)
      }
    }
  }, [submitted, buildSubmissionData])

  // Keep handleSubmitRef in sync with the latest handleSubmit
  // Must be AFTER handleSubmit definition to avoid TDZ ReferenceError
  useEffect(() => { handleSubmitRef.current = handleSubmit }, [handleSubmit])

  useEffect(() => {
    if (loading || submitted) return undefined

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') autoSubmitKuis()
    }
    const handlePageExit = () => {
      autoSubmitKuis()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageExit)
    window.addEventListener('beforeunload', handlePageExit)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageExit)
      window.removeEventListener('beforeunload', handlePageExit)
    }
  }, [loading, submitted, autoSubmitKuis])

  const confirmParticipantExit = useCallback(async () => {
    const isWaiting = quiz && !isPublic && isPrivateQuiz(quiz) && questions.length === 0 && !submitted
    const result = await Swal.fire({
      title: 'Keluar dari kuis?',
      text: isWaiting
        ? 'Kamu akan keluar dari lobby kuis. Lanjutkan?'
        : 'Keluar akan mengumpulkan jawaban kamu dan menyelesaikan kuis. Lanjutkan?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: isWaiting ? 'Ya, keluar' : 'Ya, kumpulkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    })

    if (result.isConfirmed) {
      if (isWaiting) {
        const quizId = quiz?.kuis_id || quiz?.id || null
        const leaveRes = await leaveQuizByCode(kodeKuis, participantName, quizId)
        const leavePayload = leaveRes.data?.data || leaveRes.data || {}
        const nextParticipants = normalizeParticipants(
          leavePayload.peserta_bergabung ||
          leavePayload.pesertaBergabung ||
          leavePayload.participants ||
          leavePayload.peserta ||
          []
        )
        const hasParticipantField =
          leavePayload.peserta_bergabung !== undefined ||
          leavePayload.pesertaBergabung !== undefined ||
          leavePayload.participants !== undefined ||
          leavePayload.peserta !== undefined
        if (hasParticipantField) setWaitingParticipants(nextParticipants)
      } else {
        await handleSubmitRef.current?.()
      }
      navigate('/')
    }
  }, [quiz, isPublic, questions.length, submitted, navigate, kodeKuis, participantName])

  const handleExit = () => {
    confirmParticipantExit()
  }

  const finishBecauseTeacherEnded = useCallback(async () => {
    if (submitted) return

    const isWaiting = quiz && !isPublic && isPrivateQuiz(quiz) && questions.length === 0
    if (!isWaiting && questions.length > 0) {
      await handleSubmitRef.current?.()
    } else {
      clearQuizSession()
    }

    await Swal.fire({
      icon: 'info',
      title: 'Kuis diakhiri',
      text: 'Guru telah mengakhiri kuis.',
      confirmButtonText: 'OK',
      confirmButtonColor: '#2563eb',
    })
    navigate('/')
  }, [quiz, isPublic, questions.length, submitted, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading || submitted) return undefined

    window.history.pushState({ quizBackGuard: true }, '', window.location.href)
    const handleBack = () => {
      window.history.pushState({ quizBackGuard: true }, '', window.location.href)
      Swal.fire({
        icon: 'info',
        title: 'Tidak bisa kembali',
        text: 'Gunakan tombol Keluar untuk meninggalkan kuis.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1800,
      })
    }
    window.addEventListener('popstate', handleBack)
    return () => window.removeEventListener('popstate', handleBack)
  }, [loading, submitted])

  useEffect(() => {
    if (!quiz || isPublic || !isPrivateQuiz(quiz) || submitted) return undefined

    const quizId = quiz?.kuis_id || quiz?.id
    if (!quizId) return undefined

    listenQuizEnd(quizId, finishBecauseTeacherEnded)
    return () => disconnectQuizChannel(quizId)
  }, [quiz, isPublic, submitted, finishBecauseTeacherEnded])

  useEffect(() => {
    if (!quiz || isPublic || !isPrivateQuiz(quiz) || submitted) return undefined

    const timer = setInterval(async () => {
      const res = await joinQuizByCode(kodeKuis)
      if (!res.ok) {
        const message = (res.data?.message || res.message || '').toLowerCase()
        if (message.includes('selesai') || message.includes('berakhir') || message.includes('diakhiri')) {
          finishBecauseTeacherEnded()
        }
        return
      }

      const payload = res.data?.data || res.data || {}
      const kuisData = payload.kuis || payload
      if (isQuizEnded(kuisData)) {
        finishBecauseTeacherEnded()
      }
    }, 5000)

    return () => clearInterval(timer)
  }, [quiz, isPublic, submitted, kodeKuis, finishBecauseTeacherEnded])

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
  if (isPrivateWaiting) {
    return (
      <div className="kk-quiz-root">
        <div className="kk-quiz-topbar">
          <div className="kk-quiz-topbar-left">
            <div className="kk-quiz-topbar-logo" onClick={handleExit}>KuisKita</div>
          </div>
        </div>

        <div className="kk-private-waiting-page">
          <div className="kk-private-waiting-card">
            <div className="kk-private-waiting-badge">Menunggu Guru Memulai...</div>
            <h2 className="kk-private-waiting-title">{quiz?.judul || quiz?.title || 'Kuis Privat'}</h2>
            <p className="kk-private-waiting-subtitle">Harap sabar, guru akan segera memulai kuis setelah semua siswa bergabung.</p>
            <div className="kk-private-waiting-info">
              <span>{(quiz?.soal_waktu || quiz?.time_limit || 15)} Menit</span>
              <span>{quiz?.jumlah_soal || quiz?.total_soal || quiz?.questions || 0} Soal</span>
            </div>
            <div className="kk-private-participants-panel">
              <div className="kk-private-participants-header">
                <span>Peserta Bergabung</span>
                <strong>{waitingParticipants.length} Peserta</strong>
              </div>
              <div className="kk-private-participants-list">
                {waitingParticipants.map((name, idx) => (
                  <div key={idx} className="kk-private-participant-item">
                    <span>{idx + 1}.</span> {name}
                  </div>
                ))}
              </div>
              <div className="kk-private-waiting-actions">
                <button
                  className="kk-private-copy-btn"
                  onClick={async () => {
                    const code = quiz?.kode_kuis || quiz?.code || ''
                    if (code) {
                      await navigator.clipboard.writeText(code)
                      Swal.fire({
                        icon: 'success',
                        title: 'Kode disalin',
                        text: `Kode kuis ${code} berhasil disalin ke clipboard.`,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 1800,
                      })
                    }
                  }}
                >
                  Salin Kode Kuis
                </button>
                <button className="kk-private-exit-btn" onClick={handleExit}>
                  Keluar
                </button>
              </div>
            </div>
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
            <div className="kk-quiz-topbar-logo" onClick={handleExit}>KuisKita</div>
          </div>
          <button className="kk-quiz-topbar-exit-btn" onClick={handleExit}>Keluar</button>
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
          <div className="kk-quiz-topbar-meta">
            <div className="kk-quiz-topbar-subtitle">{quiz?.judul || quiz?.title || 'Kuis Tidak Diketahui'}</div>
          </div>
        </div>

        <div className="kk-quiz-topbar-right">
          <div className={`kk-quiz-timer ${timerClass}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {formatTime(timeLeft)}
          </div>
          <button className="kk-quiz-topbar-exit-btn" onClick={handleExit}>Keluar</button>
        </div>
      </div>

      <div className="kk-quiz-body kk-quiz-body-reverse">
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
