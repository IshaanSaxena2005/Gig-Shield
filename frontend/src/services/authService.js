import api from './api'

/**
 * Authentication Service
 * Handles user login, registration and logout
 */

// Login user
export const loginUser = async (email, password) => {
  try {
    // Mock API call - replace with actual endpoint
    // const response = await api.post('/auth/login', { email, password })
    
    // Simulated response for prototype
    const mockResponse = {
      data: {
        user: { email, name: 'Rajesh Kumar' },
        token: 'mock-jwt-token-12345'
      }
    }
    
    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(mockResponse.data))
    
    return mockResponse.data
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

// Register new user
export const registerUser = async (userData) => {
  try {
    // Mock API call - replace with actual endpoint
    // const response = await api.post('/auth/register', userData)
    
    // Simulated response for prototype
    const mockResponse = {
      data: {
        message: 'Registration successful',
        user: userData
      }
    }
    
    return mockResponse.data
  } catch (error) {
    console.error('Registration error:', error)
    throw error
  }
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
