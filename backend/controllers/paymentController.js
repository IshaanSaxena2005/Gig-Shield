const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Policy = require('../models/Policy')

exports.processPayment = async (req, res) => {
  try {
    const { policyId, currency = 'usd' } = req.body

    // FIX: never trust amount from client — always fetch from DB
    if (!policyId) {
      return res.status(400).json({ message: 'policyId is required' })
    }

    const policy = await Policy.findByPk(policyId)
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' })
    }

    // Make sure this policy belongs to the logged-in user
    if (policy.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // Use the server-side premium value, not a client-provided amount
    const amount = policy.premium

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      payment_method_types: ['card'],
      metadata: {
        policyId: policy.id,
        userId: req.user.id
      }
    })

    res.json({
      clientSecret: paymentIntent.client_secret
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}