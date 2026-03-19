import axios from 'axios'

// Base API configuration — must match PORT in your .env (5001)
const API_BASE_URL = 'http://localhost:5001/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - add auth token if available
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('user')
    if (user) {
      const userData = JSON.parse(user)
      if (userData.token) {
        config.headers.Authorization = `Bearer ${userData.token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)

    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error('Unauthorized access - please login')
          break
        case 403:
          console.error('Access forbidden')
          break
        case 404:
          console.error('Resource not found')
          break
        case 500:
          console.error('Server error - please try again later')
          break
        default:
          console.error('Unable to fetch data. Please try again later')
      }
    } else if (error.request) {
      console.error('Network error - unable to reach server')
    }

    return Promise.reject(error)
  }
)

export default api