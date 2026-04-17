const express = require('express')
const { processPayment, initiateUpiPayment, disbursePayout } = require('../controllers/paymentController')
const { protect, admin } = require('../middleware/authMiddleware')
const { paymentLimiter } = require('../middleware/security')

const router = express.Router()

router.post('/stripe',  protect, paymentLimiter, processPayment)   // 5 attempts/15min
router.post('/upi',     protect, paymentLimiter, initiateUpiPayment)
router.post('/payout',  protect, admin, disbursePayout)

module.exports = router
