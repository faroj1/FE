import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getMyQuizzes, getQuizResults, getSoalByKuis, logoutApi } from '../utils/api'
import { clearToken, isAuthenticated } from '../utils/auth'
import '../styles/hasilkuis.css'

export default function HasilKuis() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [quiz, setQuiz] = useState(location.state?.quiz || null)
  const [questionsCount, setQuestionsCount] = useState(0)
  const [results, setResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        // If quiz not passed via state, fetch from list
        let quizData = quiz
        if (!quizData) {
          const listRes = await getMyQuizzes()
          if (listRes.ok) {
            const list = listRes.data?.data || listRes.data || []
            quizData = list.find(q => String(q.kuis_id || q.id) === String(id))
          }
          if (!quizData) {
            setError('Kuis tidak ditemukan.')
            setLoading(false)
            return
          }
          setQuiz(quizData)
        }

        // Fetch questions to get correct count
        const soalRes = await getSoalByKuis(id)
        let totalQuestions = quizData.jumlah_soal || 0
        if (soalRes.ok) {
          const soalData = soalRes.data?.data || soalRes.data || []
          totalQuestions = Array.isArray(soalData) ? soalData.length : totalQuestions
        }
        setQuestionsCount(totalQuestions || 20) // default fallback to 20 questions

        // Fetch results
        const resultsRes = await getQuizResults(id)
        let resultsList = []
        if (resultsRes.ok) {
          const resData = resultsRes.data?.data || resultsRes.data || []
          resultsList = Array.isArray(resData) ? resData : []
        }

        // Parse results returned by API to fit our table structure
        const N = totalQuestions || 20
        resultsList = resultsList.map((r, index) => {
          const correct = r.jawaban_benar !== undefined ? r.jawaban_benar : (r.correct !== undefined ? r.correct : Math.round((r.score || 0) / 100 * N))
          const total = r.jumlah_soal || r.total || N
          const score = r.nilai !== undefined ? r.nilai : (r.score !== undefined ? r.score : Math.round((correct / total) * 100))
          
          // Format duration
          let durStr = '—'
          if (r.durasi || r.duration) {
            const seconds = Number(r.durasi || r.duration)
            if (!isNaN(seconds)) {
              const mins = Math.floor(seconds / 60)
              const secs = seconds % 60
              durStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} m`
            } else {
              durStr = String(r.durasi || r.duration)
            }
          }
          
          // Format date
          let dateStr = '—'
          if (r.created_at || r.tgl_pengerjaan) {
            try {
              dateStr = new Date(r.created_at || r.tgl_pengerjaan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
            } catch {
              dateStr = String(r.created_at || r.tgl_pengerjaan)
            }
          }

          return {
            id: r.id || index,
            name: r.nama_peserta || r.nama || r.name || r.user?.name || 'Siswa',
            correct: correct,
            total: total,
            score: score,
            duration: durStr,
            date: dateStr
          }
        })

        // Sort descending by score, then ascending by duration
        resultsList.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          return String(a.duration).localeCompare(String(b.duration))
        })

        setResults(resultsList)
      } catch (err) {
        console.error(err)
        setError('Terjadi kesalahan saat memuat data hasil kuis.')
      }
      setLoading(false)
    }

    fetchData()
  }, [id, navigate])

  const handleLogout = async () => {
    await logoutApi()
    clearToken()
    navigate('/login')
  }

  // Filtered results
  const filteredResults = results.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Top 3 for podium
  const podiumWinners = results.slice(0, 3)
  const firstPlace = podiumWinners[0] || null
  const secondPlace = podiumWinners[1] || null
  const thirdPlace = podiumWinners[2] || null

  // Calculate overall statistics
  const totalStudents = results.length
  const averageScore = totalStudents > 0
    ? Math.round((results.reduce((sum, r) => sum + r.score, 0) / totalStudents) * 10) / 10
    : 0

  const getFastestTimeStr = () => {
    if (totalStudents === 0) return '—'
    const durationSeconds = results.map(r => {
      const parts = String(r.duration).replace(' m', '').split(':')
      if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1])
      }
      return Infinity
    })
    const minSeconds = Math.min(...durationSeconds)
    if (minSeconds === Infinity) return '—'
    const mins = Math.floor(minSeconds / 60)
    const secs = minSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} Menit`
  }

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const stringVal = String(val);
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  }

  const exportToCSV = () => {
    const headers = ['NO', 'NAMA PESERTA', 'JAWABAN BENAR', 'NILAI / SKOR', 'WAKTU PENGERJAAN', 'TANGGAL'];
    const rows = filteredResults.map((r, idx) => [
      idx + 1,
      escapeCSV(r.name),
      escapeCSV(`${r.correct}/${r.total}`),
      escapeCSV(r.score),
      escapeCSV(r.duration),
      escapeCSV(r.date)
    ])

    const csvContent = "\ufeff" // Add UTF-8 BOM for Excel support
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Hasil_Kuis_${quiz?.judul || 'Export'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    } catch { return dateStr }
  }

  if (loading) {
    return (
      <div className="hk-root">
        <div className="hk-loading">
          <div className="hk-spinner"></div>
          Memuat data hasil kuis...
        </div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="hk-root">
        <div className="hk-error">
          <div className="hk-error-icon">😢</div>
          <h2>Gagal Memuat Hasil Kuis</h2>
          <p>{error || 'Hasil kuis tidak ditemukan.'}</p>
          <button className="hk-btn-back" onClick={() => navigate('/kelola-kuis')}>
            Kembali ke Kelola Kuis
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="hk-root">
      {/* Sidebar */}
      <aside className="hk-sidebar">
        <div>
          <div className="hk-logo" onClick={() => navigate('/')}>KuisKita</div>
          <nav className="hk-nav">
            <button className="hk-nav-item" onClick={() => navigate('/dashboard')}>
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
              </svg>
              Dashboard
            </button>
            <button className="hk-nav-item active" onClick={() => navigate('/kelola-kuis')}>
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Kelola Kuis
            </button>
            <button className="hk-nav-item">
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Profil
            </button>
          </nav>
        </div>

        <div className="hk-sidebar-footer">
          <button className="hk-nav-item">
            <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Bantuan
          </button>
          <button className="hk-nav-item logout" onClick={handleLogout}>
            <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="hk-main">
        <header className="hk-header-row">
          <button className="hk-icon-btn" aria-label="Notifikasi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <div className="hk-icon-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
        </header>

        <div className="hk-container">
          {/* Breadcrumb */}
          <div className="hk-breadcrumb">
            <a onClick={() => navigate('/kelola-kuis')}>Kelola Kuis</a>
            <span>›</span>
            <span className="current">Hasil Kuis</span>
          </div>

          {/* Title Row */}
          <div className="hk-title-row">
            <div>
              <h1 className="hk-quiz-title">Hasil Kuis: {quiz.judul || quiz.title || quiz.name}</h1>
              <p className="hk-quiz-subtitle">Diselenggarakan pada {formatDate(quiz.tgl_dibuat || quiz.created_at)}</p>
            </div>
            <button className="hk-btn-export" onClick={exportToCSV}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Ekspor CSV
            </button>
          </div>

          {/* Statistics Grid */}
          <div className="hk-stats-row">
            <div className="hk-stat-card">
              <div className="hk-stat-icon blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <div className="hk-stat-label">Total Peserta</div>
                <div className="hk-stat-value">
                  {totalStudents} <span className="hk-stat-unit">Siswa</span>
                </div>
              </div>
            </div>

            <div className="hk-stat-card">
              <div className="hk-stat-icon green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <div>
                <div className="hk-stat-label">Rata-rata Nilai</div>
                <div className="hk-stat-value">
                  {averageScore} <span className="hk-stat-unit">/ 100</span>
                </div>
              </div>
            </div>

            <div className="hk-stat-card">
              <div className="hk-stat-icon orange">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <div className="hk-stat-label">Waktu Tercepat</div>
                <div className="hk-stat-value" style={{ fontSize: '20px' }}>
                  {getFastestTimeStr()}
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Podium Section */}
          {results.length > 0 && (
            <div className="hk-podium-wrap">
              <div className="hk-podium-title">🏆 3 PESERTA TERBAIK</div>
              <div className="hk-podium">
                {/* 2nd Place Column (Left) */}
                {secondPlace && (
                  <div className="hk-podium-column second">
                    <div className="hk-podium-card">
                      <div className="hk-podium-medal">2</div>
                      <div className="hk-podium-name" title={secondPlace.name}>{secondPlace.name}</div>
                      <div className="hk-podium-score">{secondPlace.correct}/{secondPlace.total} Benar</div>
                      <div className="hk-podium-time">{secondPlace.duration}</div>
                    </div>
                    <div className="hk-podium-pillar">2</div>
                  </div>
                )}

                {/* 1st Place Column (Center) */}
                {firstPlace && (
                  <div className="hk-podium-column first">
                    <div className="hk-podium-card">
                      <div className="hk-podium-medal">1</div>
                      <div className="hk-podium-name" title={firstPlace.name} style={{ fontWeight: 800 }}>{firstPlace.name}</div>
                      <div className="hk-podium-score">{firstPlace.correct}/{firstPlace.total} Benar</div>
                      <div className="hk-podium-time">{firstPlace.duration}</div>
                    </div>
                    <div className="hk-podium-pillar">1</div>
                  </div>
                )}

                {/* 3rd Place Column (Right) */}
                {thirdPlace && (
                  <div className="hk-podium-column third">
                    <div className="hk-podium-card">
                      <div className="hk-podium-medal">3</div>
                      <div className="hk-podium-name" title={thirdPlace.name}>{thirdPlace.name}</div>
                      <div className="hk-podium-score">{thirdPlace.correct}/{thirdPlace.total} Benar</div>
                      <div className="hk-podium-time">{thirdPlace.duration}</div>
                    </div>
                    <div className="hk-podium-pillar">3</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Participant Table */}
          <div className="hk-table-wrap">
            <div className="hk-table-header">
              <h3 className="hk-table-title">Daftar Seluruh Peserta</h3>
              <div className="hk-table-search">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Cari nama siswa..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                Belum ada siswa yang mengerjakan kuis ini.
              </div>
            ) : filteredResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                Tidak ada peserta yang cocok dengan pencarian.
              </div>
            ) : (
              <table className="hk-table">
                <thead>
                  <tr>
                    <th className="hk-num">No</th>
                    <th>Nama Peserta</th>
                    <th>Jawaban Benar</th>
                    <th>Skor</th>
                    <th>Waktu Pengerjaan</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r, idx) => (
                    <tr key={r.id || idx}>
                      <td className="hk-num">{idx + 1}</td>
                      <td className="hk-student-name">{r.name}</td>
                      <td>{r.correct} / {r.total}</td>
                      <td className="hk-score">{r.score}</td>
                      <td className="hk-duration">{r.duration}</td>
                      <td className="hk-date">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="hk-footer">
            © 2026 KuisKita. Dibuat dengan kegembiraan.
          </div>
        </div>
      </main>
    </div>
  )
}
