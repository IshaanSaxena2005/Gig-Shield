import React, { useState, useEffect, useCallback } from 'react'
import Navbar      from '../components/Navbar'
import WorkerCard  from '../components/WorkerCard'
import ClaimAlert  from '../components/ClaimAlert'
import '../styles/dashboard.css'
import { getDashboardData } from '../services/userService'
import { getClaims }        from '../services/claimService'
import api                  from '../services/api'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

// ── Build dynamic alerts from live data ──────────────────────────────────────
const buildAlerts = (weather, claims) => {
  const alerts = []

  // FIX: generate weather alerts from actual API data, not hardcoded strings
  if (weather) {
    const cond = weather.condition?.toLowerCase() ?? ''

    if (cond === 'rain' || cond === 'drizzle') {
      alerts.push({
        id: 'weather-rain',
        title: '🌧️ Rain Alert — Parametric trigger active',
        message: `Rainfall detected in your area (${weather.temperature}°C, ${weather.humidity}% humidity). If rainfall exceeds 50mm/3hr, your income-loss claim will be filed automatically.`,
        type: 'warning'
      })
    } else if (cond === 'thunderstorm') {
      alerts.push({
        id: 'weather-storm',
        title: '⛈️ Thunderstorm — Auto-claim likely',
        message: `Thunderstorm conditions active in ${weather.location || 'your area'}. Parametric trigger is monitoring — payout will be initiated if thresholds are met.`,
        type: 'danger'
      })
    } else if (weather.temperature >= 42) {
      alerts.push({
        id: 'weather-heat',
        title: '🌡️ Extreme Heat Alert',
        message: `Temperature is ${weather.temperature}°C — exceeds 42°C threshold. Standard/Pro plan holders may be eligible for an auto-claim.`,
        type: 'warning'
      })
    } else if (weather.aqi && weather.aqi >= 200) {
      alerts.push({
        id: 'weather-aqi',
        title: '😷 Severe AQI Alert',
        message: `Air quality index is ${weather.aqi} (Severe). Outdoor delivery is hazardous. Auto-claim may be triggered for eligible plan holders.`,
        type: 'warning'
      })
    } else {
      alerts.push({
        id: 'weather-ok',
        title: '✅ Weather monitoring active',
        message: `Current conditions are normal (${weather.condition}, ${weather.temperature}°C). Your area is being monitored for disruptions.`,
        type: 'info'
      })
    }
  }

  // FIX: show alert for any pending/processing claims
  const pendingClaims = claims.filter(c => c.status === 'pending' || c.status === 'approved' && !c.processedAt)
  if (pendingClaims.length > 0) {
    alerts.push({
      id: 'claim-pending',
      title: `💰 ${pendingClaims.length} claim(s) in progress`,
      message: `You have ${pendingClaims.length} pending claim(s). Payouts are processed within 4 hours via UPI.`,
      amount: pendingClaims.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
      type: 'info'
    })
  }

  return alerts
}

