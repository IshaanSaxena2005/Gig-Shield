import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import '../styles/dashboard.css'

/**
 * Policy Page Component
 * Displays policy details and allows workers to manage their insurance coverage
 */
const PolicyPage = () => {
  const [policyData] = useState({
    weeklyPremium: 15,
    coverageAmount: 800,
    coverageHours: '24/7',
    riskLevel: 'Medium',
    status: 'Active'
  })

  const handleActivate = () => {
    alert('Policy activated successfully!')
  }

  const handlePause = () => {
    alert('Policy paused. You will not be covered until reactivated.')
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this policy?')) {
      alert('Policy cancelled successfully.')
    }
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      
      <div className="dashboard-content">
        <h2 className="page-title">Policy Details</h2>
        
        <section className="dashboard-section">
          <div className="policy-card">
            <h3>Your Insurance Policy</h3>
            
            <div className="policy-details">
              <div className="policy-row">
                <span className="policy-label">Weekly Premium:</span>
                <span className="policy-value">₹{policyData.weeklyPremium}</span>
              </div>
              
              <div className="policy-row">
                <span className="policy-label">Coverage Amount:</span>
                <span className="policy-value">₹{policyData.coverageAmount}</span>
              </div>
              
              <div className="policy-row">
                <span className="policy-label">Coverage Hours:</span>
                <span className="policy-value">{policyData.coverageHours}</span>
              </div>
              
              <div className="policy-row">
                <span className="policy-label">Risk Level:</span>
                <span className={`risk-badge ${policyData.riskLevel.toLowerCase()}`}>
                  {policyData.riskLevel}
                </span>
              </div>
              
              <div className="policy-row">
                <span className="policy-label">Policy Status:</span>
                <span className={`status-badge ${policyData.status.toLowerCase()}`}>
                  {policyData.status}
                </span>
              </div>
            </div>
            
            <div className="policy-actions">
              <button className="action-btn activate" onClick={handleActivate}>
                Activate Policy
              </button>
              <button className="action-btn pause" onClick={handlePause}>
                Pause Policy
              </button>
              <button className="action-btn cancel" onClick={handleCancel}>
                Cancel Policy
              </button>
            </div>
          </div>
        </section>
        
        <section className="dashboard-section">
          <div className="info-card">
            <h3>What's Covered?</h3>
            <ul className="coverage-list">
              <li>✓ Loss of income due to heavy rain</li>
              <li>✓ Loss of income due to extreme heat</li>
              <li>✓ Loss of income due to floods</li>
              <li>✓ Loss of income due to pollution</li>
              <li>✓ Loss of income due to curfews</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PolicyPage
