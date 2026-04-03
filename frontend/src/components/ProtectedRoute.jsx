import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

/**
 * ProtectedRoute
 * Wraps any route that requires authentication.
 * If no user token found in localStorage → redirect to /login
 * Saves the attempted URL so we can redirect back after login
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation()
  const user = localStorage.getItem('user')
  let parsedUser = null

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  try {
    parsedUser = JSON.parse(user)
    if (!parsedUser?.token) {
      return <Navigate to="/login" state={{ from: location }} replace />
    }
  } catch {
    localStorage.removeItem('user')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles?.length && !allowedRoles.includes(parsedUser?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
