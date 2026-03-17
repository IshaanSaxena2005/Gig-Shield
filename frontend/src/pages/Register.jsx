import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../styles/dashboard.css'

/**
 * Register Page Component
 * Handles new user registration for delivery partners
 */
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

  const platforms = ['Zomato', 'Swiggy', 'Zepto', 'Amazon', 'Flipkart']

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('') // Clear error on input change
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.fullName || !formData.platform || !formData.workCity || 
        !formData.averageDailyIncome || !formData.email || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    try {
      // Mock API call - replace with actual registration endpoint
      console.log('Registering with:', formData)
      
      // Simulate successful registration
      alert('Registration successful! Please login.')
      navigate('/login')
    } catch (err) {
      setError('Unable to fetch data. Please try again later')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Register as Delivery Partner</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
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
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
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
              placeholder="Create a password"
              required
            />
          </div>
          
          <button type="submit" className="submit-btn">Register</button>
        </form>
        
        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
