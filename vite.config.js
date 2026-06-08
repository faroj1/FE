import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY_TARGET || ''

  const cfg = {
    plugins: [react()],
    server: {
      host: true, // expose to LAN (accessible from other devices)
    },
  }

  if (proxyTarget) {
    cfg.server.proxy = {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
    }
  }

  return cfg
})

