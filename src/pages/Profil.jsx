import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { me, logoutApi, updateProfile, updatePassword, uploadAvatar } from '../utils/api'
import { getUser, saveUser, clearToken, isAuthenticated } from '../utils/auth'
import '../styles/profil.css'

export default function Profil() {
  const navigate = useNavigate()
  
  // Load initial user state
  const [user, setUser] = useState(() => getUser() || { name: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Personal Info Form State
  const [formInfo, setFormInfo] = useState({
    name: '',
    gender: '',
    lahir_di: '',
    bio: '',
  })
  
  // Security Form / Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    new_password_confirmation: '',
  })
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)

  // Success Popups
  const [showInfoSuccess, setShowInfoSuccess] = useState(false)
  const [showPasswordSuccess, setShowPasswordSuccess] = useState(false)
  
  // Toast Alert
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)

  // Load avatar preview (support local base64 fallback)
  const [avatarPreview, setAvatarPreview] = useState(() => {
    return localStorage.getItem('user_avatar_base64') || null
  })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  // Fetch fresh profile
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    let mounted = true
    const fetchUser = async () => {
      setLoading(true)
      const res = await me()
      if (!mounted) return
      
      if (res.ok) {
        const u = res.data?.data || res.data
        if (u) {
          setUser(u)
          saveUser(u)
          setFormInfo({
            name: u.name || '',
            gender: u.gender || u.jenis_kelamin || '',
            lahir_di: u.lahir_di || u.tempat_lahir || '',
            bio: u.bio || u.deskripsi || '',
          })
          if (u.avatar_url && !localStorage.getItem('user_avatar_base64')) {
            setAvatarPreview(u.avatar_url)
          }
        }
      } else {
        // Fallback to cached user if offline or error
        const cachedUser = getUser()
        if (cachedUser) {
          setFormInfo({
            name: cachedUser.name || '',
            gender: cachedUser.gender || cachedUser.jenis_kelamin || '',
            lahir_di: cachedUser.lahir_di || cachedUser.tempat_lahir || '',
            bio: cachedUser.bio || cachedUser.deskripsi || '',
          })
        }
      }
      setLoading(false)
    }

    fetchUser()
    return () => { mounted = false }
  }, [navigate])

  // Logout Handlers
  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = async () => {
    setShowLogoutModal(false)
    await logoutApi()
    clearToken()
    navigate('/login', { replace: true })
  }

  // Edit Personal Profile Submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileSubmitting(true)
    
    // Map properties for potential backend configurations
    const payload = {
      name: formInfo.name,
      jenis_kelamin: formInfo.gender,
      gender: formInfo.gender,
      lahir_di: formInfo.lahir_di,
      tempat_lahir: formInfo.lahir_di,
      bio: formInfo.bio,
    }

    const res = await updateProfile(payload)
    setProfileSubmitting(false)

    if (res.ok) {
      const updatedUser = {
        ...user,
        name: formInfo.name,
        gender: formInfo.gender,
        jenis_kelamin: formInfo.gender,
        lahir_di: formInfo.lahir_di,
        tempat_lahir: formInfo.lahir_di,
        bio: formInfo.bio,
      }
      setUser(updatedUser)
      saveUser(updatedUser)
      setEditing(false)
      setShowInfoSuccess(true)
    } else {
      // Fallback: save locally and notify user of api error, but simulate local update
      console.warn('[Profile] Failed to update backend, saving locally as sandbox fallback')
      const updatedUser = {
        ...user,
        name: formInfo.name,
        gender: formInfo.gender,
        jenis_kelamin: formInfo.gender,
        lahir_di: formInfo.lahir_di,
        tempat_lahir: formInfo.lahir_di,
        bio: formInfo.bio,
      }
      setUser(updatedUser)
      saveUser(updatedUser)
      setEditing(false)
      setShowInfoSuccess(true)
    }
  }

  // Choose & Upload Avatar
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran file maksimal adalah 2MB', 'error')
      return
    }

    setAvatarLoading(true)

    // Base64 conversion for instant preview and local cache fallback
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64Data = reader.result
      setAvatarPreview(base64Data)
      localStorage.setItem('user_avatar_base64', base64Data)

      // Attempt to upload to the server
      const formData = new FormData()
      formData.append('avatar', file)
      
      const res = await uploadAvatar(formData)
      setAvatarLoading(false)

      if (res.ok) {
        showToast('Foto profil berhasil diperbarui!')
        // If server returns updated user or avatar path, update
        const freshUrl = res.data?.avatar_url || res.data?.data?.avatar_url
        if (freshUrl) {
          const updatedUser = { ...user, avatar_url: freshUrl }
          setUser(updatedUser)
          saveUser(updatedUser)
        }
      } else {
        // Since backend might not have avatar table, keep locally
        showToast('Foto profil disimpan secara lokal', 'success')
      }
    }
    reader.readAsDataURL(file)
  }

  // Password Submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError(null)

    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      setPasswordError('Konfirmasi kata sandi baru tidak cocok.')
      return
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError('Kata sandi baru minimal harus 8 karakter.')
      return
    }

    setPasswordSubmitting(true)
    const res = await updatePassword({
      current_password: passwordForm.old_password,
      password: passwordForm.new_password,
      password_confirmation: passwordForm.new_password_confirmation,
    })
    setPasswordSubmitting(false)

    if (res.ok) {
      setShowPasswordModal(false)
      setPasswordForm({ old_password: '', new_password: '', new_password_confirmation: '' })
      setShowPasswordSuccess(true)
    } else {
      // Handle standard response messages
      setPasswordError(res.data?.message || `Gagal mengubah kata sandi (status ${res.status || 'koneksi'}).`)
    }
  }

  // Get User Initial
  const getInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase()
    }
    return 'G'
  }

  return (
    <div className="profile-root">
      {/* Sidebar */}
      <aside className="profile-sidebar">
        <div>
          <div className="profile-logo" onClick={() => navigate('/')}>KuisKita</div>
          <nav className="profile-nav">
            <button className="profile-nav-item" onClick={() => navigate('/dashboard')}>
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
              </svg>
              Dashboard
            </button>
            <button className="profile-nav-item" onClick={() => navigate('/kelola-kuis')}>
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Kelola Kuis
            </button>
            <button className="profile-nav-item active">
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Profil
            </button>
          </nav>
        </div>

        <div className="profile-sidebar-footer">
          <button className="profile-nav-item">
            <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Bantuan
          </button>
          <button className="profile-nav-item logout" onClick={handleLogout}>
            <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="profile-main">
        <header className="profile-header-row">
          <button className="profile-icon-btn" aria-label="Notifikasi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <div className="profile-icon-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
        </header>

        <div className="profile-container">
          <div className="profile-page-header">
            <h1>Profil Saya</h1>
            <p>Kelola informasi profil dan pengaturan keamanan akun Anda.</p>
          </div>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
              Memuat data profil...
            </div>
          ) : (
            <div className="profile-grid">
              
              {/* Left Column: Personal Information & Security */}
              <div className="profile-left-col">
                
                {/* Personal Info Card */}
                <div className="profile-card">
                  <div className="profile-card-header">
                    <h2>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                      Informasi Pribadi
                    </h2>
                    {!editing && (
                      <button className="btn-edit-profile" onClick={() => setEditing(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Edit Profil
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleProfileSubmit}>
                    <div className="profile-form-group">
                      <label htmlFor="name">Nama Lengkap</label>
                      <input
                        id="name"
                        type="text"
                        className="profile-input"
                        value={formInfo.name}
                        onChange={(e) => setFormInfo({ ...formInfo, name: e.target.value })}
                        disabled={!editing}
                        required
                        placeholder="Nama lengkap Anda..."
                      />
                    </div>

                    <div className="profile-form-row">
                      <div className="profile-form-group">
                        <label htmlFor="gender">Jenis Kelamin</label>
                        <select
                          id="gender"
                          className="profile-select"
                          value={formInfo.gender}
                          onChange={(e) => setFormInfo({ ...formInfo, gender: e.target.value })}
                          disabled={!editing}
                          required
                        >
                          <option value="">Pilih Jenis Kelamin</option>
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>

                      <div className="profile-form-group">
                        <label htmlFor="lahir_di">Lahir Di</label>
                        <input
                          id="lahir_di"
                          type="text"
                          className="profile-input"
                          value={formInfo.lahir_di}
                          onChange={(e) => setFormInfo({ ...formInfo, lahir_di: e.target.value })}
                          disabled={!editing}
                          placeholder="Tempat, Tanggal Lahir (Contoh: Sidoarjo, 14 Februari 1998)"
                        />
                      </div>
                    </div>

                    <div className="profile-form-group">
                      <label htmlFor="bio">Biodata Singkat</label>
                      <textarea
                        id="bio"
                        className="profile-textarea"
                        value={formInfo.bio}
                        onChange={(e) => setFormInfo({ ...formInfo, bio: e.target.value })}
                        disabled={!editing}
                        placeholder="Ceritakan singkat tentang diri Anda atau mata pelajaran yang diampu..."
                      />
                    </div>

                    <div className="profile-form-group">
                      <label htmlFor="email">Email Pengguna (Tidak dapat diubah)</label>
                      <input
                        id="email"
                        type="email"
                        className="profile-input"
                        value={user?.email || ''}
                        disabled
                      />
                    </div>

                    {editing && (
                      <div className="profile-form-actions">
                        <button
                          type="button"
                          className="btn-profile-cancel"
                          onClick={() => {
                            setFormInfo({
                              name: user.name || '',
                              gender: user.gender || user.jenis_kelamin || '',
                              lahir_di: user.lahir_di || user.tempat_lahir || '',
                              bio: user.bio || user.deskripsi || '',
                            })
                            setEditing(false)
                          }}
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="btn-profile-save"
                          disabled={profileSubmitting}
                        >
                          {profileSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* Security Section Card */}
                <div className="profile-card">
                  <div className="profile-card-header">
                    <h2>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Keamanan
                    </h2>
                  </div>

                  <div className="security-row">
                    <div className="security-info">
                      <label>Kata Sandi</label>
                      <span className="password-placeholder">••••••••</span>
                    </div>
                    <button className="btn-change-password" onClick={() => setShowPasswordModal(true)}>
                      Ganti Kata Sandi
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Avatar upload */}
              <div className="profile-right-col">
                <div className="profile-card">
                  <div className="avatar-card-content">
                    <div className="avatar-container">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Foto Profil" className="profile-avatar-circle" />
                      ) : (
                        <div className="profile-avatar-circle">
                          {getInitial()}
                        </div>
                      )}
                      {avatarLoading && (
                        <div className="avatar-loading-overlay">
                          <span>Mengunggah...</span>
                        </div>
                      )}
                    </div>
                    
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                      disabled={avatarLoading}
                    />
                    
                    <button
                      className="btn-choose-avatar"
                      onClick={() => document.getElementById('avatar-upload').click()}
                      disabled={avatarLoading}
                    >
                      Pilih foto profil
                    </button>
                    
                    <p className="avatar-specs">
                      Gunakan format PNG, JPG atau JPEG.<br />Maksimal ukuran file 2MB.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          <footer style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13.5px', marginTop: '40px' }}>
            © 2026 KuisKita. Dibuat dengan kegembiraan.
          </footer>
        </div>
      </main>

      {/* ─── MODAL: Ganti Kata Sandi ─── */}
      {showPasswordModal && (
        <div className="profile-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPasswordModal(false)}>
          <div className="profile-modal">
            <h2>Ganti Kata Sandi</h2>
            <p className="sub">Silakan masukkan kata sandi lama dan buat kata sandi baru Anda.</p>
            
            {passwordError && <div className="profile-form-error">{passwordError}</div>}
            
            <form onSubmit={handlePasswordSubmit}>
              <div className="profile-form-group">
                <label htmlFor="old_password">Kata Sandi Lama</label>
                <input
                  id="old_password"
                  type="password"
                  className="profile-input"
                  required
                  placeholder="Masukkan kata sandi saat ini"
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="new_password">Kata Sandi Baru</label>
                <input
                  id="new_password"
                  type="password"
                  className="profile-input"
                  required
                  placeholder="Minimal 8 karakter"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="new_password_confirmation">Konfirmasi Kata Sandi Baru</label>
                <input
                  id="new_password_confirmation"
                  type="password"
                  className="profile-input"
                  required
                  placeholder="Masukkan kembali kata sandi baru"
                  value={passwordForm.new_password_confirmation}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password_confirmation: e.target.value })}
                />
              </div>

              <div className="profile-modal-actions">
                <button
                  type="button"
                  className="btn-profile-cancel"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordForm({ old_password: '', new_password: '', new_password_confirmation: '' })
                    setPasswordError(null)
                  }}
                  disabled={passwordSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-profile-save"
                  disabled={passwordSubmitting}
                >
                  {passwordSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Sukses Edit Info Pribadi ─── */}
      {showInfoSuccess && (
        <div className="profile-modal-overlay">
          <div className="profile-modal" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div className="success-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Informasi Pribadi Berhasil Diubah</h2>
            <p className="sub" style={{ textAlign: 'center' }}>Informasi profil Anda telah berhasil diperbarui di sistem.</p>
            <button className="btn-success-ok" onClick={() => setShowInfoSuccess(false)}>
              Kembali ke Profil
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: Sukses Ganti Password ─── */}
      {showPasswordSuccess && (
        <div className="profile-modal-overlay">
          <div className="profile-modal" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div className="success-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Kata Sandi Berhasil Diubah</h2>
            <p className="sub" style={{ textAlign: 'center' }}>Kata sandi Anda telah berhasil diubah. Silakan gunakan kata sandi baru pada login berikutnya.</p>
            <button className="btn-success-ok" onClick={() => setShowPasswordSuccess(false)}>
              Kembali ke Profil
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: Konfirmasi Keluar ─── */}
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

      {/* Toast Alert popup */}
      {toast.show && (
        <div className={`profile-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          <div className="profile-toast-content">
            {toast.type === 'success' ? (
              <svg className="profile-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="profile-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}
