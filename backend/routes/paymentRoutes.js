const express = require('express')
const { processPayment, initiateUpiPayment, disbursePayout } = require('../controllers/paymentController')
const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/stripe',  protect,        processPayment)
router.post('/upi',     protect,        initiateUpiPayment)
router.post('/payout',  protect, admin, disbursePayout)

module.exports = router
