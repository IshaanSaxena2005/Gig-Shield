import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import WorkerCard from '../components/WorkerCard'
import ClaimAlert from '../components/ClaimAlert'
import '../styles/dashboard.css'

/**
 * Worker Dashboard Component
 * Main dashboard for delivery partners to view their insurance and claims
 */
const WorkerDashboard = () => {
  // Mock worker data
  const [workerData] = useState({
    name: 'Rajesh Kumar',
    platform: 'Zomato',
    location: 'Mumbai',
    weeklyPremium: 15,
    coverageLimit: 800,
    status: 'Active',
    riskLevel: 'Medium',
    earningsProtected: 300
  })

  // Mock claims history
  const [claimsHistory] = useState([
    { id: 1, date: 'Mar 10', disruption: 'Heavy Rain', amount: 150, status: 'Paid' },
    { id: 2, date: 'Mar 12', disruption: 'Flood', amount: 200, status: 'Paid' }
  ])

  // Mock alerts
  const [alerts] = useState([
    { id: 1, title: 'Disruption detected in your area', message: 'Insurance claim approved', amount: 150 }
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
