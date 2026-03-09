const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

exports.processPayment = async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency,
      payment_method_types: ['card']
    })

    res.json({
      clientSecret: paymentIntent.client_secret
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}