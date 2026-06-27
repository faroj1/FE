import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE || 'https://going-slacking-backhand.ngrok-free.dev'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.error('[Vite Proxy Error]', err.message)
            })
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', 'true')
              console.log('[Proxy →]', req.method, req.url, '→', apiTarget)
            })
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('[Proxy ←]', proxyRes.statusCode, req.url)
            })
          },
        },
        '/storage': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.error('[Vite Proxy Error]', err.message)
            })
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', 'true')
              console.log('[Proxy →]', req.method, req.url, '→', apiTarget)
            })
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('[Proxy ←]', proxyRes.statusCode, req.url)
            })
          },
        },
      },
    },
  }
})
