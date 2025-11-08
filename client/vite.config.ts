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
      '/verify': 'http://localhost:4000',
      '/payment-methods': 'http://localhost:4000',
      '/payables': 'http://localhost:4000',
      '/payments': 'http://localhost:4000',
      // Proxy /groups API endpoints - be specific to avoid proxying frontend routes
      '/groups': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        bypass(req) {
          const url = req.url || ''
          const method = req.method || ''

          // For GET requests, check if it's a frontend route (invite, auction, features)
          // BUT: Only bypass if it's a browser navigation (not an API call)
          // API calls will have Authorization header or Accept: application/json
          if (method === 'GET') {
            const authHeader = req.headers.authorization || req.headers.Authorization
            const acceptHeader = req.headers.accept || req.headers.Accept || ''
            const isApiCall = authHeader || acceptHeader.includes('application/json')
            
            // Extract path without query string
            const pathname = url.split('?')[0]
                  // Match patterns for frontend routes:
                  // /groups/{uuid}/invite
                  // /groups/{uuid}/auction
                  // /groups/{uuid}/features
                  // /groups/{uuid}/Addnew
                  const frontendRoutePattern = /^\/groups\/[^/]+\/(invite|auction|features|Addnew)$/

            // Only bypass if it matches frontend route AND it's NOT an API call
            if (frontendRoutePattern.test(pathname) && !isApiCall) {
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
