const express = require('express')
const { getDashboardData, updateProfile } = require('../controllers/userController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/dashboard', protect, getDashboardData)
router.put('/profile', protect, updateProfile)

module.exports = router