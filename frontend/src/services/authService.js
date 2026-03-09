import api from './api'

export default {
  login: (credentials) => api.post('/auth/login', credentials).then(res => res.data),
  register: (userData) => api.post('/auth/register', userData).then(res => res.data),
  getProfile: () => api.get('/auth/profile').then(res => res.data)
}