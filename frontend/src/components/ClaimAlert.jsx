import React from 'react'
import '../styles/dashboard.css'

/**
 * ClaimAlert Component
 * Shows notification when a claim is processed and approved
 */
const ClaimAlert = ({ title, message, amount }) => {
  return (
    <div className="claim-alert">
      <div className="alert-icon">✓</div>
      <div className="alert-content">
        <h4 className="alert-title">{title}</h4>
        <p className="alert-message">{message}</p>
        {amount && <p className="alert-amount">₹{amount} credited to your account</p>}
      </div>
    </div>
  )
}

export default ClaimAlert
