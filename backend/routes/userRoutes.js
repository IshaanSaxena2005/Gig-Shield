const express = require('express')
const { getDashboardData } = require('../controllers/userController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/dashboard', protect, getDashboardData)

module.exports = router