// Automated claim triggering based on weather conditions
const Policy = require('../models/Policy')
const Claim = require('../models/Claim')
const { getWeatherData } = require('./weatherService')

const checkWeatherTriggers = async (policies, weatherData) => {
  const triggeredClaims = []

  for (const policy of policies) {
    if (weatherData.weather[0].main.toLowerCase() === 'rain' &&
        weatherData.rain && weatherData.rain['1h'] > 10) {
      // Heavy rain trigger
      const existingClaim = await Claim.findOne({
        user: policy.user,
        description: { $regex: 'Heavy rain', $options: 'i' },
        submittedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      })

      if (!existingClaim) {
        triggeredClaims.push({
          policyId: policy._id,
          userId: policy.user,
          amount: Math.min(policy.coverage * 0.1, 200), // 10% of coverage, max 200
          reason: 'Heavy rain damage - Automatic claim'
        })
      }
    }

    if (weatherData.weather[0].main.toLowerCase() === 'thunderstorm') {
      // Thunderstorm trigger
      const existingClaim = await Claim.findOne({
        user: policy.user,
        description: { $regex: 'Thunderstorm', $options: 'i' },
        submittedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })

      if (!existingClaim) {
        triggeredClaims.push({
          policyId: policy._id,
          userId: policy.user,
          amount: Math.min(policy.coverage * 0.15, 300), // 15% of coverage, max 300
          reason: 'Thunderstorm damage - Automatic claim'
        })
      }
    }
  }

  return triggeredClaims
}

const processAutomaticClaims = async () => {
  try {
    // Get all active policies
    const policies = await Policy.find({ status: 'active' }).populate('user')

    for (const policy of policies) {
      if (policy.user.location) {
        const weatherData = await getWeatherData(policy.user.location)

        if (weatherData) {
          const triggeredClaims = await checkWeatherTriggers([policy], weatherData)

          for (const triggeredClaim of triggeredClaims) {
            await Claim.create({
              user: triggeredClaim.userId,
              policy: triggeredClaim.policyId,
              amount: triggeredClaim.amount,
              description: triggeredClaim.reason,
              status: 'approved' // Auto-approved for weather triggers
            })

            console.log(`Automatic claim created for user ${triggeredClaim.userId}: ${triggeredClaim.reason}`)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing automatic claims:', error)
  }
}

module.exports = { checkWeatherTriggers, processAutomaticClaims }