import api from './api'

/**
 * Payment Service
 * Handles premium payments and transaction history
 */

// Initiate a UPI payment for a policy premium
export const initiateUpiPayment = async (policyId) => {
  const response = await api.post('/payments/upi', { policyId })
  return response.data
}

// Initiate a Stripe card payment (fallback)
export const initiateCardPayment = async (policyId) => {
  const response = await api.post('/payments/stripe', { policyId })
  return response.data
}

// Confirm a mock payment (demo mode)
export const confirmPayment = async (paymentId, policyId) => {
  const response = await api.post('/payments/confirm', { paymentId, policyId })
  return response.data
}

// Get payment/transaction history
export const getPaymentHistory = async () => {
  const response = await api.get('/payments/history')
  return response.data
}

// Legacy export for backward compatibility
export const payPolicyPremium = initiateUpiPayment
