import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createQuiz, createSoal, logoutApi } from '../utils/api'
import { clearToken, isAuthenticated } from '../utils/auth'
import '../styles/buatkuis.css'

const ANSWER_LETTERS = ['A', 'B', 'C', 'D']

const makeQuestion = () => ({
  id: Date.now() + Math.random(),
  text: '',
  image: null,         // base64 for question image
  imagePreview: null,  // object URL for display
  bobot: 10,
  answers: ANSWER_LETTERS.map(l => ({
    letter: l,
    text: '',
    is_correct: false,
    image: null,        // base64 string
    imagePreview: null, // local object URL for display
  }))
})

// Read file as base64 and return { base64, preview }
const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve({ base64: e.target.result, preview: e.target.result })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export default function BuatKuis() {
  const navigate = useNavigate()

  const [info, setInfo] = useState({
    title: '',
    description: '',
    category: '',
    class: '',
    time_limit: 60,
  })

  const [access, setAccess] = useState('publik')
  const [questions, setQuestions] = useState([makeQuestion()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Refs for file inputs: { [qId_letter]: ref }
  const ansImgRefs = useRef({})
  const qImgRefs = useRef({})

  if (!isAuthenticated()) {
    navigate('/login', { replace: true })
    return null
  }

  const handleLogout = async () => {
    await logoutApi()
    clearToken()
    navigate('/login')
  }

  const setInfoField = (key, val) => setInfo(prev => ({ ...prev, [key]: val }))

  // ─── Question handlers ───────────────────────────────
  const addQuestion = () => setQuestions(prev => [...prev, makeQuestion()])

  const removeQuestion = (id) => {
    if (questions.length === 1) return
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const updateQuestion = (id, key, val) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [key]: val } : q))
  }

  const handleQuestionImageChange = async (qId, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Ukuran gambar maksimal 5MB'); return }
    const { base64, preview } = await readFileAsBase64(file)
    setQuestions(prev => prev.map(q =>
      q.id === qId ? { ...q, image: base64, imagePreview: preview } : q
    ))
  }

  const removeQuestionImage = (qId) => {
    setQuestions(prev => prev.map(q =>
      q.id === qId ? { ...q, image: null, imagePreview: null } : q
    ))
    if (qImgRefs.current[qId]) qImgRefs.current[qId].value = ''
  }

  // ─── Answer handlers ─────────────────────────────────
  const updateAnswer = (qId, letter, key, val) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      return { ...q, answers: q.answers.map(a => a.letter === letter ? { ...a, [key]: val } : a) }
    }))
  }

  const setCorrectAnswer = (qId, letter) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      return { ...q, answers: q.answers.map(a => ({ ...a, is_correct: a.letter === letter })) }
    }))
  }

  const handleAnswerImageChange = async (qId, letter, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Ukuran gambar maksimal 5MB'); return }
    const { base64, preview } = await readFileAsBase64(file)
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      return {
        ...q,
        answers: q.answers.map(a =>
          a.letter === letter ? { ...a, image: base64, imagePreview: preview } : a
        )
      }
    }))
  }

  const removeAnswerImage = (qId, letter) => {
    const refKey = `${qId}_${letter}`
    if (ansImgRefs.current[refKey]) ansImgRefs.current[refKey].value = ''
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      return {
        ...q,
        answers: q.answers.map(a =>
          a.letter === letter ? { ...a, image: null, imagePreview: null } : a
        )
      }
    }))
  }

  // ─── Submit ───────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!info.title.trim()) return setError('Judul kuis tidak boleh kosong.')
    if (!info.category) return setError('Kategori kuis wajib dipilih.')
    if (questions.some(q => !q.text.trim())) return setError('Setiap soal harus memiliki pertanyaan.')
    if (questions.some(q => !q.answers.some(a => a.is_correct))) return setError('Setiap soal harus memiliki jawaban yang benar.')

    setSubmitting(true)

    // Step 1: Create the quiz with Indonesian field names
    const kuisPayload = {
      judul: info.title,
      deskripsi: info.description,
      kategori: info.category,
      kelas: info.class,
      soal_waktu: Number(info.time_limit),
      akses: access,
      status: 'Draft',
    }

    const res = await createQuiz(kuisPayload)

    if (!res.ok) {
      setSubmitting(false)
      setError(res.data?.message || `Gagal menyimpan kuis (${res.status || 'network error'})`)
      return
    }

    const kuisId = res.data?.data?.kuis_id

    // Step 2: Create each question via POST /api/soal
    if (kuisId) {
      for (const q of questions) {
        // Find the correct answer letter
        const correctAnswer = q.answers.find(a => a.is_correct)
        const jawaban_benar = correctAnswer ? correctAnswer.letter : 'A'

        const soalPayload = {
          kuis_id: kuisId,
          soal_soal: q.text,
          jawaban_a: q.answers.find(a => a.letter === 'A')?.text || '',
          jawaban_b: q.answers.find(a => a.letter === 'B')?.text || '',
          jawaban_c: q.answers.find(a => a.letter === 'C')?.text || '',
          jawaban_d: q.answers.find(a => a.letter === 'D')?.text || '',
          jawaban_benar: jawaban_benar,
          bobot_poin: Number(q.bobot),
        }

        const soalRes = await createSoal(soalPayload)
        if (!soalRes.ok) {
          console.warn('[BuatKuis] Gagal menyimpan soal:', soalRes.data?.message)
        }
      }
    }

    setSubmitting(false)
    navigate('/kelola-kuis')
  }

  return (
    <div className="bk-root">
      {/* ─── Sidebar ─── */}
      <aside className="bk-sidebar">
        <div>
          <div className="bk-logo" onClick={() => navigate('/')}>KuisKita</div>
          <nav className="bk-nav">
            <button className="bk-nav-item" onClick={() => navigate('/dashboard')}>
              <svg className="bk-icon" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
              </svg>
              Dashboard
            </button>
            <button className="bk-nav-item active" onClick={() => navigate('/kelola-kuis')}>
              <svg className="bk-icon" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Kelola Kuis
            </button>
            <button className="bk-nav-item">
              <svg className="bk-icon" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Profil
            </button>
          </nav>
        </div>
        <div className="bk-sidebar-footer">
          <button className="bk-nav-item">
            <svg className="bk-icon" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Bantuan
          </button>
          <button className="bk-nav-item logout" onClick={handleLogout}>
            <svg className="bk-icon" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main className="bk-main">
        <header className="bk-header-row">
          <button className="bk-icon-btn" aria-label="Notifikasi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <div className="bk-icon-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="bk-container">
            {/* Breadcrumb */}
            <div className="bk-breadcrumb">
              <a onClick={() => navigate('/kelola-kuis')}>Kelola Kuis</a>
              <span>›</span>
              <span>Buat Kuis Baru</span>
            </div>

            {error && <div className="bk-error">{error}</div>}

            {/* ── Informasi Utama ── */}
            <div className="bk-card">
              <h2 className="bk-section-title">Informasi Utama</h2>

              <div className="bk-field">
                <label className="bk-label">Judul Kuis</label>
                <input className="bk-input" type="text" placeholder="Contoh: Ujian Akhir Semester Biologi" value={info.title} onChange={e => setInfoField('title', e.target.value)} required />
              </div>

              <div className="bk-field">
                <label className="bk-label">Deskripsi Kuis</label>
                <textarea className="bk-textarea" placeholder="Jelaskan tujuan dan materi yang diujikan..." value={info.description} onChange={e => setInfoField('description', e.target.value)} />
              </div>

              <div className="bk-row">
                <div className="bk-field">
                  <label className="bk-label">Kategori</label>
                  <select className="bk-select" value={info.category} onChange={e => setInfoField('category', e.target.value)}>
                    <option value="">Pilih Kategori</option>
                    <option>Matematika</option><option>IPA / Sains</option><option>IPS / Sejarah</option>
                    <option>Bahasa Indonesia</option><option>Bahasa Inggris</option><option>Fisika</option>
                    <option>Kimia</option><option>Biologi</option><option>Geografi</option><option>Lainnya</option>
                  </select>
                </div>
                <div className="bk-field">
                  <label className="bk-label">Kelas</label>
                  <input className="bk-input" type="text" placeholder="Contoh: X" value={info.class} onChange={e => setInfoField('class', e.target.value)} />
                </div>
              </div>

              <div className="bk-field">
                <label className="bk-label">Durasi (Menit)</label>
                <div className="bk-duration-wrap">
                  <input className="bk-input" type="number" min="1" max="300" value={info.time_limit} onChange={e => setInfoField('time_limit', e.target.value)} />
                  <span className="bk-duration-label">Menit</span>
                </div>
              </div>
            </div>

            {/* ── Akses Kuis ── */}
            <div className="bk-card">
              <h2 className="bk-section-title">Akses Kuis</h2>
              <div className="bk-access-grid">
                <label className={`bk-access-option ${access === 'publik' ? 'selected' : ''}`}>
                  <input type="radio" name="access" value="publik" checked={access === 'publik'} onChange={() => setAccess('publik')} />
                  <div className="bk-access-info">
                    <h4>Publik</h4>
                    <p>Kuis dapat diakses oleh siapa saja yang memiliki tautan</p>
                  </div>
                </label>
                <label className={`bk-access-option ${access === 'private' ? 'selected' : ''}`}>
                  <input type="radio" name="access" value="private" checked={access === 'private'} onChange={() => setAccess('private')} />
                  <div className="bk-access-info">
                    <h4>Privat</h4>
                    <p>Hanya bisa di akses menggunakan kode</p>
                  </div>
                </label>
              </div>
            </div>

            {/* ── Soal-Soal ── */}
            {questions.map((q, idx) => (
              <div key={q.id} className="bk-question-card">
                {/* Question Header */}
                <div className="bk-question-header">
                  <div className="bk-question-label">
                    <span className="bk-question-num">Soal {idx + 1}</span>
                    <div className="bk-poin-badge">
                      BOBOT POIN:
                      <input type="number" min="1" max="100" value={q.bobot} onChange={e => updateQuestion(q.id, 'bobot', e.target.value)} />
                    </div>
                  </div>
                  <button type="button" className="bk-delete-btn" onClick={() => removeQuestion(q.id)} disabled={questions.length === 1} title="Hapus soal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>

                {/* Question text */}
                <textarea className="bk-question-textarea" placeholder="Tuliskan pertanyaan Anda di sini..." value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)} />

                {/* Question image upload */}
                <input
                  type="file"
                  accept="image/*"
                  className="bk-ans-file-input"
                  ref={el => qImgRefs.current[q.id] = el}
                  onChange={e => handleQuestionImageChange(q.id, e)}
                />
                {!q.imagePreview ? (
                  <button type="button" className="bk-add-img-btn" onClick={() => qImgRefs.current[q.id]?.click()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                    Tambah Gambar Soal
                  </button>
                ) : (
                  <div className="bk-answer-img-wrap" style={{ marginLeft: 0, marginBottom: 16 }}>
                    <img src={q.imagePreview} alt="Gambar soal" className="bk-answer-img-preview" style={{ width: 200, height: 130 }} />
                    <button type="button" className="bk-remove-img-btn" onClick={() => removeQuestionImage(q.id)} title="Hapus gambar">✕</button>
                  </div>
                )}

                {/* Answers */}
                <div className="bk-answers">
                  {q.answers.map(a => {
                    const refKey = `${q.id}_${a.letter}`
                    return (
                      <div key={a.letter}>
                        <div className="bk-answer-row">
                          <div className={`bk-answer-letter ${a.is_correct ? 'correct' : ''}`}>{a.letter}</div>
                          <input
                            type="text"
                            className={`bk-answer-input ${a.is_correct ? 'correct-answer' : ''}`}
                            placeholder={`Pilihan jawaban ${a.letter}`}
                            value={a.text}
                            onChange={e => updateAnswer(q.id, a.letter, 'text', e.target.value)}
                          />

                          {/* Image toggle for this answer */}
                          <input
                            type="file"
                            accept="image/*"
                            className="bk-ans-file-input"
                            ref={el => ansImgRefs.current[refKey] = el}
                            onChange={e => handleAnswerImageChange(q.id, a.letter, e)}
                          />
                          <button
                            type="button"
                            className={`bk-ans-img-btn ${a.imagePreview ? 'has-image' : ''}`}
                            onClick={() => ansImgRefs.current[refKey]?.click()}
                            title={a.imagePreview ? 'Ganti gambar jawaban' : 'Tambah gambar jawaban'}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                            </svg>
                            {a.imagePreview ? '✓ Gambar' : '+ Gambar'}
                          </button>

                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            className="bk-correct-radio"
                            checked={a.is_correct}
                            onChange={() => setCorrectAnswer(q.id, a.letter)}
                            title="Tandai sebagai jawaban benar"
                          />
                        </div>

                        {/* Image preview for this answer */}
                        {a.imagePreview && (
                          <div className="bk-answer-img-wrap">
                            <img
                              src={a.imagePreview}
                              alt={`Gambar jawaban ${a.letter}`}
                              className={`bk-answer-img-preview ${a.is_correct ? 'bk-answer-img-correct' : ''}`}
                            />
                            <button
                              type="button"
                              className="bk-remove-img-btn"
                              onClick={() => removeAnswerImage(q.id, a.letter)}
                              title="Hapus gambar"
                            >✕</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <p className="bk-hint-text">* Klik pada radio button untuk menandai jawaban yang benar · Klik "+ Gambar" untuk menambah gambar pada pilihan</p>
              </div>
            ))}

            {/* Add soal & Import */}
            <div className="bk-bottom-bar">
              <button type="button" className="bk-btn-add-soal" onClick={addQuestion}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tambah Soal Baru
              </button>
              <button type="button" className="bk-btn-import">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Import dari Excel
              </button>
            </div>

            <div className="bk-footer">© 2026 KuisKita. Dibuat dengan kegembiraan.</div>
          </div>

          {/* Sticky submit bar */}
          <div className="bk-submit-bar">
            <button type="button" className="bk-btn-cancel" onClick={() => navigate('/kelola-kuis')}>Batal</button>
            <button type="submit" className="bk-btn-submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : '💾  Simpan Kuis'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
