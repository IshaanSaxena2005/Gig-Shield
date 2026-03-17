import React from 'react'
import '../styles/dashboard.css'

/**
 * WorkerCard Component
 * Displays worker insurance summary information in a card format
 */
const WorkerCard = ({ 
  name, 
  platform, 
  location, 
  weeklyPremium, 
  coverageLimit, 
  status 
}) => {
  return (
    <div className="worker-card">
      <div className="worker-card-header">
        <h3>{name}</h3>
        <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
      </div>
      
      <div className="worker-card-body">
        <div className="info-row">
          <span className="label">Platform:</span>
          <span className="value">{platform}</span>
        </div>
        <div className="info-row">
          <span className="label">Location:</span>
          <span className="value">{location}</span>
        </div>
        <div className="info-row">
          <span className="label">Weekly Premium:</span>
          <span className="value">₹{weeklyPremium}</span>
        </div>
        <div className="info-row">
          <span className="label">Coverage Limit:</span>
          <span className="value">₹{coverageLimit}</span>
        </div>
      </div>
    </div>
  )
}

export default WorkerCard
