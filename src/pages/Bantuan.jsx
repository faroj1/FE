import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutApi } from '../utils/api'
import { clearToken } from '../utils/auth'
import '../styles/bantuan.css'

const categories = [
  {
    id: 'buat-kuis',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
    title: 'Cara Membuat Kuis',
    desc: 'Panduan lengkap untuk langkah membuat dan mengatur kuis pertama Anda.',
  },
  {
    id: 'manajemen-siswa',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Manajemen Siswa',
    desc: 'Cara mengundang siswa, mengatur kelas, dan melihat laporan perkembangan.',
  },
  {
    id: 'akun-keamanan',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Akun & Keamanan',
    desc: 'Pengaturan profil, ganti kata sandi, dan manajemen privasi akun Anda.',
  },
  {
    id: 'panduan-siswa',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: 'Panduan Siswa',
    desc: 'Artikel khusus untuk membantu siswa bergabung dan mengerjakan kuis.',
  },
]

const faqs = [
  {
    q: 'Bagaimana cara impor soal dari Excel?',
    a: 'Saat ini impor soal dari Excel belum tersedia secara langsung. Anda dapat menambahkan soal secara manual melalui halaman Detail Kuis, lalu klik tombol "+ Tambah Soal".',
  },
  {
    q: 'Bagaimana cara membagikan kuis ke siswa?',
    a: 'Setelah kuis dipublikasikan, untuk kuis Publik siswa dapat langsung mengaksesnya dari halaman Daftar Kuis. Untuk kuis Private, bagikan kode kuis yang muncul di tabel Kelola Kuis kepada siswa.',
  },
  {
    q: 'Apakah saya bisa mengatur batas waktu pengerjaan?',
    a: 'Ya! Saat membuat atau mengedit kuis, Anda dapat mengisi field "Waktu (menit)" untuk menentukan batas waktu pengerjaan. Timer akan berjalan otomatis saat siswa memulai kuis.',
  },
  {
    q: 'Bagaimana siswa bisa mengakses kuis privat?',
    a: 'Kuis privat memerlukan kode kuis. Siswa perlu masuk ke halaman Join Kuis dan memasukkan kode yang Anda berikan. Kode tersebut tersedia di tabel Kelola Kuis setelah kuis dipublikasikan.',
  },
  {
    q: 'Bisakah saya mengedit kuis yang sudah dipublikasikan?',
    a: 'Ya, Anda masih bisa mengedit soal dan detail kuis melalui halaman Detail Kuis, bahkan setelah dipublikasikan.',
  },
]

export default function Bantuan() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [openFaq, setOpenFaq] = useState(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const filteredFaqs = search.trim()
    ? faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
    : faqs

  const confirmLogout = async () => {
    setShowLogoutModal(false)
    await logoutApi()
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <div className="bantuan-root">
      {/* Sidebar */}
      <aside className="bantuan-sidebar">
        <div>
          <div className="bantuan-logo" onClick={() => navigate('/')}>KuisKita</div>
          <nav className="bantuan-nav">
            <button className="bantuan-nav-item" onClick={() => navigate('/dashboard')}>
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
              </svg>
              Dashboard
            </button>
            <button className="bantuan-nav-item" onClick={() => navigate('/kelola-kuis')}>
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Kelola Kuis
            </button>
            <button className="bantuan-nav-item" onClick={() => navigate('/profil')}>
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Profil
            </button>
          </nav>
        </div>
        <div className="bantuan-sidebar-footer">
          <button className="bantuan-nav-item active">
            <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Bantuan
          </button>
          <button className="bantuan-nav-item logout" onClick={() => setShowLogoutModal(true)}>
            <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="bantuan-main">
        {/* Hero Banner */}
        <section className="bantuan-hero">
          <div className="bantuan-hero-content">
            <h1>Pusat Bantuan</h1>
            <p>Temukan jawaban untuk pertanyaan Anda, panduan penggunaan, dan dukungan teknis KuisKita.</p>
            <div className="bantuan-search-bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Cari bantuan atau pertanyaan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              <button onClick={() => {}}>Cari</button>
            </div>
          </div>
        </section>

        <div className="bantuan-container">
          {/* Category Cards */}
          <section className="bantuan-categories">
            <h2 className="bantuan-section-title">Jelajahi Kategori</h2>
            <div className="bantuan-cat-grid">
              {categories.map(cat => (
                <div key={cat.id} className="bantuan-cat-card">
                  <div className="bantuan-cat-icon">{cat.icon}</div>
                  <h3>{cat.title}</h3>
                  <p>{cat.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="bantuan-faq">
            <h2 className="bantuan-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Pertanyaan Populer
            </h2>
            <div className="bantuan-faq-list">
              {filteredFaqs.length === 0 ? (
                <div className="bantuan-faq-empty">Tidak ada hasil untuk "<strong>{search}</strong>"</div>
              ) : filteredFaqs.map((faq, i) => (
                <div key={i} className={`bantuan-faq-item ${openFaq === i ? 'open' : ''}`}>
                  <button
                    className="bantuan-faq-question"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="bantuan-faq-chevron">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className="bantuan-faq-answer">
                    <p>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contact Section */}
          <section className="bantuan-contact">
            <div className="bantuan-contact-text">
              <h3>Masih butuh bantuan?</h3>
              <p>Tim dukungan kami siap membantu Anda menyelesaikan masalah teknis atau menjawab pertanyaan lebih lanjut terkait KuisKita.</p>
            </div>
            <div className="bantuan-contact-btns">
              <a
                href="https://wa.me/6281234567890?text=Halo%20KuisKita%2C%20saya%20butuh%20bantuan."
                target="_blank"
                rel="noopener noreferrer"
                className="bantuan-btn-wa"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
                Hubungi WhatsApp
              </a>
              <a
                href="mailto:support@kuiskita.id?subject=Bantuan%20KuisKita"
                className="bantuan-btn-email"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Kirim Email
              </a>
            </div>
          </section>

          <footer className="bantuan-footer">
            © 2026 KuisKita. Dibuat dengan kegembiraan.
          </footer>
        </div>
      </main>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="global-modal-overlay">
          <div className="global-modal">
            <div className="global-modal-icon warning">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
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
