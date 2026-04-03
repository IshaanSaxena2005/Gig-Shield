import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import StatCard from '../components/StatCard'
import '../styles/dashboard.css'
import { getDashboardStats, getRiskZones, getFraudAlerts, getAllClaims, updateClaimStatus } from '../services/adminService'

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({
    workersInsured: 0,
    activePolicies: 0,
    totalPremium: 0,
    totalPayout: 0,
    automatedClaims: 0,
    flaggedClaims: 0
  })
  const [claimsOverview, setClaimsOverview] = useState({
    claimsToday: 0,
    claimsThisWeek: 0,
    totalPayout: 0,
    softReviewQueue: 0
  })
  const [automationMetrics, setAutomationMetrics] = useState({
    automatedClaims: 0,
    zeroTouchApproved: 0,
    softReviewQueue: 0,
    triggerBreakdown: {}
  })
  const [fraudAlerts, setFraudAlerts] = useState([])
  const [riskZones, setRiskZones] = useState([])
  const [claims, setClaims] = useState([])
  const [claimActionLoading, setClaimActionLoading] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsResponse, riskZonesResponse, fraudResponse, claimsResponse] = await Promise.all([
          getDashboardStats(),
          getRiskZones(),
          getFraudAlerts(),
          getAllClaims()
        ])

        setMetrics(statsResponse.platformMetrics)
        setClaimsOverview(statsResponse.claimsOverview)
        setAutomationMetrics(statsResponse.automationMetrics || {})
        setRiskZones(riskZonesResponse)
        setFraudAlerts(fraudResponse)
        setClaims(claimsResponse)
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

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

  const getRiskClass = (level) => String(level || 'medium').toLowerCase()

  const handleClaimDecision = async (claimId, status) => {
    try {
      setClaimActionLoading(claimId)
      const updated = await updateClaimStatus(claimId, status)
      setClaims((currentClaims) => currentClaims.map((claim) => claim.id === claimId ? updated : claim))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update claim status')
    } finally {
      setClaimActionLoading(null)
    }
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">Admin Dashboard</h2>

        <section className="dashboard-section">
          <h3>Platform Metrics</h3>
          <div className="stats-grid">
            <StatCard title="Workers Insured" value={metrics.workersInsured} icon="Users" />
            <StatCard title="Active Policies" value={metrics.activePolicies} icon="Policy" />
            <StatCard title="Total Premium Collected" value={`Rs${metrics.totalPremium.toLocaleString()}`} icon="Premium" />
            <StatCard title="Total Payout" value={`Rs${metrics.totalPayout.toLocaleString()}`} icon="Payout" />
          </div>
        </section>

        <section className="dashboard-section">
          <h3>Claims Automation</h3>
          <div className="info-card">
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Claims Today:</span>
                <span className="value">{claimsOverview.claimsToday}</span>
              </div>
              <div className="info-item">
                <span className="label">Claims This Week:</span>
                <span className="value">{claimsOverview.claimsThisWeek}</span>
              </div>
              <div className="info-item">
                <span className="label">Automated Claims:</span>
                <span className="value">{automationMetrics.automatedClaims || 0}</span>
              </div>
              <div className="info-item">
                <span className="label">Zero-touch Approved:</span>
                <span className="value">{automationMetrics.zeroTouchApproved || 0}</span>
              </div>
              <div className="info-item">
                <span className="label">Soft Review Queue:</span>
                <span className="value">{claimsOverview.softReviewQueue || 0}</span>
              </div>
              <div className="info-item">
                <span className="label">Flagged Claims:</span>
                <span className="value">{metrics.flaggedClaims || 0}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <h3>Trigger Breakdown</h3>
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trigger Type</th>
                  <th>Claims This Week</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(automationMetrics.triggerBreakdown || {}).length === 0 ? (
                  <tr>
                    <td colSpan="2">No automated claims recorded yet.</td>
                  </tr>
                ) : (
                  Object.entries(automationMetrics.triggerBreakdown || {}).map(([trigger, count]) => (
                    <tr key={trigger}>
                      <td>{trigger}</td>
                      <td>{count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-section">
          <h3>Claim Review Queue</h3>
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Description</th>
                  <th>Source</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan="6">No claims found.</td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim.id}>
                      <td>{claim.user?.name || 'Unknown worker'}</td>
                      <td>{claim.description}</td>
                      <td>{claim.source || 'manual'}</td>
                      <td>Rs{Number(claim.amount).toFixed(2)}</td>
                      <td>{claim.status}</td>
                      <td>
                        {(claim.status === 'pending' || claim.status === 'flagged') ? (
                          <div className="table-action-row">
                            <button
                              className="mini-action approve"
                              disabled={claimActionLoading === claim.id}
                              onClick={() => handleClaimDecision(claim.id, 'approved')}
                            >
                              Approve
                            </button>
                            <button
                              className="mini-action reject"
                              disabled={claimActionLoading === claim.id}
                              onClick={() => handleClaimDecision(claim.id, 'rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="muted-copy">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-section">
          <h3>Fraud Detection Alerts</h3>
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alert Type</th>
                  <th>User / Owner</th>
                  <th>Details</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {fraudAlerts.length === 0 ? (
                  <tr>
                    <td colSpan="4">No fraud alerts at the moment.</td>
                  </tr>
                ) : (
                  fraudAlerts.map((alert) => (
                    <tr key={alert.id}>
                      <td>{alert.type}</td>
                      <td>{alert.user}</td>
                      <td>{alert.details}</td>
                      <td>
                        <span className={`severity-badge ${alert.severity}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-section">
          <h3>Risk Zones</h3>
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {riskZones.map((zone) => (
                  <tr key={zone.id || zone.location}>
                    <td>{zone.location}</td>
                    <td>
                      <span className={`risk-badge ${getRiskClass(zone.riskLevel)}`}>
                        {zone.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminDashboard
