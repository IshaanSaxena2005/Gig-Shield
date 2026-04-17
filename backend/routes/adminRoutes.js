const express = require('express')
const {
  getDashboardStats,
  getRiskZones,
  updateRiskZone,
  getFraudAlerts,
  getAllWorkers,
  reactivatePolicy,
  getReserveHealth
} = require('../controllers/adminController')
const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/dashboard',    protect, admin, getDashboardStats)
router.get('/risk-zones',   protect, admin, getRiskZones)
router.put('/risk-zones',   protect, admin, updateRiskZone)
router.get('/fraud-alerts', protect, admin, getFraudAlerts)
router.get('/workers',      protect, admin, getAllWorkers)
router.get('/reserves',     protect, admin, getReserveHealth)

// Policy reactivation — un-suspend a policy frozen by premium-collection retries
router.post('/policies/:id/reactivate', protect, admin, reactivatePolicy)

// Background job admin endpoints live at /api/admin/jobs/* — see routes/admin/jobs.js

module.exports = router
