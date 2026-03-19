const express = require('express')
const { register, login } = require('../controllers/authController')
const { forgotPassword, resetPassword } = require('../controllers/passwordResetController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/profile', protect, (req, res) => {
  res.json(req.user)
})

// Password reset routes
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

module.exports = router