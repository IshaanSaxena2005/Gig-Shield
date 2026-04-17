import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { loginUser } from '../services/authService'
import '../styles/dashboard.css'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || null
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      console.log('[Login] Attempting login with email:', formData.email)
      // FIX: actually call the real API instead of mocking it
      const data = await loginUser(formData.email, formData.password)
      console.log('[Login] Login successful, received data:', data)

      // Save full user object including token to localStorage
      localStorage.setItem('user', JSON.stringify(data))
      console.log('[Login] User saved to localStorage')

      // Redirect back to where they came from, or role-based default
      if (from) {
        console.log('[Login] Redirecting to:', from)
        navigate(from)
      } else if (data.role === 'admin') {
        console.log('[Login] Admin user, redirecting to /admin')
        navigate('/admin')
      } else {
        console.log('[Login] Regular user, redirecting to /dashboard')
        navigate('/dashboard')
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Invalid email or password'
      console.error('[Login] Error:', {
        message: errorMsg,
        status: err.response?.status,
        data: err.response?.data,
        fullError: err
      })
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Login to manage your insurance coverage</p>
        </div>

        {error && <div className="error-message">❌ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '⏳ Logging in...' : '🚀 Login'}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
        <p className="auth-link">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
      </div>
    </div>
  )
}

export default Login