// ── Component ─────────────────────────────────────────────────────────────────
const WorkerDashboard = () => {
  const [dashboardData,  setDashboardData]  = useState(null)
  const [claimsHistory,  setClaimsHistory]  = useState([])
  const [alerts,         setAlerts]         = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileForm,    setProfileForm]    = useState({ location: '', occupation: '', avgDailyEarnings: '', deliveryZone: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg,     setProfileMsg]     = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, claimsRes] = await Promise.all([
        getDashboardData(),
        getClaims()
      ])
      setDashboardData(dashRes)
      setClaimsHistory(claimsRes)
      setProfileForm({
        location:          dashRes?.user?.location          || '',
        occupation:        dashRes?.user?.occupation        || '',
        avgDailyEarnings:  dashRes?.user?.avgDailyEarnings  || '',
        deliveryZone:      dashRes?.user?.deliveryZone      || ''
      })
      // FIX: build alerts from live data
      setAlerts(buildAlerts(dashRes?.weather, claimsRes))
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setProfileMsg('')
    if (!profileForm.location || !profileForm.occupation) {
      setProfileMsg('Please fill in at least location and platform')
      return
    }
    try {
      setProfileLoading(true)
      await api.put('/user/profile', {
        location:         profileForm.location,
        occupation:       profileForm.occupation,
        deliveryZone:     profileForm.deliveryZone,
        avgDailyEarnings: profileForm.avgDailyEarnings
          ? parseFloat(profileForm.avgDailyEarnings)
          : undefined
      })
      setProfileMsg('✅ Profile updated successfully!')
      setShowProfileForm(false)
      fetchData()
    } catch (err) {
      setProfileMsg(err.response?.data?.message || 'Update failed')
    } finally {
      setProfileLoading(false)
    }
  }

  if (loading) return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content"><div className="loading">Loading dashboard...</div></div>
    </div>
  )

  if (error) return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content"><div className="error">{error}</div></div>
    </div>
  )

  const workerData = {
    name:             dashboardData?.user?.name             || 'User',
    platform:         dashboardData?.user?.occupation       || '—',
    location:         dashboardData?.user?.location         || '—',
    weeklyPremium:    dashboardData?.policy?.premium        || 0,
    coverageLimit:    dashboardData?.policy?.coverage       || 0,
    status:           dashboardData?.policy?.status         || 'Inactive',
    riskLevel:        dashboardData?.riskLevel              || 'Medium',
    earningsProtected: dashboardData?.earningsProtected     || 0
  }

  const needsProfile = !dashboardData?.user?.location || !dashboardData?.user?.occupation

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">Worker Dashboard</h2>

        {/* Incomplete profile banner */}
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
                  placeholder="e.g. Chennai, Mumbai, Delhi"
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
              {/* FIX: new fields for earnings profile */}
              <div className="form-group">
                <label>Avg Daily Earnings (₹) <span style={{ color: '#888', fontSize: '12px' }}>— used to size your payout</span></label>
                <input
                  type="number"
                  value={profileForm.avgDailyEarnings}
                  onChange={e => setProfileForm({ ...profileForm, avgDailyEarnings: e.target.value })}
                  placeholder="e.g. 820"
                  min="100"
                  max="5000"
                />
              </div>
              <div className="form-group">
                <label>Delivery Zone (optional)</label>
                <input
                  type="text"
                  value={profileForm.deliveryZone}
                  onChange={e => setProfileForm({ ...profileForm, deliveryZone: e.target.value })}
                  placeholder="e.g. T. Nagar / Mylapore"
                />
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

        {/* Weather card */}
        {dashboardData?.weather && (
          <section className="dashboard-section">
            <div className="weather-card">
              <div className="weather-icon">
                {dashboardData.weather.condition === 'Rain'        ? '🌧️' :
                 dashboardData.weather.condition === 'Thunderstorm' ? '⛈️' :
                 dashboardData.weather.condition === 'Snow'         ? '❄️' :
                 dashboardData.weather.condition === 'Clouds'       ? '☁️' : '☀️'}
              </div>
              <div className="weather-details">
                <h3>Current Weather — {workerData.location}</h3>
                <p className="weather-condition">{dashboardData.weather.condition}</p>
                <div className="weather-stats">
                  <span>🌡️ {dashboardData.weather.temperature}°C</span>
                  <span>💧 {dashboardData.weather.humidity}% humidity</span>
                  {dashboardData.weather.aqi && (
                    <span>💨 AQI {dashboardData.weather.aqi}</span>
                  )}
                </div>
                {(dashboardData.weather.condition === 'Rain' ||
                  dashboardData.weather.condition === 'Thunderstorm' ||
                  dashboardData.weather.temperature >= 42 ||
                  (dashboardData.weather.aqi && dashboardData.weather.aqi >= 200)) && (
                  <div className="weather-alert">
                    ⚠️ Adverse conditions detected — you may be eligible for an automatic payout
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

        {/* Insurance info */}
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
                    <th>Trigger</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {claimsHistory.map(claim => (
                    <tr key={claim.id}>
                      <td>{new Date(claim.submittedAt).toDateString()}</td>
                      <td>{claim.description}</td>
                      <td>{claim.triggerValue || '—'}</td>
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

        {/* FIX: Dynamic alerts built from live weather + claims data */}
        <section className="dashboard-section">
          <h3>Live Alerts</h3>
          {alerts.length === 0
            ? <p style={{ color: '#888' }}>No active alerts.</p>
            : alerts.map(alert => (
                <ClaimAlert
                  key={alert.id}
                  title={alert.title}
                  message={alert.message}
                  amount={alert.amount || null}
                />
              ))
          }
        </section>
      </div>
    </div>
  )
}

export default WorkerDashboard
