import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../styles/dashboard.css'

const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => location.pathname === path ? 'active' : ''

  // Get logged in user name from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

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
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar