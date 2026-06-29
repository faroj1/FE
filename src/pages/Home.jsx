import { useState } from 'react'
import Swal from 'sweetalert2'
import '../styles/home.css'
import { Link, useNavigate } from 'react-router-dom'
import { joinQuizByCode } from '../utils/api'

export default function Home() {
  const [nama, setNama] = useState('')
  const [kode, setKode] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleJoinQuiz = async (e) => {
    e.preventDefault()
    setError(null)

    if (!nama.trim()) return setError('Silakan masukkan nama Anda.')
    if (!kode.trim()) return setError('Silakan masukkan kode kuis.')

    const trimmedKode = kode.trim().toUpperCase()

    try {
      const res = await joinQuizByCode(trimmedKode)
      if (!res.ok) {
        if (res.status === 404) {
          await Swal.fire({
            icon: 'error',
            title: 'Kuis Tidak Ditemukan',
            text: 'Maaf, kode kuis yang Anda masukkan salah atau sudah tidak aktif. Silakan periksa kembali kode Anda.',
            confirmButtonText: 'Coba Lagi',
            confirmButtonColor: '#2563eb',
            allowOutsideClick: false,
            allowEscapeKey: false,
          })
          return
        }

        setError(res.data?.message || `Gagal memuat kuis (${res.status || 'error jaringan'}).`)
        return
      }

      // Save participant name to sessionStorage and navigate
      sessionStorage.setItem('quiz_participant_name', nama.trim())
      navigate(`/kerjakan-kuis/${trimmedKode}`, {
        state: { nama: nama.trim() }
      })
    } catch (err) {
      setError('Terjadi kesalahan saat memeriksa kode kuis. Silakan coba lagi.')
    }
  }

  return (
    <div className="home-root">
      <div className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-text">
            <div className="pill">UJI KEMAMPUANMU SEKARANG!</div>
            <h1>
              Uji Pengetahuanmu di
              <br />
              <span className="brand">KuisKita!</span>
            </h1>
            <p className="lead">Masukkan namamu dan kode kuis untuk bergabung ke dalam dunia pengetahuan yang penuh dengan kejutan dan hadiah!</p>
          </div>

          <div className="hero-card">
            <form className="hero-form" onSubmit={handleJoinQuiz}>
              <div className="hero-form-fields">
                <div className="field">
                  <label>Nama Anda</label>
                  <input 
                    placeholder="Contoh: Petualang Hebat" 
                    value={nama} 
                    onChange={(e) => setNama(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Kode Kuis</label>
                  <input 
                    placeholder="000 - 000" 
                    value={kode} 
                    onChange={(e) => setKode(e.target.value.toUpperCase())}
                    maxLength={9}
                    style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}
                  />
                </div>

                <button type="submit" className="primary">Gabung Kuis!</button>
              </div>

              {error && <div className="hero-form-error">{error}</div>}
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: 22 }}>
            <Link to="/daftar-kuis" style={{ background: '#ffe9cf', border: 'none', padding: '10px 22px', borderRadius: '8px', color: '#6b4a13', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>Jelajahi Kuis Umum</Link>
          </div>
        </div>
      </div>
      
      <section className="steps-section">
        <div className="container">
          <div className="section-head">
            <div className="kicker">PANDUAN CEPAT</div>
            <h2>Langkah Mudah Memulai <span className="brand">Petualangan Belajarmu</span></h2>
            <p className="muted">Hanya butuh 3 langkah sederhana untuk mulai berkompetisi dan menjadi juara.</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">1</div>
              <div className="step-body">
                <h4>Masukkan Kode</h4>
                <p>Masukkan kode unik dari gurumu atau telusuri koleksi kuis publik kami yang menarik.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-num">2</div>
              <div className="step-body">
                <h4>Kerjakan Kuis</h4>
                <p>Jawab pertanyaan dengan fokus. Kecepatan dan ketepatan adalah kunci meraih skor tertinggi!</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-num">3</div>
              <div className="step-body">
                <h4>Lihat Hasil</h4>
                <p>Hasil kuis akan ditampilkan setelah kamu menyelesaikan dan mengirim jawaban.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="categories-section">
        <div className="container">
          <h3 className="section-title">Kategori Kuis Terpopuler</h3>
          <p className="muted">Pilih kategori favoritmu dan mulai tantangan baru hari ini!</p>

          <div className="categories-grid">
            <div className="cat-card">
              <div className="cat-icon">🔬</div>
              <h4>Sains</h4>
              <p>Jelajahi misteri alam semesta, biologi, dan fisika yang menakjubkan.</p>
              <Link className="cat-link" to="/daftar-kuis">Lihat Kuis →</Link>
            </div>

            <div className="cat-card">
              <div className="cat-icon">➗</div>
              <h4>Matematika</h4>
              <p>Asah logika dan kemampuan berhitungmu dengan tantangan angka.</p>
              <Link className="cat-link" to="/daftar-kuis">Lihat Kuis →</Link>
            </div>

            <div className="cat-card">
              <div className="cat-icon">🌐</div>
              <h4>Bahasa</h4>
              <p>Tingkatkan kemampuan kosakata dan tata bahasamu di sini.</p>
              <Link className="cat-link" to="/daftar-kuis">Lihat Kuis →</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="container">
          <h3 className="section-title">Pertanyaan Umum (FAQ)</h3>
          <p className="muted">Punya pertanyaan seputar KuisKita? Mungkin jawabannya ada di bawah ini.</p>

          <div className="faq-list">
            <details>
              <summary>Bagaimana cara bergabung kuis?</summary>
              <div className="faq-body">Cukup masukkan namamu dan 6 digit kode kuis yang diberikan oleh gurumu di kolom "Join Quiz" di bagian atas halaman ini, lalu klik tombol "Gabung Kuis!".</div>
            </details>

            <details>
              <summary>Apakah kuis ini berbayar?</summary>
              <div className="faq-body">Tidak, sebagian besar kuis kami gratis. Beberapa kuis spesial mungkin memerlukan akses khusus.</div>
            </details>

            <details>
              <summary>Bagaimana cara melihat skor?</summary>
              <div className="faq-body">Skor akan muncul setelah kamu menyelesaikan kuis dan mengirim jawaban. Kamu juga dapat melihat riwayat skor di dashboard.</div>
            </details>
          </div>
        </div>
      </section>
    </div>
  )
}
