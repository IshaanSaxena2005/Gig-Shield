import api from './api'

/**
 * Authentication Service
 * Handles user login, registration and logout
 */

// Login user
export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

// Register new user
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData)
    return response.data
  } catch (error) {
    console.error('Registration error:', error)
    throw error
  }
}

// Get user profile
export const getUserProfile = async () => {
  try {
    const response = await api.get('/auth/profile')
    return response.data
  } catch (error) {
    console.error('Profile fetch error:', error)
    throw error
  }
}

// Logout user
export const logoutUser = () => {
  localStorage.removeItem('user')
}

// Logout user
export const logoutUser = () => {
  localStorage.removeItem('user')
  console.log('User logged out successfully')
}

// Get current user
export const getCurrentUser = () => {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

// Check if user is authenticated
export const isAuthenticated = () => {
  return getCurrentUser() !== null
}
