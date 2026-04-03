import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/authService'
import '../styles/dashboard.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    platform: '',
    workCity: '',
    averageDailyIncome: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const platforms = ['Zomato', 'Swiggy', 'Zepto', 'Amazon', 'Flipkart']

  const handleChange = (e) => {
    const { name, value } = e.target
    const normalizedValue = name === 'email'
      ? value.replace(/\s+/g, '')
      : value

    setFormData({ ...formData, [name]: normalizedValue })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const normalizedEmail = formData.email.trim().toLowerCase()
    const normalizedName = formData.fullName.trim()
    const normalizedCity = formData.workCity.trim()
    const normalizedIncome = Number(formData.averageDailyIncome)

    if (!normalizedName || !formData.platform || !normalizedCity ||
        !formData.averageDailyIncome || !normalizedEmail || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Please enter a valid email address')
      return
    }

    if (!Number.isFinite(normalizedIncome) || normalizedIncome <= 0) {
      setError('Please enter a valid average daily income')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      // FIX: actually call the real API
      await registerUser({
        name: normalizedName,
        email: normalizedEmail,
        password: formData.password,
        occupation: formData.platform,
        location: normalizedCity,
        averageDailyIncome: normalizedIncome
      })

      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Register as Delivery Partner</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label>Delivery Platform</label>
            <select
              name="platform"
              value={formData.platform}
              onChange={handleChange}
              required
            >
              <option value="">Select Platform</option>
              {platforms.map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Work City</label>
            <input
              type="text"
              name="workCity"
              value={formData.workCity}
              onChange={handleChange}
              placeholder="Enter your work city"
              required
            />
          </div>

          <div className="form-group">
            <label>Average Daily Income (₹)</label>
            <input
              type="number"
              name="averageDailyIncome"
              value={formData.averageDailyIncome}
              onChange={handleChange}
              placeholder="Enter average daily income"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password (min 6 characters)"
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
