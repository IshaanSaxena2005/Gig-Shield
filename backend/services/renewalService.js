/**
 * renewalService.js
 * -----------------
 * Checks for policies expiring within the next 24 hours and renews them
 * by creating a new 7-day policy period. Runs every 6 hours via server.js.
 *
 * In production: trigger a payment charge before renewing.
 * For demo/sandbox: renew automatically and log the event.
 */

const Policy = require('../models/Policy')
const User   = require('../models/User')
const { Op } = require('sequelize')

const renewExpiringPolicies = async () => {
  console.log('[renewalService] Checking for expiring policies...')
  try {
    const now       = new Date()
    const in24h     = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Find active policies expiring in the next 24 hours
    const expiring = await Policy.findAll({
      where: {
        status:  'active',
        endDate: { [Op.between]: [now, in24h] }
      },
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'location'] }]
    })

    let renewed = 0
    for (const policy of expiring) {
      // Extend endDate by 7 days from current endDate (not from now)
      const newEndDate = new Date(policy.endDate)
      newEndDate.setDate(newEndDate.getDate() + 7)

      await policy.update({ endDate: newEndDate })

      console.log(
        `[renewalService] Renewed policy #${policy.id} for user ${policy.user?.name || policy.userId}` +
        ` → new expiry: ${newEndDate.toDateString()}`
      )
      renewed++
    }

    // Also expire any policies past their end date that weren't renewed
    await Policy.update(
      { status: 'expired' },
      { where: { status: 'active', endDate: { [Op.lt]: now } } }
    )

    console.log(`[renewalService] Done. ${renewed} policies renewed.`)
  } catch (error) {
    console.error('[renewalService] Error:', error.message)
  }
}

module.exports = { renewExpiringPolicies }
