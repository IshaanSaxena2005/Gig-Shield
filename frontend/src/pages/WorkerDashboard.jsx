import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import WorkerCard from '../components/WorkerCard'
import ClaimAlert from '../components/ClaimAlert'
import '../styles/dashboard.css'
import { getDashboardData } from '../services/userService'
import { getClaims, submitClaim } from '../services/claimService'
import api from '../services/api'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Amazon', 'Flipkart', 'Other']

const WorkerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null)
  const [claimsHistory, setClaimsHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileForm, setProfileForm] = useState({ location: '', occupation: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [claimForm, setClaimForm] = useState({ amount: '', description: '' })
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimMsg, setClaimMsg] = useState('')

  const fetchData = async () => {
    try {
      const [dashboardResult, claimsResult] = await Promise.allSettled([
        getDashboardData(),
        getClaims()
      ])

      if (dashboardResult.status !== 'fulfilled') {
        throw dashboardResult.reason
      }

      const dashboardResponse = dashboardResult.value
      const claimsResponse = claimsResult.status === 'fulfilled' ? claimsResult.value : []

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

  const handleProfileUpdate = async (event) => {
    event.preventDefault()
    setProfileMsg('')
    if (!profileForm.location || !profileForm.occupation) {
      setProfileMsg('Please fill in both fields')
      return
    }
    try {
      setProfileLoading(true)
      await api.put('/user/profile', profileForm)
      setProfileMsg('Profile updated successfully!')
      setShowProfileForm(false)
      fetchData()
    } catch (err) {
      setProfileMsg(err.response?.data?.message || 'Update failed')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleClaimSubmit = async (event) => {
    event.preventDefault()
    setClaimMsg('')

    if (!dashboardData?.policy?.id) {
      setClaimMsg('Create a policy before submitting a claim.')
      return
    }

    if (!claimForm.amount || !claimForm.description) {
      setClaimMsg('Enter both an amount and a disruption description.')
      return
    }

    try {
      setClaimLoading(true)
      const result = await submitClaim({
        policyId: dashboardData.policy.id,
        amount: Number(claimForm.amount),
        description: claimForm.description
      })
      setClaimMsg(result.fraudAlert ? 'Claim submitted and moved to soft review.' : 'Claim submitted successfully.')
      setClaimForm({ amount: '', description: '' })
      await fetchData()
    } catch (err) {
      setClaimMsg(err.response?.data?.message || 'Failed to submit claim')
    } finally {
      setClaimLoading(false)
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
    platform: dashboardData?.policy?.occupation || dashboardData?.user?.occupation || '-',
    location: dashboardData?.policy?.location || dashboardData?.user?.location || '-',
    weeklyPremium: dashboardData?.policy?.premium || 0,
    coverageLimit: dashboardData?.policy?.coverage || 0,
    status: dashboardData?.policy?.status || 'Inactive',
    riskLevel: dashboardData?.policy?.riskLevel || dashboardData?.riskLevel || 'medium',
    earningsProtected: dashboardData?.earningsProtected || 0
  }

  const alerts = [
    { id: 1, title: 'Automation active', message: 'Zero-touch claim monitoring is running against live and mock disruption feeds.', amount: null },
    ...(dashboardData?.activeTriggers || []).map((trigger) => ({
      id: trigger.type,
      title: trigger.title,
      message: `${trigger.description} Source: ${trigger.source}.`,
      amount: trigger.autoApprove ? `Projected payout Rs${trigger.payoutAmount}` : `Projected payout Rs${trigger.payoutAmount} after review`
    }))
  ]

  const needsProfile = !dashboardData?.user?.location || !dashboardData?.user?.occupation

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">Worker Dashboard</h2>

        {needsProfile && !showProfileForm && (
          <div className="profile-banner">
            Your work location and platform are not set.
            <button className="link-btn" onClick={() => setShowProfileForm(true)}>
              Set them now
            </button>
          </div>
        )}

        {showProfileForm && (
          <div className="info-card bottom-space">
            <h3>Update Work Details</h3>
            {profileMsg && (
              <div className={profileMsg.includes('successfully') ? 'success-message' : 'error-message'}>
                {profileMsg}
              </div>
            )}
            <form onSubmit={handleProfileUpdate} className="auth-form top-space">
              <div className="form-group">
                <label>Work City / Location</label>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={(event) => setProfileForm({ ...profileForm, location: event.target.value })}
                  placeholder="e.g. Mumbai, Delhi, Bangalore"
                  required
                />
              </div>
              <div className="form-group">
                <label>Delivery Platform</label>
                <select
                  value={profileForm.occupation}
                  onChange={(event) => setProfileForm({ ...profileForm, occupation: event.target.value })}
                  required
                >
                  <option value="">Select Platform</option>
                  {PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                </select>
              </div>
              <div className="button-row">
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
              <div className="weather-icon">
                {dashboardData.weather.condition === 'Rain' ? 'Rain' :
                  dashboardData.weather.condition === 'Thunderstorm' ? 'Storm' :
                    dashboardData.weather.condition === 'Snow' ? 'Snow' :
                      dashboardData.weather.condition === 'Clouds' ? 'Clouds' : 'Sun'}
              </div>
              <div className="weather-details">
                <h3>Current weather in {workerData.location}</h3>
                <p className="weather-condition">{dashboardData.weather.condition}</p>
                <div className="weather-stats">
                  <span>{dashboardData.weather.temperature}C</span>
                  <span>{dashboardData.weather.humidity}% humidity</span>
                </div>
                {!!dashboardData?.activeTriggers?.length && (
                  <div className="weather-alert">
                    {dashboardData.activeTriggers.length} disruption trigger(s) currently active for your coverage window
                  </div>
                )}
              </div>
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
          {!showProfileForm && (
            <button className="link-btn top-space" onClick={() => setShowProfileForm(true)}>
              Edit work location / platform
            </button>
          )}
        </section>

        <section className="dashboard-section">
          <div className="info-card">
            <h3>Dynamic Premium and Protection</h3>
            {!dashboardData?.policy && (
              <p className="muted-copy">
                You are registered and protected routing is working. Create your first policy to unlock dynamic premium pricing and automated claims.
              </p>
            )}
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Weekly Premium:</span>
                <span className="value">Rs{workerData.weeklyPremium}</span>
              </div>
              <div className="info-item">
                <span className="label">Coverage Limit:</span>
                <span className="value">Rs{workerData.coverageLimit}</span>
              </div>
              <div className="info-item">
                <span className="label">Risk Level:</span>
                <span className={`risk-badge ${String(workerData.riskLevel).toLowerCase()}`}>
                  {workerData.riskLevel}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Protected Hours:</span>
                <span className="value">{dashboardData?.policy?.recommendedCoverageHours || 24} hrs/week</span>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="automation-grid">
            <div className="earnings-card">
              <h3>Earnings Protected This Week</h3>
              <p className="earnings-amount">Rs{workerData.earningsProtected}</p>
            </div>
            <div className="info-card">
              <h3>Zero-touch claim flow</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Auto-approved claims</span>
                  <span className="value">{dashboardData?.automationSummary?.zeroTouchClaims || 0}</span>
                </div>
                <div className="info-item">
                  <span className="label">Claims in soft review</span>
                  <span className="value">{dashboardData?.automationSummary?.flaggedClaims || 0}</span>
                </div>
              </div>
              <p className="muted-copy top-space">
                Verified weather triggers pay out automatically. Edge cases like civic restrictions or mixed signals go into soft review so honest workers are not blocked unfairly.
              </p>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="info-card">
            <h3>Manual claim submission</h3>
            <p className="muted-copy">Use this when you had a genuine disruption that did not trigger automatically.</p>
            {claimMsg && (
              <div className={claimMsg.includes('successfully') || claimMsg.includes('soft review') ? 'success-message top-space' : 'error-message top-space'}>
                {claimMsg}
              </div>
            )}
            <form onSubmit={handleClaimSubmit} className="auth-form top-space">
              <div className="info-grid">
                <div className="form-group">
                  <label>Claim Amount (Rs)</label>
                  <input
                    type="number"
                    value={claimForm.amount}
                    onChange={(event) => setClaimForm({ ...claimForm, amount: event.target.value })}
                    placeholder="e.g. 450"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Disruption Summary</label>
                  <input
                    type="text"
                    value={claimForm.description}
                    onChange={(event) => setClaimForm({ ...claimForm, description: event.target.value })}
                    placeholder="e.g. Delivery route was shut due to waterlogging"
                    required
                  />
                </div>
              </div>
              <div className="button-row">
                <button type="submit" className="submit-btn" disabled={claimLoading}>
                  {claimLoading ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {!!dashboardData?.activeTriggers?.length && (
          <section className="dashboard-section">
            <div className="table-card">
              <h3>Active automated triggers</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trigger</th>
                    <th>Severity</th>
                    <th>Projected Payout</th>
                    <th>Payout Path</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.activeTriggers.map((trigger) => (
                    <tr key={trigger.type}>
                      <td>{trigger.title}</td>
                      <td><span className={`severity-badge ${trigger.severity}`}>{trigger.severity}</span></td>
                      <td>Rs{trigger.payoutAmount}</td>
                      <td>{trigger.autoApprove ? 'Zero-touch' : 'Soft review'}</td>
                      <td>{trigger.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="dashboard-section">
          <div className="table-card">
            <h3>Claims History</h3>
            {claimsHistory.length === 0 ? (
              <p className="muted-copy">No claims yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Disruption</th>
                    <th>Source</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {claimsHistory.map((claim) => (
                    <tr key={claim.id}>
                      <td>{new Date(claim.submittedAt).toDateString()}</td>
                      <td>{claim.description}</td>
                      <td>{claim.source || 'manual'}</td>
                      <td>Rs{Number(claim.amount).toFixed(2)}</td>
                      <td>
                        <span className={`status-badge ${String(claim.status || '').toLowerCase()}`}>
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

        <section className="dashboard-section">
          <h3>Recent Alerts</h3>
          {alerts.map((alert) => (
            <ClaimAlert key={alert.id} title={alert.title} message={alert.message} amount={alert.amount} />
          ))}
        </section>
      </div>
    </div>
  )
}

export default WorkerDashboard
