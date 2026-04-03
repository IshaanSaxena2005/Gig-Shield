import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

/**
 * ProtectedRoute
 * Wraps any route that requires authentication.
 * If no user token found in localStorage → redirect to /login
 * Saves the attempted URL so we can redirect back after login
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const user = localStorage.getItem('user')

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  try {
    const parsed = JSON.parse(user)
    if (!parsed?.token) {
      return <Navigate to="/login" state={{ from: location }} replace />
    }
  } catch {
    localStorage.removeItem('user')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute