import { Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px' }}>
        <div style={{ color: '#1976d2', fontWeight: 600 }}>KuisKita</div>
        <div>
          <a href="/" style={{ color: '#1976d2', textDecoration: 'none' }}>← Kembali ke Beranda</a>
        </div>
      </header>

      <main style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={(
              <div style={{ textAlign: 'center' }}>
                <h2>Welcome</h2>
                <p>Open <a href="/login">Masuk</a> atau <a href="/register">Daftar</a></p>
              </div>
            )}
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
