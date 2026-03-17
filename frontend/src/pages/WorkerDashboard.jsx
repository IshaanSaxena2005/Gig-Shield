import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import WorkerCard from '../components/WorkerCard'
import ClaimAlert from '../components/ClaimAlert'
import '../styles/dashboard.css'
import { getDashboardData } from '../services/userService'
import { getClaims } from '../services/claimService'

/**
 * Worker Dashboard Component
 * Main dashboard for delivery partners to view their insurance and claims
 */
const WorkerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null)
  const [claimsHistory, setClaimsHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashboardResponse, claimsResponse] = await Promise.all([
          getDashboardData(),
          getClaims()
        ])

        setDashboardData(dashboardResponse)
        setClaimsHistory(claimsResponse)
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

  const workerData = dashboardData ? {
    name: 'User', // Would come from auth context
    platform: 'Delivery Platform',
    location: 'Location',
    weeklyPremium: dashboardData.policy?.premium || 0,
    coverageLimit: dashboardData.policy?.coverage || 0,
    status: dashboardData.policy?.status || 'Inactive',
    riskLevel: dashboardData.riskLevel || 'Medium',
    earningsProtected: dashboardData.earningsProtected || 0
  } : {
    name: 'User',
    platform: 'Delivery Platform',
    location: 'Location',
    weeklyPremium: 0,
    coverageLimit: 0,
    status: 'Inactive',
    riskLevel: 'Medium',
    earningsProtected: 0
  }

  // Mock alerts - in real app, this would come from API
  const [alerts] = useState([
    { id: 1, title: 'Weather monitoring active', message: 'Your area is being monitored for disruptions', amount: null }
  ])

  return (
    <div className="dashboard-container">
      <Navbar />
      
      <div className="dashboard-content">
        <h2 className="page-title">Worker Dashboard</h2>
        
        {/* Worker Info Card */}
        <section className="dashboard-section">
          <WorkerCard
            name={workerData.name}
            platform={workerData.platform}
            location={workerData.location}
            weeklyPremium={workerData.weeklyPremium}
            coverageLimit={workerData.coverageLimit}
            status={workerData.status}
          />
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

        {/* Earnings Protection Section */}
        <section className="dashboard-section">
          <div className="earnings-card">
            <h3>Earnings Protected This Week</h3>
            <p className="earnings-amount">₹{workerData.earningsProtected}</p>
          </div>
        </section>

        {/* Claims History Table */}
        <section className="dashboard-section">
          <div className="table-card">
            <h3>Claims History</h3>
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
                    <td>{claim.date}</td>
                    <td>{claim.disruption}</td>
                    <td>₹{claim.amount}</td>
                    <td>
                      <span className={`status-badge ${claim.status.toLowerCase()}`}>
                        {claim.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Alerts Section */}
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
