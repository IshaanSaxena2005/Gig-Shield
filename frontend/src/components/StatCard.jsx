import React from 'react'
import '../styles/dashboard.css'

/**
 * StatCard Component
 * Reusable card for displaying statistics in admin dashboard
 */
const StatCard = ({ title, value, icon }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h4 className="stat-title">{title}</h4>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  )
}

export default StatCard
