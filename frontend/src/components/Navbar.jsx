import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../styles/dashboard.css'

// FIX: safe parse — never crash on corrupted localStorage
const getSavedUser = () => {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed?.token ? parsed : {}
  } catch {
    localStorage.removeItem('user')
    return {}
  }
}

const Navbar = () => {
  const location = useLocation()
  const navigate  = useNavigate()
  const user      = getSavedUser()

  const isActive = (path) => location.pathname === path ? 'active' : ''

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1>GigShield AI</h1>
        </Link>
      </div>
      <ul className="navbar-links">
        <li>
          <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
        </li>
        <li>
          <Link to="/policy" className={isActive('/policy')}>Policy</Link>
        </li>
        <li>
          <Link to="/location-sync" className={isActive('/location-sync')}>Map</Link>
        </li>
        <li>
          <Link to="/claims/submit" className={isActive('/claims/submit')}>Submit Claim</Link>
        </li>
        {user?.role === 'admin' && (
          <li>
            <Link to="/admin" className={isActive('/admin')}>Admin</Link>
          </li>
        )}
        <li>
          <Link to="/profile" className={isActive('/profile')}>
            👤 {user?.name || 'Account'}
          </Link>
        </li>
        <li>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar
