import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import { login, me, resendVerificationEmail } from '../utils/api'
import { saveToken, saveUser, decodeToken } from '../utils/auth'
import Swal from 'sweetalert2'

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

    const isUnverifiedEmailMessage = (text) => {
      return /verifikasi|verified|belum diaktifkan|belum diverifikasi|email belum/i.test(text || '')
    }

    if (res.ok) {
      const token =
        res.data?.token ||
        res.data?.access_token ||
        res.data?.data?.token ||
        res.data?.data?.access_token

      const responseUser =
        res.data?.user ||
        res.data?.data?.user ||
        (res.data?.data && typeof res.data.data === 'object' && ('email' in res.data.data || 'email_verified' in res.data.data || 'name' in res.data.data)
          ? res.data.data
          : null) ||
        (res.data && typeof res.data === 'object' && ('email' in res.data || 'email_verified' in res.data || 'name' in res.data)
          ? res.data
          : null)

      if (token) {
        saveToken(token)

        if (responseUser) {
          saveUser(responseUser)
        } else {
          const payload = decodeToken(token)
          if (payload) {
            saveUser({
              id: payload.sub || payload.id,
              name: payload.name,
              email: payload.email,
            })
          }
        }

        let finalUser = responseUser
        try {
          const meRes = await me()
          if (meRes.ok) {
            const user = meRes.data?.data || meRes.data
            if (user) {
              saveUser(user)
              finalUser = user
            }
          }
        } catch (e) {
          console.warn('[Login] /api/me failed, using cached login response')
        }

        if (finalUser?.email_verified === false) {
          const result = await Swal.fire({
            icon: 'warning',
            title: 'Email Belum Aktif!',
            text: 'Email Anda belum diaktifkan. Silakan cek kotak masuk/spam email Anda untuk melakukan aktivasi terlebih dahulu.',
            confirmButtonText: 'Kirim Ulang Email',
            showCancelButton: true,
            cancelButtonText: 'Tutup',
            confirmButtonColor: '#667eea',
          })
          if (result.isConfirmed) {
            const resendRes = await resendVerificationEmail()
            if (resendRes.ok) {
              Swal.fire({
                icon: 'success',
                title: 'Terkirim',
                text: 'Link verifikasi email telah dikirim ulang.',
                confirmButtonText: 'OK',
              })
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: resendRes.message || 'Tidak dapat mengirim ulang email verifikasi.',
                confirmButtonText: 'OK',
              })
            }
          }
          navigate('/verify-email')
        } else {
          navigate('/dashboard')
        }
      } else {
        setError('Server tidak mengembalikan token. Periksa konfigurasi backend.')
      }
    } else {
      const message = res.message || res.data?.message || `Login gagal (status ${res.status})`
      const isTokenRequired = /token is required/i.test(message)
      if (res.status === 403 || isUnverifiedEmailMessage(message) || isTokenRequired) {
        Swal.fire({
          icon: 'warning',
          title: isTokenRequired ? 'Cek Email untuk Verifikasi Terlebih Dahulu' : 'Email belum terverifikasi',
          text: isTokenRequired
            ? 'Silakan cek email Anda untuk melakukan aktivasi terlebih dahulu sebelum masuk.'
            : message || 'Silakan cek kotak masuk/spam email Anda untuk melakukan aktivasi terlebih dahulu.',
          confirmButtonText: isTokenRequired ? 'OK' : 'Kirim Ulang Email',
          showCancelButton: !isTokenRequired,
          cancelButtonText: 'Tutup',
          confirmButtonColor: '#667eea',
        }).then(async (result) => {
          if (!isTokenRequired && result.isConfirmed) {
            const resendRes = await resendVerificationEmail()
            if (resendRes.ok) {
              Swal.fire({
                icon: 'success',
                title: 'Terkirim',
                text: 'Link verifikasi email telah dikirim ulang.',
                confirmButtonText: 'OK',
              })
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: resendRes.message || 'Tidak dapat mengirim ulang email verifikasi.',
                confirmButtonText: 'OK',
              })
            }
          }
        })
        return
      }
      Swal.fire({
        icon: 'error',
        title: 'Gagal Masuk',
        text: message || 'Email atau kata sandi yang Anda masukkan salah.',
        confirmButtonText: 'OK',
      })
      setError(message)
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
