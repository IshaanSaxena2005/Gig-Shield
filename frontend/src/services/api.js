import axios from 'axios'

// FIX: Use relative paths to proxy through Vite dev server
// In production, use VITE_API_URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Attach Bearer token from localStorage on every request
api.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem('user')
      if (raw) {
        const userData = JSON.parse(raw)
        if (userData?.token) {
          config.headers.Authorization = `Bearer ${userData.token}`
        }
      }
    } catch {
      // Corrupted localStorage — clear it
      localStorage.removeItem('user')
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => Promise.reject(error)
)

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response
      if (status === 401) {
        // Token expired or invalid — clear storage and redirect to login
        localStorage.removeItem('user')
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
      // Log all non-401 errors for debugging
      if (status !== 401) {
        console.error(`[API] ${status} ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.response.data?.message || error.message)
      }
    } else if (error.request) {
      console.error('[API] Network error — cannot reach server at', API_BASE_URL, '| Request:', error.request)
    } else {
      console.error('[API] Error setting up request:', error.message)
    }
    return Promise.reject(error)
  }
)

export default api
