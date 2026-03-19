import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import WorkerCard from '../components/WorkerCard'
import ClaimAlert from '../components/ClaimAlert'
import '../styles/dashboard.css'
import { getDashboardData } from '../services/userService'
import { getClaims } from '../services/claimService'
import api from '../services/api'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Amazon', 'Flipkart', 'Other']

const WorkerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null)
  const [claimsHistory, setClaimsHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [alerts] = useState([
    { id: 1, title: 'Weather monitoring active', message: 'Your area is being monitored for disruptions', amount: null }
  ])

  // Profile update state
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileForm, setProfileForm] = useState({ location: '', occupation: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  const fetchData = async () => {
    try {
      const [dashboardResponse, claimsResponse] = await Promise.all([
        getDashboardData(),
        getClaims()
      ])
      setDashboardData(dashboardResponse)
      setClaimsHistory(claimsResponse)
      setProfileForm({
        location: dashboardResponse?.user?.location || '',
        occupation: dashboardResponse?.user?.occupation || ''
      })
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setProfileMsg('')
    if (!profileForm.location || !profileForm.occupation) {
      setProfileMsg('Please fill in both fields')
      return
    }
    try {
      setProfileLoading(true)
      await api.put('/user/profile', profileForm)
      setProfileMsg('✅ Profile updated successfully!')
      setShowProfileForm(false)
      fetchData()
    } catch (err) {
      setProfileMsg(err.response?.data?.message || 'Update failed')
    } finally {
      setProfileLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="dashboard-content">
          <div className="loading">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="dashboard-content">
          <div className="error">{error}</div>
        </div>
      </div>
    )
  }

  const workerData = {
    name: dashboardData?.user?.name || 'User',
    platform: dashboardData?.user?.occupation || '—',
    location: dashboardData?.user?.location || '—',
    weeklyPremium: dashboardData?.policy?.premium || 0,
    coverageLimit: dashboardData?.policy?.coverage || 0,
    status: dashboardData?.policy?.status || 'Inactive',
    riskLevel: dashboardData?.riskLevel || 'Medium',
    earningsProtected: dashboardData?.earningsProtected || 0
  }

  const needsProfile = !dashboardData?.user?.location || !dashboardData?.user?.occupation

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-content">
        <h2 className="page-title">Worker Dashboard</h2>

        {/* Banner if profile is incomplete */}
        {needsProfile && !showProfileForm && (
          <div className="profile-banner">
            ⚠️ Your work location and platform are not set.
            <button className="link-btn" onClick={() => setShowProfileForm(true)}>
              Set them now →
            </button>
          </div>
        )}

        {/* Profile update form */}
        {showProfileForm && (
          <div className="info-card" style={{ marginBottom: '1.5rem' }}>
            <h3>Update Work Details</h3>
            {profileMsg && (
              <div className={profileMsg.startsWith('✅') ? 'success-message' : 'error-message'}>
                {profileMsg}
              </div>
            )}
            <form onSubmit={handleProfileUpdate} className="auth-form" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Work City / Location</label>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                  placeholder="e.g. Mumbai, Delhi, Bangalore"
                  required
                />
              </div>
              <div className="form-group">
                <label>Delivery Platform</label>
                <select
                  value={profileForm.occupation}
                  onChange={e => setProfileForm({ ...profileForm, occupation: e.target.value })}
                  required
                >
                  <option value="">Select Platform</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="submit-btn" disabled={profileLoading}>
                  {profileLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="action-btn cancel"
                  onClick={() => setShowProfileForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Weather Info */}
        {dashboardData?.weather && (
          <section className="dashboard-section">
            <div className="weather-card">
              <div className="weather-icon">
                {dashboardData.weather.condition === 'Rain' ? '🌧️' :
                 dashboardData.weather.condition === 'Thunderstorm' ? '⛈️' :
                 dashboardData.weather.condition === 'Snow' ? '❄️' :
                 dashboardData.weather.condition === 'Clouds' ? '☁️' : '☀️'}
              </div>
              <div className="weather-details">
                <h3>Current Weather — {workerData.location}</h3>
                <p className="weather-condition">{dashboardData.weather.condition}</p>
                <div className="weather-stats">
                  <span>🌡️ {dashboardData.weather.temperature}°C</span>
                  <span>💧 {dashboardData.weather.humidity}% humidity</span>
                </div>
                {(dashboardData.weather.condition === 'Rain' ||
                  dashboardData.weather.condition === 'Thunderstorm') && (
                  <div className="weather-alert">
                    ⚠️ Adverse weather detected — you may be eligible for an automatic claim
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Worker Card */}
        <section className="dashboard-section">
          <WorkerCard
            name={workerData.name}
            platform={workerData.platform}
            location={workerData.location}
            weeklyPremium={workerData.weeklyPremium}
            coverageLimit={workerData.coverageLimit}
            status={workerData.status}
          />
          {!showProfileForm && (
            <button
              className="link-btn"
              style={{ marginTop: '0.5rem', fontSize: '13px' }}
              onClick={() => setShowProfileForm(true)}
            >
              ✏️ Edit work location / platform
            </button>
          )}
        </section>

        {/* Insurance Information */}
        <section className="dashboard-section">
          <div className="info-card">
            <h3>Insurance Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Weekly Premium:</span>
                <span className="value">₹{workerData.weeklyPremium}</span>
              </div>
              <div className="info-item">
                <span className="label">Coverage Limit:</span>
                <span className="value">₹{workerData.coverageLimit}</span>
              </div>
              <div className="info-item">
                <span className="label">Policy Status:</span>
                <span className={`status-badge ${workerData.status.toLowerCase()}`}>
                  {workerData.status}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Risk Level:</span>
                <span className={`risk-badge ${workerData.riskLevel.toLowerCase()}`}>
                  {workerData.riskLevel}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Earnings */}
        <section className="dashboard-section">
          <div className="earnings-card">
            <h3>Earnings Protected This Week</h3>
            <p className="earnings-amount">₹{workerData.earningsProtected}</p>
          </div>
        </section>

        {/* Claims History */}
        <section className="dashboard-section">
          <div className="table-card">
            <h3>Claims History</h3>
            {claimsHistory.length === 0 ? (
              <p style={{ color: '#888', padding: '1rem' }}>No claims yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Disruption</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {claimsHistory.map(claim => (
                    <tr key={claim.id}>
                      <td>{new Date(claim.submittedAt).toDateString()}</td>
                      <td>{claim.description}</td>
                      <td>₹{claim.amount}</td>
                      <td>
                        <span className={`status-badge ${claim.status?.toLowerCase()}`}>
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Alerts */}
        <section className="dashboard-section">
          <h3>Recent Alerts</h3>
          {alerts.map(alert => (
            <ClaimAlert
              key={alert.id}
              title={alert.title}
              message={alert.message}
              amount={alert.amount}
            />
          ))}
        </section>
      </div>
    </div>
  )
}

export default WorkerDashboard