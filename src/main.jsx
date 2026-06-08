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

mount()
