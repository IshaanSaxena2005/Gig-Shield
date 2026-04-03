import api from './api'

export const getPolicies        = ()               => api.get('/policies').then(r => r.data)
export const getPolicyById      = (id)             => api.get(`/policies/${id}`).then(r => r.data)
export const createPolicy       = (data)           => api.post('/policies', data).then(r => r.data)
export const updatePolicyStatus = (id, status)     => api.patch(`/policies/${id}/status`, { status }).then(r => r.data)
