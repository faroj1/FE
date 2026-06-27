import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getQuizHasil, getQuizHasilDetail, exportQuizHasil, logoutApi } from '../utils/api'
import { clearToken, isAuthenticated } from '../utils/auth'
import NotificationDropdown from '../components/NotificationDropdown'
import '../styles/hasilkuis.css'

export default function HasilKuis() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Quiz basic info may be passed via navigate state (from KelolaKuis)
  const quizFromState = location.state?.quiz

  const [hasilData, setHasilData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Detail modal per peserta
  const [detailModal, setDetailModal]   = useState(null)   // { peserta, data: [...], extra }
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError]   = useState(null)
  // Cache of computed durations keyed by riwayat_id (overrides backend's buggy '00:00')
  const [durasiCache, setDurasiCache]   = useState({})

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }
    fetchHasil()
  }, [id])

  // ── Calculate MM:SS duration from two timestamp strings (ISO or MySQL format) ──
  // Defined BEFORE fetchHasil so it can be called inside fetchHasil safely
  const calcDurasiRaw = (mulai, selesai) => {
    if (!mulai || !selesai) return null
    const t1 = new Date(String(mulai).replace(' ', 'T'))
    const t2 = new Date(String(selesai).replace(' ', 'T'))
    const diffMs = t2 - t1
    if (isNaN(diffMs) || diffMs <= 0) return null
    const totalSec = Math.floor(diffMs / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  const calcDurasi = calcDurasiRaw  // alias used by openDetail

  // ── Fetch main results ────────────────────────────────────────────────────────
  const fetchHasil = async () => {
    setLoading(true)
    setError(null)
    const res = await getQuizHasil(id)
    if (res.ok) {
      setHasilData(res.data)
      const participants = res.data?.data || []

      // Step 1: Auto-populate durasiCache from list response if backend includes timestamps
      const cacheEntries = {}
      participants.forEach(p => {
        if (p.riwayat_id && p.waktu_mulai && p.waktu_selesai) {
          const computed = calcDurasiRaw(p.waktu_mulai, p.waktu_selesai)
          if (computed) cacheEntries[p.riwayat_id] = computed
        }
      })

      // Step 2: For participants still missing duration, batch-fetch detail in parallel
      const needsDetail = participants.filter(p =>
        p.riwayat_id && !cacheEntries[p.riwayat_id] && (!p.durasi || p.durasi === '00:00')
      )

      if (needsDetail.length > 0) {
        const detailResults = await Promise.all(
          needsDetail.map(p =>
            getQuizHasilDetail(id, p.riwayat_id)
              .then(detRes => {
                if (!detRes.ok) return null
                const inner = detRes.data?.data || detRes.data
                // Try computing from timestamps first, then fall back to backend durasi
                const computed = calcDurasiRaw(inner?.waktu_mulai, inner?.waktu_selesai)
                const durasi = computed ||
                  (inner?.durasi && inner.durasi !== '00:00' ? inner.durasi : null)
                return durasi ? [p.riwayat_id, durasi] : null
              })
              .catch(() => null)
          )
        )
        detailResults.filter(Boolean).forEach(([rid, durasi]) => {
          cacheEntries[rid] = durasi
        })
      }

      if (Object.keys(cacheEntries).length > 0) {
        setDurasiCache(cacheEntries)
      }
    } else {
      setError(res.data?.message || `Gagal memuat hasil kuis (${res.status})`)
    }
    setLoading(false)
  }

  // ── Fetch detail per peserta ──────────────────────────────────────────────────
  const openDetail = useCallback(async (peserta) => {
    setDetailModal({ peserta, data: null })
    setDetailLoading(true)
    setDetailError(null)

    const res = await getQuizHasilDetail(id, peserta.riwayat_id)

    if (res.ok) {
      const p = res.data
      // Backend returns: { message, data: { riwayat_id, nama_peserta, ..., detail_jawaban: [...] } }
      const inner = p?.data || p
      const rows =
        Array.isArray(inner?.detail_jawaban) ? inner.detail_jawaban :
        Array.isArray(inner?.detail)         ? inner.detail         :
        Array.isArray(inner?.jawaban)        ? inner.jawaban        :
        Array.isArray(p?.data)               ? p.data               :
        Array.isArray(p)                     ? p                    : []

      // Also capture durasi & times from the response for modal header
      const extra = {
        durasi:         inner?.durasi         || peserta.durasi || '—',
        waktu_mulai:    inner?.waktu_mulai    || null,
        waktu_selesai:  inner?.waktu_selesai  || null,
      }
      // Compute real duration from timestamps (overrides backend's buggy '00:00')
      const computed = calcDurasi(extra.waktu_mulai, extra.waktu_selesai)
      if (computed) {
        extra.durasi = computed
        // Cache it so the table row can show the corrected value too
        if (peserta.riwayat_id) {
          setDurasiCache(prev => ({ ...prev, [peserta.riwayat_id]: computed }))
        }
      }
      setDetailModal({ peserta, data: rows, extra })
    } else {
      const msg = res.data?.message || `Gagal memuat detail (HTTP ${res.status})`
      setDetailError(msg)
      setDetailModal({ peserta, data: [], extra: {} })
    }
    setDetailLoading(false)
  }, [id])

  const closeDetail = () => {
    setDetailModal(null)
    setDetailError(null)
  }

  // ── Backend CSV export ────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    setExporting(true)
    setExportError(null)
    const quizTitle = hasilData?.kuis?.judul || quizFromState?.judul || 'hasil_kuis'
    const result = await exportQuizHasil(id, quizTitle)
    if (!result.ok) {
      // Backend export failed — fall back to client-side CSV generation
      console.warn('[HasilKuis] Backend export failed, falling back to client-side CSV:', result.message)
      generateClientCSV()
    }
    setExporting(false)
  }

  const generateClientCSV = () => {
    const allData = hasilData?.data || []
    if (!allData.length) return
    const rows = [
      ['No', 'Nama Peserta', 'Jawaban Benar', 'Total Soal', 'Skor', 'Waktu Pengerjaan', 'Tanggal'],
      ...allData.map(p => [
        p.no ?? '',
        p.nama_peserta ?? '',
        p.jumlah_benar ?? '',
        p.total_soal ?? '',
        p.total_skor ?? '',
        p.durasi ?? '',
        p.tanggal ?? '',
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hasil_kuis_${id}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Logout ────────────────────────────────────────────────────────────────────
  const confirmLogout = async () => {
    setShowLogoutModal(false)
    await logoutApi()
    clearToken()
    navigate('/login')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const formatAvgNilai = (avg) => {
    if (avg === null || avg === undefined) return '—'
    const num = parseFloat(avg)
    return isNaN(num) ? '—' : num.toFixed(1)
  }

  const avatarBg = (name) => {
    const code = (name || 'P').charCodeAt(0)
    return `hsl(${(code * 47) % 360}, 60%, 88%)`
  }
  const avatarColor = (name) => {
    const code = (name || 'P').charCodeAt(0)
    return `hsl(${(code * 47) % 360}, 55%, 32%)`
  }

  const scoreColor = (benar, total) => {
    const ratio = total > 0 ? benar / total : 0
    if (ratio >= 0.7) return '#10b981'
    if (ratio >= 0.4) return '#f59e0b'
    return '#ef4444'
  }


  // ── Derived values ────────────────────────────────────────────────────────────
  const durationToSeconds = (durStr) => {
    if (!durStr || durStr === '—' || durStr === '00:00') return null
    const parts = durStr.split(':')
    if (parts.length !== 2) return null
    const min = parseInt(parts[0], 10)
    const sec = parseInt(parts[1], 10)
    if (isNaN(min) || isNaN(sec)) return null
    return min * 60 + sec
  }

  const secondsToDuration = (totalSec) => {
    const min = Math.floor(totalSec / 60)
    const sec = Math.round(totalSec % 60)
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const getComputedStats = () => {
    const participants = hasilData?.data || []
    if (!participants.length) return { fastest: '—', average: '—' }

    let minSecs = Infinity
    let totalSecs = 0
    let count = 0

    participants.forEach(p => {
      const dur = durasiCache[p.riwayat_id] || (p.durasi && p.durasi !== '00:00' ? p.durasi : null)
      if (dur) {
        const secs = durationToSeconds(dur)
        if (secs !== null) {
          if (secs < minSecs) minSecs = secs
          totalSecs += secs
          count++
        }
      }
    })

    if (count === 0) return { fastest: '—', average: '—' }

    const fastestStr = secondsToDuration(minSecs)
    const averageStr = secondsToDuration(totalSecs / count)

    return { fastest: fastestStr, average: averageStr }
  }

  const computedStats = getComputedStats()

  const filteredData = (hasilData?.data || []).filter(p =>
    !search || (p.nama_peserta || '').toLowerCase().includes(search.toLowerCase())
  )

  const quizTitle = hasilData?.kuis?.judul || quizFromState?.judul || quizFromState?.title || 'Hasil Kuis'
  const quizDate = hasilData?.kuis?.tgl_dibuat
    ? new Date(hasilData.kuis.tgl_dibuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  // Podium arranged 2nd | 1st | 3rd
  const podiumRaw = hasilData?.podium || []
  const podiumFirst  = podiumRaw.find(p => p.rank === 1)
  const podiumSecond = podiumRaw.find(p => p.rank === 2)
  const podiumThird  = podiumRaw.find(p => p.rank === 3)

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="hk-root">

      {/* ── Sidebar ── */}
      <aside className="hk-sidebar">
        <div>
          <div className="hk-logo" onClick={() => navigate('/')}>KuisKita</div>
          <nav className="hk-nav">
            <button className="hk-nav-item" onClick={() => navigate('/dashboard')}>
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
                <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
              </svg>
              Dashboard
            </button>
            <button className="hk-nav-item active" onClick={() => navigate('/kelola-kuis')}>
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              Kelola Kuis
            </button>
            <button className="hk-nav-item" onClick={() => navigate('/profil')}>
              <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Profil
            </button>
          </nav>
        </div>
        <div className="hk-sidebar-footer">
          <button className="hk-nav-item" onClick={() => navigate('/bantuan')}>
            <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Bantuan
          </button>
          <button className="hk-nav-item logout" onClick={() => setShowLogoutModal(true)}>
            <svg className="icon-svg" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="hk-main">
        <header className="hk-header-row">
          <NotificationDropdown buttonClass="hk-icon-btn" />
          <div className="hk-icon-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </div>
        </header>

        <div className="hk-container">

          {/* Breadcrumb */}
          <div className="hk-breadcrumb">
            <a onClick={() => navigate('/kelola-kuis')}>Kelola Kuis</a>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span className="current">Hasil Kuis</span>
          </div>

          {/* ── Loading ── */}
          {loading ? (
            <div className="hk-loading">
              <div className="hk-spinner"/>
              <p>Memuat hasil kuis dari server...</p>
            </div>

          /* ── Error ── */
          ) : error ? (
            <div className="hk-error">
              <div className="hk-error-icon">😕</div>
              <h2>Gagal Memuat Data</h2>
              <p>{error}</p>
              <button className="hk-btn-back" onClick={fetchHasil} style={{ marginRight: 12 }}>
                Coba Lagi
              </button>
              <button className="hk-btn-back" style={{ background: '#64748b' }} onClick={() => navigate('/kelola-kuis')}>
                Kembali
              </button>
            </div>

          /* ── Content ── */
          ) : (
            <>
              {/* Title Row */}
              <div className="hk-title-row">
                <div>
                  <h1 className="hk-quiz-title">Hasil Kuis: {quizTitle}</h1>
                  <p className="hk-quiz-subtitle">Diselenggarakan pada {quizDate}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <button
                    className="hk-btn-export"
                    onClick={handleExportCSV}
                    disabled={exporting || !(hasilData?.data?.length)}
                  >
                    {exporting ? (
                      <>
                        <div style={{ width: 14, height: 14, border: '2px solid #94a3b8', borderTopColor: '#475569', borderRadius: '50%', animation: 'hk-spin 0.7s linear infinite' }}/>
                        Mengunduh...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Ekspor CSV
                      </>
                    )}
                  </button>
                  {exportError && (
                    <span style={{ fontSize: 12, color: '#ef4444' }}>{exportError}</span>
                  )}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="hk-stats-row">
                <div className="hk-stat-card">
                  <div className="hk-stat-icon blue">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div>
                    <div className="hk-stat-label">Total Peserta</div>
                    <div className="hk-stat-value">
                      {hasilData?.statistik?.total_peserta ?? 0}
                      <span className="hk-stat-unit">siswa</span>
                    </div>
                  </div>
                </div>

                <div className="hk-stat-card">
                  <div className="hk-stat-icon green">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  <div>
                    <div className="hk-stat-label">Rata-rata Nilai</div>
                    <div className="hk-stat-value">
                      {formatAvgNilai(hasilData?.statistik?.rata_rata_nilai)}
                      <span className="hk-stat-unit">/ 100</span>
                    </div>
                  </div>
                </div>

                <div className="hk-stat-card">
                  <div className="hk-stat-icon orange">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <div className="hk-stat-label">Waktu Tercepat</div>
                    <div className="hk-stat-value">
                      {hasilData?.statistik?.waktu_tercepat && hasilData.statistik.waktu_tercepat !== '00:00'
                        ? hasilData.statistik.waktu_tercepat : (computedStats.fastest || '—')}
                      <span className="hk-stat-unit">Menit</span>
                    </div>
                  </div>
                </div>

                <div className="hk-stat-card">
                  <div className="hk-stat-icon purple">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l3 3"/>
                      <path d="M3.05 11a9 9 0 0 1 1.7-4.35"/>
                      <path d="M20.95 13a9 9 0 0 1-1.7 4.35"/>
                    </svg>
                  </div>
                  <div>
                    <div className="hk-stat-label">Rata-rata Waktu</div>
                    <div className="hk-stat-value">
                      {hasilData?.statistik?.rata_rata_waktu && hasilData.statistik.rata_rata_waktu !== '00:00'
                        ? hasilData.statistik.rata_rata_waktu : (computedStats.average || '—')}
                      <span className="hk-stat-unit">Menit</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Podium */}
              {podiumRaw.length > 0 && (
                <div className="hk-podium-wrap">
                  <div className="hk-podium-title">🏆 PAPAN PERINGKAT</div>
                  <div className="hk-podium">

                    {/* 2nd Place */}
                    <div className="hk-podium-column second">
                      {podiumSecond ? (
                        <div className="hk-podium-card">
                          <div className="hk-podium-medal">2</div>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarBg(podiumSecond.nama_peserta), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: avatarColor(podiumSecond.nama_peserta), margin: '0 auto 8px' }}>
                            {(podiumSecond.nama_peserta || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div className="hk-podium-name">{podiumSecond.nama_peserta}</div>
                          <div className="hk-podium-score">{podiumSecond.jumlah_benar}/{podiumSecond.total_soal} Benar</div>
                          <div className="hk-podium-time">
                            {durasiCache[podiumSecond.riwayat_id] ||
                              (podiumSecond.durasi && podiumSecond.durasi !== '00:00' ? podiumSecond.durasi : '—')}
                          </div>
                        </div>
                      ) : <div style={{ height: 80 }}/>}
                      <div className="hk-podium-pillar">2</div>
                    </div>

                    {/* 1st Place */}
                    <div className="hk-podium-column first">
                      {podiumFirst ? (
                        <div className="hk-podium-card">
                          <div className="hk-podium-medal">1</div>
                          <div style={{ width: 52, height: 52, borderRadius: '50%', background: avatarBg(podiumFirst.nama_peserta), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: avatarColor(podiumFirst.nama_peserta), margin: '0 auto 8px', border: '3px solid #eab308', boxShadow: '0 4px 14px rgba(234,179,8,0.3)' }}>
                            {(podiumFirst.nama_peserta || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div className="hk-podium-name">{podiumFirst.nama_peserta}</div>
                          <div className="hk-podium-score">{podiumFirst.jumlah_benar}/{podiumFirst.total_soal} Benar</div>
                          <div className="hk-podium-time">
                            {durasiCache[podiumFirst.riwayat_id] ||
                              (podiumFirst.durasi && podiumFirst.durasi !== '00:00' ? podiumFirst.durasi : '—')}
                          </div>
                        </div>
                      ) : <div style={{ height: 80 }}/>}
                      <div className="hk-podium-pillar">1</div>
                    </div>

                    {/* 3rd Place */}
                    <div className="hk-podium-column third">
                      {podiumThird ? (
                        <div className="hk-podium-card">
                          <div className="hk-podium-medal">3</div>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarBg(podiumThird.nama_peserta), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: avatarColor(podiumThird.nama_peserta), margin: '0 auto 8px' }}>
                            {(podiumThird.nama_peserta || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div className="hk-podium-name">{podiumThird.nama_peserta}</div>
                          <div className="hk-podium-score">{podiumThird.jumlah_benar}/{podiumThird.total_soal} Benar</div>
                          <div className="hk-podium-time">
                            {durasiCache[podiumThird.riwayat_id] ||
                              (podiumThird.durasi && podiumThird.durasi !== '00:00' ? podiumThird.durasi : '—')}
                          </div>
                        </div>
                      ) : <div style={{ height: 80 }}/>}
                      <div className="hk-podium-pillar">3</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Participants Table */}
              <div className="hk-table-wrap">
                <div className="hk-table-header">
                  <h2 className="hk-table-title">Daftar Seluruh Peserta</h2>
                  <div className="hk-table-search">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Cari nama siswa..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                {filteredData.length === 0 ? (
                  <div className="hk-empty">
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                    <p>
                      {search
                        ? `Tidak ditemukan peserta dengan nama "${search}"`
                        : 'Belum ada peserta yang mengerjakan kuis ini.'}
                    </p>
                  </div>
                ) : (
                  <table className="hk-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Nama Peserta</th>
                        <th>Jawaban Benar</th>
                        <th>Waktu Pengerjaan</th>
                        <th>Tanggal</th>
                        <th style={{ textAlign: 'center' }}>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((p, i) => (
                        <tr key={p.riwayat_id ?? i}>
                          <td className="hk-num">{p.no ?? i + 1}</td>
                          <td className="hk-student-name">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: avatarBg(p.nama_peserta),
                                color: avatarColor(p.nama_peserta),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 700, flexShrink: 0,
                              }}>
                                {(p.nama_peserta || 'P').charAt(0).toUpperCase()}
                              </div>
                              {p.nama_peserta}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="hk-score">{p.jumlah_benar} / {p.total_soal}</span>
                              <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, minWidth: 60, maxWidth: 80, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', borderRadius: 3,
                                  background: scoreColor(p.jumlah_benar, p.total_soal),
                                  width: `${p.total_soal > 0 ? Math.round((p.jumlah_benar / p.total_soal) * 100) : 0}%`,
                                  transition: 'width 0.5s ease',
                                }}/>
                              </div>
                            </div>
                          </td>
                          <td className="hk-duration">
                            {durasiCache[p.riwayat_id] || (p.durasi && p.durasi !== '00:00' ? p.durasi : '—')}
                          </td>
                          <td className="hk-date">{p.tanggal}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => openDetail(p)}
                              title="Lihat detail jawaban"
                              style={{
                                background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe',
                                borderRadius: 8, padding: '5px 12px', fontSize: 12.5, fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { e.target.style.background = '#2563eb'; e.target.style.color = '#fff' }}
                              onMouseLeave={e => { e.target.style.background = '#eff6ff'; e.target.style.color = '#2563eb' }}
                            >
                              Lihat
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="hk-footer">© 2026 KuisKita. Dibuat dengan kegembiraan.</div>
            </>
          )}
        </div>
      </main>

      {/* ── Detail Jawaban Modal ── */}
      {detailModal && (
        <div
          className="global-modal-overlay"
          onClick={e => e.target === e.currentTarget && closeDetail()}
          style={{ zIndex: 1000 }}
        >
          <div className="global-modal" style={{ maxWidth: 680, width: '92vw', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Detail Jawaban</h2>
                <p className="sub" style={{ margin: '4px 0 0', fontSize: 13.5 }}>
                  Peserta: <strong>{detailModal.peserta?.nama_peserta}</strong>
                  &nbsp;·&nbsp;{detailModal.peserta?.jumlah_benar}/{detailModal.peserta?.total_soal} Benar
                  &nbsp;·&nbsp;Waktu: <strong>{detailModal.extra?.durasi || detailModal.peserta?.durasi || '—'}</strong>
                  {detailModal.extra?.waktu_mulai && (
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>
                      &nbsp;({detailModal.extra.waktu_mulai?.slice(11, 16)} – {detailModal.extra.waktu_selesai?.slice(11, 16)})
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={closeDetail}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
                aria-label="Tutup"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, marginTop: 16 }}>
              {detailLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', color: '#94a3b8', gap: 14 }}>
                  <div className="hk-spinner"/>
                  <p>Memuat detail dari server...</p>
                </div>
              ) : detailError ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
                  <p>{detailError}</p>
                </div>
              ) : !detailModal.data?.length ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                  <p>Detail jawaban tidak tersedia.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>No</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pertanyaan</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Jawaban</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Benar</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailModal.data.map((row, idx) => {
                      // Backend returns: { soal_id, urutan, pertanyaan, jawaban_dipilih, jawaban_benar, status }
                      const no           = row.urutan ?? row.no ?? idx + 1
                      const pertanyaan   = row.pertanyaan ?? row.soal_soal ?? row.soal ?? row.question ?? '—'
                      const jawabanUser  = row.jawaban_dipilih ?? row.jawaban_user ?? row.jawaban_peserta ?? null
                      const jawabanBenar = row.jawaban_benar ?? row.kunci ?? ''
                      // Use backend status string directly: 'correct' | 'incorrect' | 'unanswered'
                      const status = row.status ||
                        (jawabanUser === null ? 'unanswered' :
                         jawabanUser?.toLowerCase() === jawabanBenar?.toLowerCase() ? 'correct' : 'incorrect')

                      const displayUser  = jawabanUser  ? String(jawabanUser).toUpperCase()  : '—'
                      const displayBenar = jawabanBenar ? String(jawabanBenar).toUpperCase() : '—'

                      const statusBadge = status === 'correct'
                        ? <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>✓ Benar</span>
                        : status === 'unanswered'
                          ? <span style={{ background: '#f8fafc', color: '#94a3b8', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>— Tidak Dijawab</span>
                          : <span style={{ background: '#fef2f2', color: '#ef4444', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>✗ Salah</span>

                      return (
                        <tr key={row.soal_id ?? idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: 700 }}>{no}</td>
                          <td style={{ padding: '12px 14px', color: '#334155', maxWidth: 260 }}>{pertanyaan}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{
                              background: jawabanUser ? '#eff6ff' : '#f8fafc',
                              color: jawabanUser ? '#2563eb' : '#94a3b8',
                              borderRadius: 6, padding: '2px 10px', fontWeight: 700
                            }}>
                              {displayUser}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 6, padding: '2px 10px', fontWeight: 700 }}>
                              {displayBenar}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {statusBadge}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={closeDetail}
                style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout Confirmation Modal ── */}
      {showLogoutModal && (
        <div className="global-modal-overlay">
          <div className="global-modal">
            <div className="global-modal-icon warning">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
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
