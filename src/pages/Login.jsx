import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import PasswordInput from '../components/PasswordInput'
import AutofillBlocker from '../components/AutofillBlocker'
import { login } from '../utils/api'
import extractApiError from '../utils/extractApiError'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const payload = res.data?.data || {}
      const token = payload.token
      const user = payload.user
      if (token) localStorage.setItem('token', token)
      if (user) localStorage.setItem('user', JSON.stringify(user))
      alert(res.data?.message || 'Login berhasil')
      navigate('/')
    } else {
      setError(extractApiError(res, 'Login'))
    }
  }

  return (
    <AuthCard
      title="Masuk ke Akun"
      subtitle="Masukkan email dan kata sandi Anda untuk mengakses dashboard"
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <AutofillBlocker />

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
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

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
