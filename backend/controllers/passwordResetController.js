const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

// POST /api/auth/forgot-password
// User submits their email → we generate a reset token and return it
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    const user = await User.findOne({ where: { email } })

    // Always return success even if email not found — prevents email enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset token has been generated.' })
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex')

    // Token expires in 1 hour
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000)

    await user.update({ resetToken, resetTokenExpiry })

    // In production you would email this token as a link
    // For now we return it directly so you can test
    res.json({
      message: 'Reset token generated successfully.',
      resetToken, // remove this line when you add real email sending
      expiresAt: resetTokenExpiry
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/auth/reset-password
// User submits token + new password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Find user with matching token that hasn't expired
    const user = await User.findOne({ where: { resetToken: token } })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    // Check expiry
    if (new Date() > new Date(user.resetTokenExpiry)) {
      await user.update({ resetToken: null, resetTokenExpiry: null })
      return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' })
    }

    // Hash new password and clear token
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    await user.update({
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    })

    res.json({ message: 'Password reset successful. You can now log in.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}