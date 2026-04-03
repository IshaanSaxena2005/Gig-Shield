// Automated claim triggering based on weather conditions
const Policy = require('../models/Policy')
const Claim = require('../models/Claim')
const { getWeatherData } = require('./weatherService')
const RiskZone = require('../models/RiskZone')
const { evaluateDisruptionSignals } = require('./disruptionSignals')
const { Op } = require('sequelize')

const getPayoutAmount = (coverage, signal) => {
  const normalizedCoverage = Number(coverage || 0)
  const payout = normalizedCoverage * (signal.payoutPercentile / 100)
  return Math.round(payout * 100) / 100
}

const checkWeatherTriggers = async (policy, weatherData, riskZone) => {
  const triggeredClaims = []
  const signals = evaluateDisruptionSignals({
    location: policy.location || policy.user?.location,
    riskZone,
    weatherData
  })

  for (const signal of signals) {
    const existingClaim = await Claim.findOne({
      where: {
        userId: policy.userId,
        policyId: policy.id,
        triggerType: signal.type,
        submittedAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    if (!existingClaim) {
      triggeredClaims.push({
        policyId: policy.id,
        userId: policy.userId,
        amount: getPayoutAmount(policy.coverage, signal),
        reason: signal.description,
        status: signal.autoApprove ? 'approved' : 'flagged',
        triggerType: signal.type,
        notes: signal.autoApprove
          ? `Zero-touch payout processed via ${signal.source} at ${signal.payoutPercentile}th percentile`
          : `Soft review queued from ${signal.source} at ${signal.payoutPercentile}th percentile`
      })
    }
  }

  return triggeredClaims
}

const processAutomaticClaims = async () => {
  try {
    // Get all active policies with user data
    const policies = await Policy.findAll({
      where: { status: 'active' },
      include: [{ model: require('../models/User'), as: 'user' }]
    })

    for (const policy of policies) {
      const location = policy.location || policy.user?.location
      if (location) {
        const [weatherData, riskZone] = await Promise.all([
          getWeatherData(location),
          RiskZone.findOne({ where: { location } })
        ])

        if (weatherData) {
          const triggeredClaims = await checkWeatherTriggers(policy, weatherData, riskZone)

          for (const triggeredClaim of triggeredClaims) {
            await Claim.create({
              userId: triggeredClaim.userId,
              policyId: triggeredClaim.policyId,
              amount: triggeredClaim.amount,
              description: triggeredClaim.reason,
              status: triggeredClaim.status,
              source: 'automated',
              triggerType: triggeredClaim.triggerType,
              notes: triggeredClaim.notes
            })

            console.log(`Automatic claim created for user ${triggeredClaim.userId}: ${triggeredClaim.triggerType}`)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing automatic claims:', error)
  }
}

module.exports = { checkWeatherTriggers, processAutomaticClaims }
