import api from './api'

export default {
  submitClaim: (claimData) => api.post('/claims', claimData).then(res => res.data),
  getClaims: () => api.get('/claims').then(res => res.data),
  updateClaim: (id, data) => api.put(`/claims/${id}`, data).then(res => res.data)
}