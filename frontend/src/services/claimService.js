import api from './api'

/**
 * Claims Service
 * Handles fetching and managing insurance claims
 */

// Get all claims for current user
export const getClaims = async () => {
  try {
    const response = await api.get('/claims')
    return response.data
  } catch (error) {
    console.error('Error fetching claims:', error)
    throw error
  }
}

// Submit new claim
export const submitClaim = async (claimData) => {
  try {
    const response = await api.post('/claims', claimData)
    return response.data
  } catch (error) {
    console.error('Error submitting claim:', error)
    throw error
  }
}

// Get claim by ID
export const getClaimById = async (claimId) => {
  try {
    const response = await api.get(`/claims/${claimId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching claim:', error)
    throw error
  }
}
