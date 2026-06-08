import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import PasswordInput from '../components/PasswordInput'
import AutofillBlocker from '../components/AutofillBlocker'
import { register } from '../utils/api'
import extractApiError from '../utils/extractApiError'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) return setError('Password tidak cocok')
    setLoading(true)
    const defaultName = email.split('@')[0] || 'Guru'
    const res = await register({ name: defaultName, email, password, password_confirmation: confirmPassword })
    setLoading(false)
    if (res.ok) {
      alert(res.data?.message || 'Registrasi berhasil — silakan login')
      navigate('/login')
    } else {
      setError(extractApiError(res, 'Registrasi'))
    }
  }

  return (
    <AuthCard
      title="Daftar Akun Guru"
      subtitle="Mulai buat kuis interaktif dan kelola kelas Anda dengan mudah."
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <AutofillBlocker />

        <label>Email</label>
        <div className="input-wrap">
          <input type="email" placeholder="nama@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
        </div>

        <label>Buat Kata Sandi</label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        <label>Konfirmasi Kata Sandi</label>
        <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Ulangi kata sandi"
          autoComplete="new-password"
        />

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
