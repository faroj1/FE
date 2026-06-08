import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import { login } from '../utils/api'

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
    try {
      const res = await login({ email, password })
      if (res.ok) {
        // backend returns { success:true, message, data: { token, user } }
        const payload = res.data?.data || {}
        const token = payload.token
        const user = payload.user
        if (token) localStorage.setItem('token', token)
        if (user) localStorage.setItem('user', JSON.stringify(user))
        alert(res.data?.message || 'Login berhasil')
        navigate('/')
      } else {
        // handle validation errors (422)
        if (res.status === 422 && res.data?.errors) {
          const messages = Object.values(res.data.errors).flat().join(' ')
          setError(messages || res.data?.message || 'Validasi gagal')
        } else {
          setError(res.data?.message || `Login gagal (status ${res.status})`)
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Terjadi kesalahan tak terduga. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Masuk ke Akun"
      subtitle="Masukkan email dan kata sandi Anda untuk mengakses dashboard"
    >
      <form onSubmit={handleSubmit} className="auth-form">
        {/* Dummy inputs to prevent browser autofill */}
        <input style={{ position: 'absolute', top: '-9999px', left: '-9999px' }} type="text" name="fakeusername" tabIndex="-1" aria-hidden="true" />
        <input style={{ position: 'absolute', top: '-9999px', left: '-9999px' }} type="password" name="fakepassword" tabIndex="-1" aria-hidden="true" />

        <label>Email</label>
        <div className="input-wrap">
          <input
            type="email"
            placeholder="nama@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off"
          />
        </div>

        <label>Masukan Kata Sandi</label>
        <div className="input-wrap">
          <input
            type={show ? 'text' : 'password'}
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label="toggle">
            {show ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3l18 18" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c5 0 9 4 9 7s-4 7-9 7-9-4-9-7 4-7 9-7z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Loading...' : 'Masuk'}
        </button>

        <div className="auth-footer-links">
          <span>Belum punya akun? </span>
          <a href="/register">Daftar</a>
        </div>
      </form>
    </AuthCard>
  )
}
