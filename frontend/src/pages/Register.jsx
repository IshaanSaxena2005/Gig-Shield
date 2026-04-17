import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/authService'
import '../styles/dashboard.css'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    platform: '',
    workCity: '',
    averageDailyIncome: '',
    payoutMethod: 'UPI',
    payoutHandle: '',
    payoutAccountName: '',
    directPayoutConsent: true,
    locationTrackingConsent: true,
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.fullName || !formData.platform || !formData.workCity ||
        !formData.averageDailyIncome || !formData.email || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const income = parseFloat(formData.averageDailyIncome)
    if (isNaN(income) || income <= 0 || income > 5000) {
      setError('Average daily income must be between 1 and 5000')
      return
    }

    try {
      setLoading(true)
      const userData = await registerUser({
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        platform: formData.platform,
        location: formData.workCity,
        avgDailyEarnings: income,
        payoutMethod: formData.payoutMethod,
        payoutHandle: formData.payoutHandle || undefined,
        payoutAccountName: formData.payoutAccountName || undefined,
        directPayoutConsent: formData.directPayoutConsent,
        locationTrackingConsent: formData.locationTrackingConsent
      })

      localStorage.setItem('user', JSON.stringify(userData))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h2>Get Insured Today</h2>
          <p className="auth-subtitle">Protect your delivery income from weather disruptions</p>
        </div>

        {error && <div className="error-message">❌ {error}</div>}

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
              {PLATFORMS.map((platform) => (
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
              placeholder="e.g. Chennai, Mumbai, Delhi"
              required
            />
          </div>

          <div className="form-group">
            <label>Average Daily Income</label>
            <input
              type="number"
              name="averageDailyIncome"
              value={formData.averageDailyIncome}
              onChange={handleChange}
              placeholder="e.g. 700"
              min="1"
              max="5000"
              required
            />
            <small style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
              Used to calculate your income-loss payout accurately
            </small>
          </div>

          <div style={{
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
            border: '2px solid #667eea30',
            borderRadius: '12px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>💳</div>
              <div>
                <h3 style={{ margin: '0', fontSize: '1.1rem', fontWeight: '600' }}>Fast Payouts</h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-secondary)', fontSize: '13px' }}>Direct to your account in 24 hours</p>
              </div>
            </div>
            <p style={{ margin: '1rem 0', color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              ✅ No middlemen • ✅ No delays • ✅ 100% transparent
            </p>
            <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: '500', fontSize: '13px' }}>How would you like to receive payouts?</label>
                <select name="payoutMethod" value={formData.payoutMethod} onChange={handleChange} style={{ marginTop: '0.5rem' }}>
                  <option value="UPI">📱 UPI (Fastest)</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: '500', fontSize: '13px' }}>{formData.payoutMethod === 'UPI' ? '📱 Your UPI ID' : '🏦 Account Details'}</label>
                <input
                  type="text"
                  name="payoutHandle"
                  value={formData.payoutHandle}
                  onChange={handleChange}
                  placeholder={formData.payoutMethod === 'UPI' ? 'yourname@upi' : 'Account number or IBAN'}
                  style={{ marginTop: '0.5rem' }}
                />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: '500', fontSize: '13px' }}>👤 Name on account</label>
                <input
                  type="text"
                  name="payoutAccountName"
                  value={formData.payoutAccountName}
                  onChange={handleChange}
                  placeholder="Your full name"
                  style={{ marginTop: '0.5rem' }}
                />
              </div>
            </div>
            <label style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              fontSize: '13px',
              background: '#e8f5e9',
              padding: '0.75rem',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1px solid #c8e6c9'
            }}>
              <input
                type="checkbox"
                checked={formData.directPayoutConsent}
                onChange={(e) => setFormData({ ...formData, directPayoutConsent: e.target.checked })}
                style={{ marginTop: '2px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '500' }}>I confirm direct payments. No third parties involved.</span>
            </label>
          </div>

          <div style={{
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #f093fb15 0%, #f5576c15 100%)',
            border: '2px solid #f093fb30',
            borderRadius: '12px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>📍</div>
              <div>
                <h3 style={{ margin: '0', fontSize: '1.1rem', fontWeight: '600' }}>Smart Location Tracking</h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-secondary)', fontSize: '13px' }}>Verify claims faster & prevent fraud</p>
              </div>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              lineHeight: '1.6'
            }}>
              <p style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                <strong>What we use it for:</strong>
              </p>
              <ul style={{ margin: '0', paddingLeft: '1.5rem', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <li>🌍 Match your location to trigger zones</li>
                <li>🌤️ Verify local weather conditions during claims</li>
                <li>✅ Ensure fair and accurate payouts</li>
                <li>🛡️ Prevent location spoofing fraud</li>
              </ul>
            </div>
            <label style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              fontSize: '13px',
              background: '#e3f2fd',
              padding: '0.75rem',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1px solid #bbdefb'
            }}>
              <input
                type="checkbox"
                checked={formData.locationTrackingConsent}
                onChange={(e) => setFormData({ ...formData, locationTrackingConsent: e.target.checked })}
                style={{ marginTop: '2px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '500' }}>I consent to location tracking for faster claim verification.</span>
            </label>
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
              placeholder="Create a password (min 8 characters)"
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '⏳ Creating your account...' : '✨ Get Insured'}
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
