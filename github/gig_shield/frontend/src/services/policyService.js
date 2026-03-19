import api from './api'

// Get all policies for current user
export const getPolicies = async () => {
  try {
    const response = await api.get('/policies')
    return response.data
  } catch (error) {
    console.error('Error fetching policies:', error)
    throw error
  }
}

// Create new policy
export const createPolicy = async (policyData) => {
  try {
    const response = await api.post('/policies', policyData)
    return response.data
  } catch (error) {
    console.error('Error creating policy:', error)
    throw error
  }
}

// Get policy by ID
export const getPolicyById = async (policyId) => {
  try {
    const response = await api.get(`/policies/${policyId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching policy:', error)
    throw error
  }
}

// Update policy status (activate, pause, cancel)
export const updatePolicyStatus = async (policyId, status) => {
  try {
    const response = await api.patch(`/policies/${policyId}/status`, { status })
    return response.data
  } catch (error) {
    console.error('Error updating policy status:', error)
    throw error
  }
}