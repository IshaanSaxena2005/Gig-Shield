/**
 * policyRenewalService.js
 * -----------------------
 * Handles weekly policy auto-renewal.
 * Runs every 6 hours. Finds policies expiring within 24 hours and
 * either renews them (extends end date by 7 days) or marks them expired.
 *
 * In production: deduct premium from linked UPI/wallet before renewing.
 * In demo/sandbox: auto-renew without payment check.
 */

const Policy = require('../models/Policy')
const User   = require('../models/User')
const { Op } = require('sequelize')

const renewExpiringPolicies = async () => {
  console.log('[policyRenewal] Running weekly renewal check...')
  try {
    const now        = new Date()
    const in24Hours  = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Find active policies expiring in the next 24 hours
    const expiringPolicies = await Policy.findAll({
      where: {
        status:  'active',
        endDate: { [Op.lte]: in24Hours, [Op.gte]: now }
      },
      include: [{ model: User, as: 'user' }]
    })

    let renewed = 0
    let expired  = 0

    for (const policy of expiringPolicies) {
      // In production: check payment here. In demo: always renew.
      const paymentSucceeded = true // TODO: integrate Razorpay auto-debit

      if (paymentSucceeded) {
        const newEndDate = new Date(policy.endDate)
        newEndDate.setDate(newEndDate.getDate() + 7)

        await policy.update({ endDate: newEndDate })
        console.log(
          `[policyRenewal] Renewed: policyId=${policy.id} user=${policy.user?.name} ` +
          `newExpiry=${newEndDate.toDateString()}`
        )
        renewed++
      } else {
        await policy.update({ status: 'expired' })
        console.log(`[policyRenewal] Expired: policyId=${policy.id} — payment failed`)
        expired++
      }
    }

    // Also hard-expire any policies past their end date that are still 'active'
    const pastDue = await Policy.findAll({
      where: { status: 'active', endDate: { [Op.lt]: now } }
    })
    for (const policy of pastDue) {
      await policy.update({ status: 'expired' })
      expired++
    }

    console.log(`[policyRenewal] Done. Renewed: ${renewed}, Expired: ${expired}`)
  } catch (error) {
    console.error('[policyRenewal] Error:', error)
  }
}

module.exports = { renewExpiringPolicies }
