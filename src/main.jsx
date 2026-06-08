import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { setApiBase } from './utils/api'

// Set backend base URL from env BEFORE rendering
// If a dev proxy target is configured, prefer using relative `/api` (leave base empty)
const proxyTarget = import.meta.env.VITE_API_PROXY_TARGET || import.meta.env.VITE_API_USE_PROXY === 'true'
const envBase = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE ?? ''
if (proxyTarget) {
  // use proxy: keep baseUrl empty so fetch uses `/api/*` and Vite proxies to the backend
  setApiBase('')
} else {
  setApiBase(envBase)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
