import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import { resendVerificationEmail, me } from '../utils/api'
import { getUser, saveUser } from '../utils/auth'
import Swal from 'sweetalert2'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const initialUser = getUser()
  const [user, setUser] = useState(initialUser)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [checkedStatus, setCheckedStatus] = useState(false)

  useEffect(() => {
    if (user?.email_verified === true) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (checkedStatus || !user) return
    const fetchProfile = async () => {
      setCheckedStatus(true)
      try {
        const res = await me()
        if (res.ok) {
          const updatedUser = res.data?.data || res.data
          if (updatedUser) {
            saveUser(updatedUser)
            setUser(updatedUser)
            if (updatedUser.email_verified === true) {
              navigate('/dashboard', { replace: true })
            }
          }
        }
      } catch (e) {
        console.warn('[VerifyEmail] failed to refresh profile', e)
      }
    }
    fetchProfile()
  }, [checkedStatus, navigate, user])

  const handleResend = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await resendVerificationEmail()
    setLoading(false)

    if (res.ok) {
      setSuccess('Tautan verifikasi email telah dikirim ulang. Silakan periksa inbox atau folder spam.')
      Swal.fire({
        icon: 'success',
        title: 'Email terkirim',
        text: 'Tautan verifikasi email telah dikirim ulang. Silakan periksa inbox atau folder spam.',
        confirmButtonText: 'OK',
      })
      return
    }

    setError(res.data?.message || `Gagal mengirim ulang email verifikasi (status ${res.status})`)
  }

  const handleRefreshStatus = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await me()
      setLoading(false)
      if (res.ok) {
        const updatedUser = res.data?.data || res.data
        if (updatedUser) {
          saveUser(updatedUser)
          setUser(updatedUser)
          if (updatedUser.email_verified === true) {
            navigate('/dashboard', { replace: true })
            return
          }
          setSuccess('Status verifikasi diperbarui. Email Anda masih belum terverifikasi.')
        }
      } else {
        setError(res.data?.message || `Gagal memeriksa status verifikasi (status ${res.status})`)
      }
    } catch (e) {
      setLoading(false)
      setError('Terjadi kesalahan saat memeriksa status verifikasi.')
    }
  }

  return (
    <AuthCard
      title="Verifikasi Email Anda"
      subtitle={
        user?.email
          ? `Kami telah mengirim link verifikasi ke ${user.email}. Silakan periksa inbox dan klik tautan tersebut.`
          : 'Silakan periksa email Anda untuk tautan verifikasi. Jika belum menerima, kirim ulang email verifikasi.'
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, color: '#475569', lineHeight: 1.75 }}>
          Setelah email terverifikasi, Anda akan dikembalikan ke dashboard.
        </p>

        <div style={{ color: '#991b1b', background: '#fee2e2', padding: 12, borderRadius: 10, fontSize: 14 }}>
          Email Anda belum diaktifkan. Silakan klik tautan verifikasi yang dikirimkan ke email Anda.
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && (
          <div style={{ color: '#166534', background: '#dcfce7', padding: 10, borderRadius: 10, fontSize: 13 }}>
            {success}
          </div>
        )}

        <button type="button" className="auth-btn" disabled={loading} onClick={handleResend}>
          {loading ? 'Memproses...' : 'Kirim Ulang Email Verifikasi'}
        </button>

        <button
          type="button"
          className="auth-btn"
          style={{ background: '#f8fafc', color: '#1d4ed8', border: '1px solid #c7d2fe' }}
          disabled={loading}
          onClick={handleRefreshStatus}
        >
          Periksa Status Verifikasi
        </button>

        <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
          Jika verifikasi sudah selesai, klik tombol "Periksa Status Verifikasi" untuk memuat ulang status akun Anda.
        </div>
      </div>
    </AuthCard>
  )
}
