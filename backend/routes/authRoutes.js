const express   = require('express')
const rateLimit = require('express-rate-limit')
const { register, login } = require('../controllers/authController')
const { forgotPassword, resetPassword } = require('../controllers/passwordResetController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

// FIX 🟡14: rate limit auth routes — 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs:  15 * 60 * 1000,  // 15 minutes
  max:       10,
  message:   { message: 'Too many attempts from this IP. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// Stricter limit for forgot-password to prevent email flooding
const passwordLimiter = rateLimit({
  windowMs:  60 * 60 * 1000,  // 1 hour
  max:       5,
  message:   { message: 'Too many password reset requests. Please try again in 1 hour.' },
})

router.post('/register',       authLimiter,     register)
router.post('/login',          authLimiter,     login)
router.post('/forgot-password', passwordLimiter, forgotPassword)
router.post('/reset-password',  passwordLimiter, resetPassword)

router.get('/profile', protect, (req, res) => {
  // Return full profile including new fields
  const { password, resetToken, resetTokenExpiry, ...safeUser } = req.user.toJSON()
  res.json(safeUser)
})

module.exports = router
