import axios from 'axios'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default {
  getPolicies: () => api.get('/policies').then(res => res.data),
  getClaims: () => api.get('/claims').then(res => res.data),
  getAdminStats: () => api.get('/admin/stats').then(res => res.data)
}