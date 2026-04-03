import api from './api'

export const getDashboardStats  = ()             => api.get('/admin/dashboard').then(r => r.data)
export const getRiskZones       = ()             => api.get('/admin/risk-zones').then(r => r.data)
export const updateRiskZone     = (data)         => api.put('/admin/risk-zones', data).then(r => r.data)
export const getFraudAlerts     = ()             => api.get('/admin/fraud-alerts').then(r => r.data)
export const getAllWorkers       = (page = 1)     => api.get(`/admin/workers?page=${page}`).then(r => r.data)
export const getAllClaims        = (page = 1)     => api.get(`/claims/all?page=${page}`).then(r => r.data)
export const getFlaggedClaims   = (page = 1)     => api.get(`/claims/flagged?page=${page}`).then(r => r.data)
export const updateClaimStatus  = (id, status, notes = '') => api.put(`/claims/${id}`, { status, notes }).then(r => r.data)
