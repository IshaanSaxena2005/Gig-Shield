import api from './api'

export const getClaims        = ()          => api.get('/claims').then(r => r.data)
export const getClaimById     = (id)        => api.get(`/claims/${id}`).then(r => r.data)
export const submitClaim      = (data)      => api.post('/claims', data).then(r => r.data)
export const getFlaggedClaims = (page = 1)  => api.get(`/claims/flagged?page=${page}`).then(r => r.data)
