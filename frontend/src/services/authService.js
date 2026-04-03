import api from './api'

export const loginUser    = (email, password) => api.post('/auth/login',    { email, password }).then(r => r.data)
export const registerUser = (data)            => api.post('/auth/register', data).then(r => r.data)
export const getUserProfile = ()              => api.get('/auth/profile').then(r => r.data)
export const logoutUser   = ()                => { localStorage.removeItem('user') }
export const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || 'null') }
  catch { localStorage.removeItem('user'); return null }
}
export const isAuthenticated = () => !!getCurrentUser()
