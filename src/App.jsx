import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', borderBottom: '1px solid rgba(15,23,42,0.03)' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ color: '#1976d2', fontWeight: 700, fontSize: 18 }}>KuisKita</div>
          <nav style={{ display: 'flex', gap: 18 }}>
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} style={{ color: '#1976d2', textDecoration: 'none', cursor: 'pointer' }}>Beranda</a>
            <Link to="#" style={{ color: '#44505a', textDecoration: 'none' }}>Daftar Kuis</Link>
          </nav>
        </div>

        <div>
          <Link to="/login" style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #dbeafe', color: '#1967d2', textDecoration: 'none', background: '#fff' }}>Login Guru</Link>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
