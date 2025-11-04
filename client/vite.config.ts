import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      '/auth': 'http://localhost:4000',
      '/admin': 'http://localhost:4000',
      '/profile': 'http://localhost:4000',
      // Proxy /groups API endpoints - be specific to avoid proxying frontend routes
      '/groups': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        bypass(req) {
          const url = req.url || ''
          const method = req.method || ''

          // For GET requests, check if it's the frontend /invite route
          if (method === 'GET') {
            // Extract path without query string
            const pathname = url.split('?')[0]
            // Match pattern: /groups/{uuid}/invite (exact, no sub-paths after invite)
            const inviteRoutePattern = /^\/groups\/[^/]+\/invite$/

            if (inviteRoutePattern.test(pathname)) {
              console.log(`[Vite Proxy] Bypassing proxy for frontend route: ${pathname}`)
              // Return the index.html path - Vite will serve it for SPA routing
              return '/index.html'
            }
          }

          // Proxy all other requests (API calls)
          return null
        }
      }
    }
  }
})

// removed duplicate default export
