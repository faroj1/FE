import { useState } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import QuizList from './pages/QuizList'
import Dashboard from './pages/Dashboard'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')

  // Determine active menu item
  const isBerandaActive = location.pathname === '/'
  const isDaftarKuisActive = location.pathname === '/daftar-kuis'
  const isDashboard = location.pathname.startsWith('/dashboard')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      {!isDashboard && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 40px', borderBottom: '1px solid #f1f5f9', background: '#ffffff', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <div style={{ color: '#1976d2', fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px', cursor: 'pointer' }} onClick={() => navigate('/')}>KuisKita</div>
            <nav style={{ display: 'flex', gap: 24 }}>
              <Link 
                to="/" 
                style={{ 
                  color: isBerandaActive ? '#1976d2' : '#475569', 
                  textDecoration: 'none', 
                  fontWeight: isBerandaActive ? '700' : '500',
                  fontSize: '14px',
                  transition: 'color 0.2s ease'
                }}
              >
                Beranda
              </Link>
              <Link 
                to="/daftar-kuis" 
                style={{ 
                  color: isDaftarKuisActive ? '#1976d2' : '#475569', 
                  textDecoration: 'none', 
                  fontWeight: isDaftarKuisActive ? '700' : '500',
                  fontSize: '14px',
                  transition: 'color 0.2s ease'
                }}
              >
                Daftar Kuis
              </Link>
            </nav>
          </div>

          {/* Right side: Search bar & Login button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {isDaftarKuisActive && (
              <div style={{ position: 'relative', width: '280px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Cari kuis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px 10px 36px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    background: '#f8fafc',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            )}

            <Link 
              to="/login" 
              style={{ 
                padding: '10px 20px', 
                borderRadius: '10px', 
                border: '1px solid #dbeafe', 
                color: '#1967d2', 
                textDecoration: 'none', 
                background: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '13.5px',
                fontWeight: '700',
                boxShadow: '0 2px 4px rgba(25, 103, 210, 0.04)',
                transition: 'all 0.2s ease'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Login Guru
            </Link>
          </div>
        </header>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/daftar-kuis" element={<QuizList searchTerm={searchTerm} />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
