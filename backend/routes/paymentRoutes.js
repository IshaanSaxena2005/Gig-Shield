const express = require('express')
const { processPayment } = require('../controllers/paymentController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/create-payment-intent', protect, processPayment)

module.exports = router