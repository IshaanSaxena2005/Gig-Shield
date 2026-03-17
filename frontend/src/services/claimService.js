import api from './api'

/**
 * Claims Service
 * Handles fetching and managing insurance claims
 */

// Get all claims for current user
export const getClaims = async () => {
  try {
    // Mock API call - replace with actual endpoint
    // const response = await api.get('/claims')
    
    // Simulated response for prototype
    const mockResponse = {
      data: [
        { id: 1, date: 'Mar 10', disruption: 'Heavy Rain', amount: 150, status: 'Paid' },
        { id: 2, date: 'Mar 12', disruption: 'Flood', amount: 200, status: 'Paid' }
      ]
    }
    
    return mockResponse.data
  } catch (error) {
    console.error('Error fetching claims:', error)
    throw error
  }
}

// Submit new claim
export const submitClaim = async (claimData) => {
  try {
    // Mock API call - replace with actual endpoint
    // const response = await api.post('/claims', claimData)
    
    const mockResponse = {
      data: {
        message: 'Claim submitted successfully',
        claimId: Date.now()
      }
    }
    
    return mockResponse.data
  } catch (error) {
    console.error('Error submitting claim:', error)
    throw error
  }
}

// Get claim by ID
export const getClaimById = async (claimId) => {
  try {
    // Mock API call - replace with actual endpoint
    // const response = await api.get(`/claims/${claimId}`)
    
    const mockResponse = {
      data: {
        id: claimId,
        date: 'Mar 10',
        disruption: 'Heavy Rain',
        amount: 150,
        status: 'Paid'
      }
    }
    
    return mockResponse.data
  } catch (error) {
    console.error('Error fetching claim:', error)
    throw error
  }
}
