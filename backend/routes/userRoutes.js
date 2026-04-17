const express    = require('express')
const rateLimit  = require('express-rate-limit')
const { getDashboardData, updateProfile, getTrustSummary } = require('../controllers/userController')
const {
  getNotifications,
  markNotificationRead,
  markAllRead
} = require('../controllers/notificationController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      20,
  message:  { message: 'Too many profile update requests. Please try again in 15 minutes.' }
})

router.get('/dashboard',       protect, getDashboardData)
router.put('/profile',         protect, profileLimiter, updateProfile)
router.get('/trust-summary',   protect, getTrustSummary)

// Notifications
router.get('/notifications',                protect, getNotifications)
router.post('/notifications/:id/read',      protect, markNotificationRead)
router.post('/notifications/read-all',      protect, markAllRead)

module.exports = router