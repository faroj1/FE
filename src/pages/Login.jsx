import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import { login, me } from '../utils/api'
import { saveToken, saveUser, decodeToken } from '../utils/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await login({ email, password })
    setLoading(false)

    if (res.ok) {
      // Extract JWT token from various possible response shapes
      const token =
        res.data?.token ||
        res.data?.access_token ||
        res.data?.data?.token ||
        res.data?.data?.access_token

      if (token) {
        // Persist JWT token
        saveToken(token)

        // Try to decode user info from JWT payload directly
        const payload = decodeToken(token)
        if (payload) {
          saveUser({
            id: payload.sub || payload.id,
            name: payload.name,
            email: payload.email,
          })
        }

        // Also try to fetch full profile from /api/me
        try {
          const meRes = await me()
          if (meRes.ok) {
            const user = meRes.data?.data || meRes.data
            if (user) saveUser(user)
          }
        } catch (e) {
          console.warn('[Login] /api/me failed, using token payload instead')
        }

        navigate('/dashboard')
      } else {
        setError('Server tidak mengembalikan token. Periksa konfigurasi backend.')
      }
    } else {
      setError(res.data?.message || `Login gagal (status ${res.status})`)
    }
  }

  return (
    <AuthCard
      title="Masuk ke Akun"
      subtitle="Masukkan email dan kata sandi Anda untuk mengakses dashboard"
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <label>Email</label>
        <div className="input-wrap">
          <input
            type="email"
            placeholder="nama@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <label>Kata Sandi</label>
        <div className="input-wrap">
          <input
            type={show ? 'text' : 'password'}
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShow((s) => !s)}
            aria-label="toggle"
          >
            {show ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 3l18 18" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 5c5 0 9 4 9 7s-4 7-9 7-9-4-9-7 4-7 9-7z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Memuat...' : 'Masuk'}
        </button>

        <div className="auth-footer-links">
          <span>Belum punya akun? </span>
          <a href="/register">Daftar</a>
        </div>
      </form>
    </AuthCard>
  )
}
