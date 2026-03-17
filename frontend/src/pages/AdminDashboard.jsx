import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import StatCard from '../components/StatCard'
import '../styles/dashboard.css'

/**
 * Admin Dashboard Component
 * Displays platform metrics, claims overview, and fraud detection alerts
 */
const AdminDashboard = () => {
  // Mock platform metrics
  const [metrics] = useState({
    workersInsured: 1247,
    activePolicies: 892,
    totalPremium: 13380,
    totalPayout: 45600
  })

  // Mock claims overview
  const [claimsOverview] = useState({
    claimsToday: 23,
    claimsThisWeek: 156,
    totalPayout: 45600
  })

  // Mock fraud alerts
  const [fraudAlerts] = useState([
    { id: 1, type: 'GPS mismatch detected', severity: 'high' },
    { id: 2, type: 'Duplicate claim flagged', severity: 'medium' },
    { id: 3, type: 'Suspicious claim pattern', severity: 'low' }
  ])

  // Mock risk zones
  const [riskZones] = useState([
    { area: 'South Mumbai', riskLevel: 'High' },
    { area: 'Andheri', riskLevel: 'Medium' },
    { area: 'Bandra', riskLevel: 'Low' },
    { area: 'Powai', riskLevel: 'High' },
    { area: 'Thane', riskLevel: 'Medium' }
  ])

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
