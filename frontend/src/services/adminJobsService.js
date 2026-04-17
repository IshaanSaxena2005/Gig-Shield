import api from './api'

/**
 * Background job admin endpoints.
 * All routes are protected by admin auth on the backend.
 */

export const fetchJobHealth = (days = 7) =>
  api.get('/admin/jobs/health', { params: { days } }).then(r => r.data)

export const fetchJobAudit = ({ limit = 50, offset = 0, jobName, status, startDate, endDate } = {}) => {
  const params = { limit, offset }
  if (jobName)   params.jobName   = jobName
  if (status)    params.status    = status
  if (startDate) params.startDate = startDate
  if (endDate)   params.endDate   = endDate
  return api.get('/admin/jobs/audit', { params }).then(r => r.data)
}

export const fetchDeadLetter = (limit = 100) =>
  api.get('/admin/jobs/dead-letter', { params: { limit } }).then(r => r.data)

export const retryJob = (id) =>
  api.post(`/admin/jobs/retry/${id}`).then(r => r.data)
