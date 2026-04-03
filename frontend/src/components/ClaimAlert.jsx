import React from 'react'
import '../styles/dashboard.css'

const ClaimAlert = ({ title, message, amount }) => {
  const amountLabel = typeof amount === 'number'
    ? `Rs${amount} credited to your account`
    : amount

  return (
    <div className="claim-alert">
      <div className="alert-icon">OK</div>
      <div className="alert-content">
        <h4 className="alert-title">{title}</h4>
        <p className="alert-message">{message}</p>
        {amount && <p className="alert-amount">{amountLabel}</p>}
      </div>
    </div>
  )
}

export default ClaimAlert
