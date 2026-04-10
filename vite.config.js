import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const proxyApi = process.env.VITE_PROXY_API || 'http://127.0.0.1:8000'

/** Dev-only: Brevo has no browser CORS. This path avoids clashing with /api → FastAPI proxy. */
function brevoDevProxyPlugin() {
  return {
    name: 'brevo-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/__brevo/send', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'Method not allowed' }))
          return
        }
        const decoder = new TextDecoder()
        let raw = ''
        for await (const chunk of req) {
          raw += decoder.decode(chunk, { stream: true })
        }
        raw += decoder.decode()
        let parsed
        try {
          parsed = JSON.parse(raw)
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'Invalid JSON body' }))
          return
        }
        const { apiKey, payload } = parsed || {}
        if (!apiKey || !payload || typeof payload !== 'object') {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'Expected { apiKey, payload }' }))
          return
        }
        try {
          const r = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': String(apiKey),
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(payload),
          })
          const text = await r.text()
          res.statusCode = r.status
          res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json')
          res.end(text)
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: e?.message || String(e) }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), brevoDevProxyPlugin()],
  server: {
    proxy: {
      '/api': {
        target: proxyApi,
        changeOrigin: true,
      },
    },
  },
})

