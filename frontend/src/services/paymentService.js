import api from './api'

export const payPolicyPremium = async (policyId) => {
  try {
    const response = await api.post('/payments/create-payment-intent', { policyId, currency: 'inr' })
    return response.data
  } catch (error) {
    console.error('Error processing payment:', error)
    throw error
  }
}
