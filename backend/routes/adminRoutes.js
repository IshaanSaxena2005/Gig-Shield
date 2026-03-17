const express = require('express')
const {
  getDashboardStats,
  getRiskZones,
  updateRiskZone,
  getFraudAlerts
} = require('../controllers/adminController')
const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/dashboard', protect, admin, getDashboardStats)
router.get('/risk-zones', protect, admin, getRiskZones)
router.put('/risk-zones', protect, admin, updateRiskZone)
router.get('/fraud-alerts', protect, admin, getFraudAlerts)

module.exports = router