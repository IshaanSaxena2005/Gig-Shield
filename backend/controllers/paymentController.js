/**
 * paymentController.js
 * --------------------
 * Handles premium collection for GigShield weekly policies.
 *
 * Payment flow for India:
 *  - Real implementation: Razorpay UPI / PhonePe / Paytm
 *  - Demo/sandbox: returns a mock UPI payment intent for hackathon presentation
 *  - Stripe kept for card payments (international), but INR fixed
 *
 * NOTE: Stripe does support INR but UPI is the dominant payment method
 * for gig workers in India. Razorpay is the production recommendation.
 */

const Policy         = require('../models/Policy')
const Claim          = require('../models/Claim')
const reserveService = require('../services/reserveService')

// ── Mock UPI payment (primary — for demo and gig workers) ────────────────────
exports.initiateUpiPayment = async (req, res) => {
  try {
    const { policyId } = req.body

    if (!policyId) {
      return res.status(400).json({ message: 'policyId is required' })
    }

    const policy = await Policy.findByPk(policyId)
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' })
    }

    if (policy.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // FIX: amount in INR (Razorpay uses paise — multiply by 100 in production)
    const amountINR = parseFloat(policy.premium)

    // Simulate UPI intent (replace with Razorpay SDK in production)
    const mockUpiIntent = {
      paymentId:     `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      upiDeeplink:   `upi://pay?pa=gigshield@upi&pn=GigShield&am=${amountINR}&cu=INR&tn=Weekly+Policy+Premium`,
      qrCode:        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=gigshield@upi&am=${amountINR}`,
      amount:        amountINR,
      currency:      'INR',
      description:   `GigShield ${policy.type} Plan — Weekly Premium`,
      policyId:      policy.id,
      expiresAt:     new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
      status:        'pending'
    }

    res.json(mockUpiIntent)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── Stripe card payment (secondary — INR fixed) ───────────────────────────────
exports.processPayment = async (req, res) => {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey || stripeKey.includes('your-')) {
      // Graceful demo fallback when Stripe not configured
      return res.json({
        clientSecret: 'demo_secret_not_configured',
        message: 'Stripe not configured — use UPI flow for demo',
        demo: true
      })
    }

    const stripe = require('stripe')(stripeKey)
    const { policyId } = req.body

    if (!policyId) {
      return res.status(400).json({ message: 'policyId is required' })
    }

    const policy = await Policy.findByPk(policyId)
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' })
    }

    if (policy.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(parseFloat(policy.premium) * 100), // paise (INR subunit)
      currency: 'inr',  // FIX: was 'usd'
      payment_method_types: ['card'],
      metadata: {
        policyId:  policy.id,
        userId:    req.user.id,
        planType:  policy.type
      }
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── Mock payout disbursement (called after auto-claim approval) ──────────────
exports.disbursePayout = async (req, res) => {
  try {
    const { claimId, upiId, amount } = req.body

    if (!claimId || !upiId || !amount) {
      return res.status(400).json({ message: 'claimId, upiId and amount are required' })
    }

    const payoutAmount = parseFloat(amount)

    // ── Solvency gate ─────────────────────────────────────────────────────
    // Refuse payout if reserves can't cover it. On failure, flip the claim
    // into a terminal status the admin dashboard can surface, and fan out
    // a critical alert.
    try {
      await reserveService.checkBeforePayout(payoutAmount)
    } catch (reserveErr) {
      if (reserveErr.code === 'INSUFFICIENT_RESERVES') {
        const claim = await Claim.findByPk(claimId)
        if (claim) {
          await claim.update({
            status:        'halted_insufficient_reserves',
            payout_status: 'failed',
            payoutUpdatedAt: new Date(),
            notes:         `${claim.notes || ''}\n[${new Date().toISOString()}] Payout blocked: ${reserveErr.message}`.trim()
          })
        }
        await reserveService.alertReserveCritical(await reserveService.getSolvencySnapshot())
        console.error(`[paymentController] Payout BLOCKED claimId=${claimId} amount=₹${payoutAmount} reason=${reserveErr.message}`)
        return res.status(503).json({
          message:      'Payout temporarily halted — insufficient reserves. Admin notified.',
          code:         'INSUFFICIENT_RESERVES',
          currentRatio: reserveErr.currentRatio,
          claimStatus:  'halted_insufficient_reserves'
        })
      }
      throw reserveErr
    }

    // Reserves OK — allocate liquidity to this claim BEFORE disbursing
    await reserveService.allocateToClaim(claimId, payoutAmount)

    // In production: call Razorpay Payout API or IMPS transfer
    const mockPayout = {
      payoutId:       `PAYOUT-${Date.now()}`,
      claimId,
      recipientUpi:   upiId,
      amountINR:      payoutAmount,
      status:         'processing',
      estimatedTime:  '2–4 hours',
      initiatedAt:    new Date().toISOString(),
      message:        `₹${amount} income-loss payout initiated to ${upiId}`
    }

    // Release the claims_pending reserve once the mock disbursement "succeeds".
    // In production, move this into the payout-webhook handler that fires on
    // Razorpay payout completion.
    try {
      await reserveService.releaseClaimReserve(claimId)
    } catch (err) {
      console.error(`[paymentController] Reserve release failed for claimId=${claimId}:`, err.message)
    }

    console.log(`[paymentController] Payout initiated: claimId=${claimId} upi=${upiId} amount=₹${amount}`)
    res.json(mockPayout)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
