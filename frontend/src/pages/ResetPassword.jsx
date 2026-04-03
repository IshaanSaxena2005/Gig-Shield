import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import '../styles/dashboard.css'

const ResetPassword = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    token: location.state?.token || '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value })
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!formData.token) {
      setError('Reset token is required')
      return
    }
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      await api.post('/auth/reset-password', {
        token: formData.token,
        newPassword: formData.newPassword
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <p className="auth-subtitle">Enter your reset token and choose a new password.</p>

        {success ? (
          <div className="success-message">
            Password reset successful! Redirecting to login...
          </div>
        ) : (
          <>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Reset Token</label>
                <input
                  type="text"
                  name="token"
                  value={formData.token}
                  onChange={handleChange}
                  placeholder="Paste your reset token here"
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <p className="auth-link">
          <Link to="/forgot-password">Request a new token</Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
