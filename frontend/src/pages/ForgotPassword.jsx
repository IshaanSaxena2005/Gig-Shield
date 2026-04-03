import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import '../styles/dashboard.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!email) {
      setError('Please enter your email address')
      return
    }

    try {
      setLoading(true)
      const response = await api.post('/auth/forgot-password', { email })
      setMessage(response.data.message || 'If the account exists, reset instructions are ready.')
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        <p className="auth-subtitle">Enter your email and we will prepare password reset instructions.</p>

        {!submitted ? (
          <>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Preparing...' : 'Start Reset'}
              </button>
            </form>
          </>
        ) : (
          <div className="reset-token-box">
            <div className="success-message">{message}</div>
            <p className="token-note">
              In demo mode, a reset token may still be exposed by backend configuration. In production it should be delivered securely out of band.
            </p>
            <Link to="/reset-password">
              <button className="submit-btn top-space">Go to Reset Password</button>
            </Link>
          </div>
        )}

        <p className="auth-link">
          Remember your password? <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
