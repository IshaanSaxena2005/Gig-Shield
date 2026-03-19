import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import '../styles/dashboard.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Please enter your email address')
      return
    }

    try {
      setLoading(true)
      const res = await axios.post('http://localhost:5001/api/auth/forgot-password', { email })
      setResetToken(res.data.resetToken || '')
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
        <p className="auth-subtitle">Enter your email and we'll generate a reset token for you.</p>

        {!submitted ? (
          <>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Generating...' : 'Get Reset Token'}
              </button>
            </form>
          </>
        ) : (
          <div className="reset-token-box">
            <div className="success-message">
              ✅ Reset token generated successfully!
            </div>
            {resetToken && (
              <>
                <p className="token-label">Your reset token:</p>
                <div className="token-display">
                  <code>{resetToken}</code>
                  <button
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(resetToken)
                      alert('Token copied!')
                    }}
                  >
                    Copy
                  </button>
                </div>
                <p className="token-note">⏱ This token expires in 1 hour.</p>
                <Link to="/reset-password" state={{ token: resetToken }}>
                  <button className="submit-btn" style={{ marginTop: '1rem', width: '100%' }}>
                    Go to Reset Password →
                  </button>
                </Link>
              </>
            )}
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