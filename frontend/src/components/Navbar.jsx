import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import '../styles/dashboard.css'

const Navbar = () => {
  const location = useLocation()

  const isActive = (path) => location.pathname === path ? 'active' : ''

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>GigShield AI</h1>
      </div>
      <ul className="navbar-links">
        <li>
          <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
        </li>
        <li>
          <Link to="/policy" className={isActive('/policy')}>Policy</Link>
        </li>
        <li>
          <Link to="/admin" className={isActive('/admin')}>Admin</Link>
        </li>
        <li>
          <button className="logout-btn" onClick={() => alert('Logged out successfully!')}>
            Logout
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar
