import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/dashboard.css'

const NotFound = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: '#f8fafc' }}>
    <div style={{ fontSize: 64 }}>🌧️</div>
    <h1 style={{ fontSize: 28, fontWeight: 700 }}>404 — Page Not Found</h1>
    <p style={{ color: '#666', fontSize: 15 }}>The page you're looking for doesn't exist.</p>
    <Link to="/dashboard">
      <button className="submit-btn" style={{ width: 'auto', marginTop: '1rem' }}>
        Back to Dashboard
      </button>
    </Link>
  </div>
)

export default NotFound
