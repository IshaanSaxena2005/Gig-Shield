import React, { useCallback, useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import WorkerCard from '../components/WorkerCard'
import ClaimAlert from '../components/ClaimAlert'
import { getDashboardData, updateProfile } from '../services/userService'
import { useLocationTracker } from '../hooks/useLocationTracker'
import { getClaims } from '../services/claimService'
import '../styles/dashboard.css'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

const buildAlerts = (weather, claims) => {
  const alerts = []

  if (weather) {
    const condition = String(weather.condition || '').toLowerCase()
    if (condition === 'rain' || condition === 'drizzle') {
      alerts.push({
        id: 'weather-rain',
        title: 'Rain alert',
        message: `Rainfall conditions are active in your area. Weather and payout triggers are being monitored in real time.`
      })
    } else if (condition === 'thunderstorm') {
      alerts.push({
        id: 'weather-storm',
        title: 'Thunderstorm alert',
        message: 'Severe thunderstorm conditions may trigger zero-touch income protection.'
      })
    } else if (weather.temperature >= 42) {
      alerts.push({
        id: 'weather-heat',
        title: 'Extreme heat alert',
        message: 'Heat stress conditions are elevated. Your policy is being monitored for automatic trigger eligibility.'
      })
    }
  }

  const pendingClaims = claims.filter((claim) => ['pending', 'flagged', 'under_review'].includes(String(claim.status || '').toLowerCase()))
  if (pendingClaims.length > 0) {
    alerts.push({
      id: 'claims-pending',
      title: `${pendingClaims.length} payout(s) in progress`,
      message: 'Your pending claims are being reviewed or processed for direct payout.',
      amount: pendingClaims.reduce((sum, claim) => sum + Number(claim.amount || 0), 0)
    })
  }

  return alerts
}

const WorkerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null)
  const [claimsHistory, setClaimsHistory] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [profileForm, setProfileForm] = useState({
    location: '',
    platform: '',
    avgDailyEarnings: '',
    deliveryZone: '',
    latitude: '',
    longitude: '',
    payoutMethod: 'UPI',
    payoutHandle: '',
    payoutAccountName: '',
    directPayoutConsent: false,
    locationTrackingConsent: false
  })

  const locationTracker = useLocationTracker(60000)
  const syncLock = useRef(false)

  // 1. Auto-start tracking if consent was given during registration
  useEffect(() => {
    if (dashboardData?.user?.locationTrackingConsent && !locationTracker.isTracking) {
      locationTracker.startTracking()
    }
  }, [dashboardData?.user?.locationTrackingConsent, locationTracker])

  // 2. Silently sync to backend when location changes
  useEffect(() => {
    if (locationTracker.location && dashboardData?.user?.locationTrackingConsent && !syncLock.current) {
      const { lat, lng } = locationTracker.location
      const currentLat = dashboardData?.user?.latitude ? parseFloat(dashboardData.user.latitude) : 0
      const currentLng = dashboardData?.user?.longitude ? parseFloat(dashboardData.user.longitude) : 0
      
      // Sync if moved significantly (~10 meters) or never synced before
      if (Math.abs(lat - currentLat) > 0.0001 || Math.abs(lng - currentLng) > 0.0001) {
        syncLock.current = true
        
        // Reverse geocode and sync
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            const address = data?.address || {}
            const city = address.city || address.town || address.village || address.state_district
            const suburb = address.suburb || address.neighbourhood || address.residential
            
            return updateProfile({
              latitude: lat,
              longitude: lng,
              ...(city && { location: city }),
              ...(suburb && { deliveryZone: suburb }),
              locationTrackingConsent: true
            })
          })
          .catch(() => {
             // Fallback to just coordinates if geocoding fails
             return updateProfile({
               latitude: lat,
               longitude: lng,
               locationTrackingConsent: true
             })
          })
          .then(() => {
             fetchData()
             setTimeout(() => { syncLock.current = false }, 5000) // 5s cooldown
          })
          .catch(err => {
             console.error('Auto-sync failed', err)
             syncLock.current = false
          })
      }
    }
  }, [locationTracker.location, dashboardData, fetchData])

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, claimsRes] = await Promise.all([getDashboardData(), getClaims()])
      setDashboardData(dashRes)
      setClaimsHistory(claimsRes)
      setProfileForm({
        location: dashRes?.user?.location || '',
        platform: dashRes?.user?.platform || dashRes?.user?.occupation || '',
        avgDailyEarnings: dashRes?.user?.avgDailyEarnings || '',
        deliveryZone: dashRes?.user?.deliveryZone || '',
        latitude: dashRes?.user?.latitude || '',
        longitude: dashRes?.user?.longitude || '',
        payoutMethod: dashRes?.user?.payoutMethod || 'UPI',
        payoutHandle: dashRes?.user?.payoutHandle || '',
        payoutAccountName: dashRes?.user?.payoutAccountName || '',
        directPayoutConsent: Boolean(dashRes?.user?.directPayoutConsent),
        locationTrackingConsent: Boolean(dashRes?.user?.locationTrackingConsent)
      })
      setAlerts(buildAlerts(dashRes?.weather, claimsRes))
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setProfileMsg('')

    if (!profileForm.location || !profileForm.platform) {
      setProfileMsg('Please fill in at least location and platform')
      return
    }

    try {
      setProfileLoading(true)
      await updateProfile({
        location: profileForm.location,
        platform: profileForm.platform,
        occupation: profileForm.platform,
        deliveryZone: profileForm.deliveryZone || undefined,
        avgDailyEarnings: profileForm.avgDailyEarnings ? parseFloat(profileForm.avgDailyEarnings) : undefined
      })
      setProfileMsg('Profile updated successfully')
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
        <div className="dashboard-content"><div className="loading">Loading dashboard...</div></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="dashboard-content"><div className="error">{error}</div></div>
      </div>
    )
  }

  const workerData = {
    name: dashboardData?.user?.name || 'User',
    platform: dashboardData?.user?.platform || dashboardData?.user?.occupation || '-',
    location: dashboardData?.user?.location || '-',
    weeklyPremium: dashboardData?.policy?.premium || 0,
    coverageLimit: dashboardData?.policy?.coverage || 0,
    status: dashboardData?.policy?.status || 'Inactive'
  }

  const directPayoutReady = Boolean(dashboardData?.user?.directPayoutConsent && dashboardData?.user?.payoutHandle)
  const locationTrackingReady = Boolean(
    dashboardData?.user?.locationTrackingConsent &&
    dashboardData?.user?.latitude &&
    dashboardData?.user?.longitude
  )

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">Worker Dashboard</h2>

        {showProfileForm && (
          <div className="info-card" style={{ marginBottom: '1.5rem' }}>
            <h3>Update Work Details</h3>
            {profileMsg && (
              <div className={profileMsg === 'Profile updated successfully' ? 'success-message' : 'error-message'}>
                {profileMsg}
              </div>
            )}
            <form onSubmit={handleProfileUpdate} className="auth-form" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Work City / Location</label>
                <input type="text" value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Delivery Platform</label>
                <select value={profileForm.platform} onChange={(e) => setProfileForm({ ...profileForm, platform: e.target.value })} required>
                  <option value="">Select Platform</option>
                  {PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Average Daily Earnings</label>
                <input type="number" value={profileForm.avgDailyEarnings} onChange={(e) => setProfileForm({ ...profileForm, avgDailyEarnings: e.target.value })} min="100" max="5000" />
              </div>
              <div className="form-group">
                <label>Delivery Zone</label>
                <input type="text" value={profileForm.deliveryZone} onChange={(e) => setProfileForm({ ...profileForm, deliveryZone: e.target.value })} />
              </div>
              <div className="form-group">
                <Link 
                  to="/location-sync"
                  style={{
                    display: 'inline-block',
                    width: '100%',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    textAlign: 'center',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                    marginTop: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  📍 Manage Location Tracking →
                </Link>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '0.75rem', textAlign: 'center' }}>
                  Click to sync your location, set delivery zone, and update your home coordinates
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="submit-btn" disabled={profileLoading}>
                  {profileLoading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="action-btn cancel" onClick={() => setShowProfileForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {dashboardData?.weather && (
          <section className="dashboard-section">
            <div className="weather-card">
              <div className="weather-details">
                <h3>Current Weather - {workerData.location}</h3>
                <p className="weather-condition">{dashboardData.weather.condition}</p>
                <div className="weather-stats">
                  <span>{dashboardData.weather.temperature}C</span>
                  <span>{dashboardData.weather.humidity}% humidity</span>
                  {dashboardData.weather.aqi && <span>AQI {dashboardData.weather.aqi}</span>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Location Sync Prompt - Show when not synced and no consent given */}
        {(!locationTrackingReady && !dashboardData?.user?.locationTrackingConsent) && (
          <section className="dashboard-section">
            <div className="info-card" style={{ background: '#fff3cd', borderLeft: '4px solid #ffc107' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#856404' }}>
                📍 Sync Your Location to Unlock Full Protection
              </h3>
              <p style={{ color: '#856404', fontSize: '14px', marginBottom: '1rem', lineHeight: '1.5' }}>
                Your location helps us verify trigger zones, match local weather data, and process claims faster. 
                <strong> Sync your GPS location now</strong> to activate real-time location tracking.
              </p>
              <Link 
                to="/location-sync"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: '#ffc107',
                  color: '#000',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#ffb300'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#ffc107'}
              >
                🟢 Start Location Sync →
              </Link>
            </div>
          </section>
        )}

        <section className="dashboard-section">
          <WorkerCard
            name={workerData.name}
            platform={workerData.platform}
            location={workerData.location}
            weeklyPremium={workerData.weeklyPremium}
            coverageLimit={workerData.coverageLimit}
            status={workerData.status}
          />
          <button className="link-btn" style={{ marginTop: '0.5rem', fontSize: 13 }} onClick={() => setShowProfileForm(true)}>
            Edit work details and payout settings
          </button>
        </section>

        {/* Location Details Card */}
        {locationTrackingReady && (
          <section className="dashboard-section">
            <div className="info-card" style={{ background: '#f0f9ff', borderLeft: '4px solid #667eea' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                📍 Your Active Location
              </h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Status</span>
                  <span style={{ color: '#22c55e', fontWeight: '600' }}>✅ Location Synced</span>
                </div>
                <div className="info-item">
                  <span className="label">Last Updated</span>
                  <span className="value">
                    {dashboardData?.user?.lastTrackedAt
                      ? new Date(dashboardData.user.lastTrackedAt).toLocaleString()
                      : 'Recently'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Latitude</span>
                  <span className="value" style={{ fontFamily: 'monospace' }}>
                    {dashboardData?.user?.latitude ? parseFloat(dashboardData.user.latitude).toFixed(6) : '-'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Longitude</span>
                  <span className="value" style={{ fontFamily: 'monospace' }}>
                    {dashboardData?.user?.longitude ? parseFloat(dashboardData.user.longitude).toFixed(6) : '-'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Delivery Zone</span>
                  <span className="value">{dashboardData?.user?.deliveryZone || 'Not set'}</span>
                </div>
              </div>
              <Link 
                to="/location-sync"
                style={{
                  display: 'inline-block',
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                🔄 Update Location
              </Link>
            </div>
          </section>
        )}

        <section className="dashboard-section">
          <div className="info-card">
            <h3>Insurance Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Weekly Premium</span>
                <span className="value">{workerData.weeklyPremium}</span>
              </div>
              <div className="info-item">
                <span className="label">Coverage Limit</span>
                <span className="value">{workerData.coverageLimit}</span>
              </div>
              <div className="info-item">
                <span className="label">Policy Status</span>
                <span className={`status-badge ${String(workerData.status).toLowerCase()}`}>{workerData.status}</span>
              </div>
              <div className="info-item">
                <span className="label">Risk Level</span>
                <span className={`risk-badge ${String(dashboardData?.riskLevel || 'medium').toLowerCase()}`}>{dashboardData?.riskLevel || 'Medium'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="earnings-card">
            <h3>Earnings Protected This Week</h3>
            <p className="earnings-amount">{dashboardData?.earningsProtected || 0}</p>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="info-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              💳 Payment Details
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '1rem' }}>
              Approved payouts are sent directly to this destination without any third-party involvement.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '24px' }}>🏦</div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Destination</div>
                <div style={{ fontWeight: '600', color: '#0f172a', fontFamily: 'monospace', fontSize: '15px' }}>
                  {dashboardData?.user?.payoutHandle || 'Please add your UPI or bank details in the profile'}
                </div>
              </div>
            </div>
          </div>
        </section>

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
                  {claimsHistory.map((claim) => (
                    <tr key={claim.id}>
                      <td>{new Date(claim.submittedAt).toDateString()}</td>
                      <td>{claim.description}</td>
                      <td>{claim.triggerValue || '-'}</td>
                      <td>{claim.amount}</td>
                      <td><span className={`status-badge ${String(claim.status || '').toLowerCase()}`}>{claim.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <h3>Live Alerts</h3>
          {alerts.length === 0
            ? <p style={{ color: '#888' }}>No active alerts.</p>
            : alerts.map((alert) => (
              <ClaimAlert
                key={alert.id}
                title={alert.title}
                message={alert.message}
                amount={alert.amount || null}
              />
            ))}
        </section>
      </div>
    </div>
  )
}

export default WorkerDashboard
