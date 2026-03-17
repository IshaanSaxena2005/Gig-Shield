import api from './api'

/**
 * Admin Service
 * Handles admin-specific operations and data
 */

// Get admin dashboard statistics
export const getDashboardStats = async () => {
  try {
    const response = await api.get('/admin/dashboard')
    return response.data
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw error
  }
}

// Get risk zones
export const getRiskZones = async () => {
  try {
    const response = await api.get('/admin/risk-zones')
    return response.data
  } catch (error) {
    console.error('Error fetching risk zones:', error)
    throw error
  }
}

// Update risk zone
export const updateRiskZone = async (riskZoneData) => {
  try {
    const response = await api.put('/admin/risk-zones', riskZoneData)
    return response.data
  } catch (error) {
    console.error('Error updating risk zone:', error)
    throw error
  }
}

// Get fraud alerts
export const getFraudAlerts = async () => {
  try {
    const response = await api.get('/admin/fraud-alerts')
    return response.data
  } catch (error) {
    console.error('Error fetching fraud alerts:', error)
    throw error
  }
}

// Get all claims (admin)
export const getAllClaims = async () => {
  try {
    const response = await api.get('/claims/all')
    return response.data
  } catch (error) {
    console.error('Error fetching all claims:', error)
    throw error
  }
}

// Update claim status (admin)
export const updateClaimStatus = async (claimId, status) => {
  try {
    const response = await api.put(`/claims/${claimId}`, { status })
    return response.data
  } catch (error) {
    console.error('Error updating claim status:', error)
    throw error
  }
}