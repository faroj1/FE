import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { setApiBase, detectAndSetBase } from './utils/api'

const mount = async () => {
  const envBase = import.meta.env.VITE_API_BASE
  if (envBase) {
    setApiBase(envBase)
    console.log('Using VITE_API_BASE =', envBase)
  } else {
    const detected = await detectAndSetBase()
    if (detected) setApiBase(detected)
    else setApiBase('')
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

mount().catch((err) => {
  console.error('Failed to mount application:', err)
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = '<div style="padding:2rem;color:#dc2626;font-family:sans-serif"><h2>Application failed to load</h2><p>' + err.message + '</p></div>'
  }
})
