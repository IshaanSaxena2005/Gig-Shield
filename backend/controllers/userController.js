const Policy = require('../models/Policy')
const Claim = require('../models/Claim')
const RiskZone = require('../models/RiskZone')
const User = require('../models/User')
const { getWeatherData } = require('../services/weatherService')
const { evaluateDisruptionSignals } = require('../services/disruptionSignals')

const getTriggerPayout = (coverage, payoutPercentile) => {
  const amount = Number(coverage || 0) * (Number(payoutPercentile || 0) / 100)
  return Math.round(amount * 100) / 100
}

exports.getDashboardData = async (req, res) => {
  try {
    const policy = await Policy.findOne({
      where: { userId: req.user.id, status: 'active' }
    })

    const claims = await Claim.findAll({
      where: { userId: req.user.id },
      order: [['submittedAt', 'DESC']],
      limit: 10
    })

    const userLocation = req.user.location || policy?.location
    const riskZone = await RiskZone.findOne({
      where: { location: userLocation }
    })

    const weatherData = userLocation ? await getWeatherData(userLocation) : null
    const earningsProtected = policy ? Math.min(policy.coverage * 0.5, 300) : 0
    const activeTriggers = evaluateDisruptionSignals({
      location: userLocation,
      riskZone,
      weatherData
    })

    res.json({
      user: {
        name: req.user.name,
        email: req.user.email,
        occupation: req.user.occupation,
        location: userLocation,
        averageDailyIncome: req.user.averageDailyIncome
      },
      policy: policy ? {
        id: policy.id,
        type: policy.type,
        premium: policy.premium,
        coverage: policy.coverage,
        status: policy.status,
        location: policy.location,
        occupation: policy.occupation,
        riskLevel: policy.riskLevel,
        recommendedCoverageHours: policy.recommendedCoverageHours,
        eligibleTriggers: policy.eligibleTriggers
      } : null,
      claims: claims.map(claim => ({
        id: claim.id,
        date: claim.submittedAt,
        disruption: claim.description,
        amount: claim.amount,
        status: claim.status
      })),
      riskLevel: riskZone ? riskZone.riskLevel : 'medium',
      earningsProtected,
      activeTriggers: activeTriggers.map((trigger) => ({
        type: trigger.type,
        title: trigger.title,
        severity: trigger.severity,
        autoApprove: trigger.autoApprove,
        description: trigger.description,
        source: trigger.source,
        payoutAmount: policy ? getTriggerPayout(policy.coverage, trigger.payoutPercentile) : 0
      })),
      automationSummary: {
        zeroTouchClaims: claims.filter((claim) => claim.source === 'automated' && claim.status === 'approved').length,
        flaggedClaims: claims.filter((claim) => claim.status === 'flagged').length
      },
      weather: weatherData ? {
        condition: weatherData.weather[0].main,
        temperature: Math.round(weatherData.main.temp),
        humidity: weatherData.main.humidity
      } : null
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// UPDATE profile — location and occupation
exports.updateProfile = async (req, res) => {
  try {
    const { location, occupation } = req.body

    if (!location && !occupation) {
      return res.status(400).json({ message: 'Provide at least location or occupation to update' })
    }

    const updateData = {}
    if (location)   updateData.location   = location
    if (occupation) updateData.occupation = occupation

    await User.update(updateData, { where: { id: req.user.id } })

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    })

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
