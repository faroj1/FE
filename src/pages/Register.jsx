import { useState } from 'react'
import AuthCard from '../components/AuthCard'
import { register } from '../utils/api'

export default function Register() {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) return setError('Password tidak cocok')
    setLoading(true)
    // Some backends require a `name` field. Derive a default name from the email so UI stays simple.
    const defaultName = (email || '').split('@')[0] || 'user'
    const res = await register({ name: defaultName, email, password, password_confirmation: confirmPassword })
    setLoading(false)
    if (res.ok) {
      alert('Registrasi berhasil — silakan login')
    } else {
      setError(res.data?.message || `Registrasi gagal (status ${res.status})`)
    }
  }

  return (
    <AuthCard
      title="Daftar Akun Guru"
      subtitle="Mulai buat kuis interaktif dan kelola kelas Anda dengan mudah."
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <label>Email</label>
        <div className="input-wrap">
          <input type="email" placeholder="nama@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <label>Buat Kata Sandi</label>
        <div className="input-wrap">
          <input type={show ? 'text' : 'password'} placeholder="Minimal 8 karakter" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label="toggle">
            {show ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3l18 18" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c5 0 9 4 9 7s-4 7-9 7-9-4-9-7 4-7 9-7z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </button>
        </div>

        <label>Konfirmasi Kata Sandi</label>
        <div className="input-wrap">
          <input type={show ? 'text' : 'password'} placeholder="Ulangi kata sandi" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label="toggle">
            {show ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3l18 18" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c5 0 9 4 9 7s-4 7-9 7-9-4-9-7 4-7 9-7z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Loading...' : 'Daftar'}
        </button>

        <div className="auth-footer-links">
          <span>Sudah punya akun? </span>
          <a href="/login">Masuk di sini</a>
        </div>
      </form>
    </AuthCard>
  )
}
