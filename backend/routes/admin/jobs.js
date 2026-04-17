/**
 * routes/admin/jobs.js
 * --------------------
 * Background job admin endpoints (audit trail, dead-letter queue, manual retry).
 * Mounted at /api/admin/jobs in server.js.
 *
 * All routes require admin auth — these expose job error messages and allow
 * manual job re-runs, both of which are sensitive operations.
 */

const express = require('express')
const jobScheduler = require('../../utils/jobScheduler')
const { protect, admin } = require('../../middleware/authMiddleware')

const router = express.Router()

// All routes here are admin-only
router.use(protect, admin)

// GET /api/admin/jobs/audit
router.get('/audit', async (req, res) => {
  try {
    const { limit, offset, jobName, status, startDate, endDate } = req.query
    const result = await jobScheduler.getRecentRuns({
      limit:     parseInt(limit)  || 50,
      offset:    parseInt(offset) || 0,
      jobName,
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate:   endDate   ? new Date(endDate)   : null
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/admin/jobs/dead-letter
router.get('/dead-letter', async (req, res) => {
  try {
    const result = await jobScheduler.getDeadLetterRuns({
      limit: parseInt(req.query.limit) || 100
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/admin/jobs/health
router.get('/health', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7
    const result = await jobScheduler.getJobHealth(days)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/admin/jobs/retry/:id
router.post('/retry/:id', async (req, res) => {
  try {
    const auditId = parseInt(req.params.id)
    if (!Number.isFinite(auditId) || auditId <= 0) {
      return res.status(400).json({ error: 'Invalid audit id' })
    }
    const result = await jobScheduler.retryDeadLetterJob(auditId)
    res.json({ message: 'Job retry triggered', result })
  } catch (error) {
    // 4xx for known user-input errors, 5xx for everything else
    const msg = error.message || 'Retry failed'
    const status = /not found|not in dead_letter|No job function/i.test(msg) ? 400 : 500
    res.status(status).json({ error: msg })
  }
})

module.exports = router
