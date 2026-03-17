import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import StatCard from '../components/StatCard'
import '../styles/dashboard.css'
import { getDashboardStats, getRiskZones, getFraudAlerts } from '../services/adminService'

/**
 * Admin Dashboard Component
 * Displays platform metrics, claims overview, and fraud detection alerts
 */
const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({
    workersInsured: 0,
    activePolicies: 0,
    totalPremium: 0,
    totalPayout: 0
  })
  const [claimsOverview, setClaimsOverview] = useState({
    claimsToday: 0,
    claimsThisWeek: 0,
    totalPayout: 0
  })
  const [fraudAlerts, setFraudAlerts] = useState([])
  const [riskZones, setRiskZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsResponse, riskZonesResponse, fraudResponse] = await Promise.all([
          getDashboardStats(),
          getRiskZones(),
          getFraudAlerts()
        ])

        setMetrics(statsResponse.platformMetrics)
        setClaimsOverview(statsResponse.claimsOverview)
        setRiskZones(riskZonesResponse)
        setFraudAlerts(fraudResponse)
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

  const getRiskClass = (level) => {
    return level.toLowerCase()
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      
      <div className="dashboard-content">
        <h2 className="page-title">Admin Dashboard</h2>
        
        {/* Platform Metrics */}
        <section className="dashboard-section">
          <h3>Platform Metrics</h3>
          <div className="stats-grid">
            <StatCard
              title="Workers Insured"
              value={metrics.workersInsured}
              icon="👥"
            />
            <StatCard
              title="Active Policies"
              value={metrics.activePolicies}
              icon="📋"
            />
            <StatCard
              title="Total Premium Collected"
              value={`₹${metrics.totalPremium.toLocaleString()}`}
              icon="💰"
            />
            <StatCard
              title="Total Payout"
              value={`₹${metrics.totalPayout.toLocaleString()}`}
              icon="💸"
            />
          </div>
        </section>

        {/* Claims Overview */}
        <section className="dashboard-section">
          <h3>Claims Overview</h3>
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
                <span className="label">Total Payout:</span>
                <span className="value">₹{claimsOverview.totalPayout.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Fraud Alerts */}
        <section className="dashboard-section">
          <h3>Fraud Detection Alerts</h3>
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alert Type</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {fraudAlerts.map(alert => (
                  <tr key={alert.id}>
                    <td>{alert.type}</td>
                    <td>
                      <span className={`severity-badge ${alert.severity}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Risk Zones Table */}
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
                {riskZones.map((zone, index) => (
                  <tr key={index}>
                    <td>{zone.area}</td>
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
