import api from './api'

/**
 * User Service
 * Handles user-specific data and dashboard information
 */

// Get user dashboard data
export const getDashboardData = async () => {
  try {
    const response = await api.get('/user/dashboard')
    return response.data
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw error
  }
}