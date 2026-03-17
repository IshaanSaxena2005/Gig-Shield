const Policy = require('../models/Policy')
const Claim = require('../models/Claim')
const RiskZone = require('../models/RiskZone')
const { getWeatherData } = require('../services/weatherService')

exports.getDashboardData = async (req, res) => {
  try {
    // Get user's active policy
    const policy = await Policy.findOne({
      where: {
        userId: req.user.id,
        status: 'active'
      }
    })

    // Get user's claims
    const claims = await Claim.findAll({
      where: { userId: req.user.id },
      order: [['submittedAt', 'DESC']],
      limit: 10
    })

    // Get risk zone data
    const riskZone = await RiskZone.findOne({
      where: { location: req.user.location }
    })

    // Get current weather
    const weatherData = await getWeatherData(req.user.location)

    // Calculate earnings protected (simplified)
    const earningsProtected = policy ? Math.min(policy.coverage * 0.5, 300) : 0

    res.json({
      policy: policy ? {
        id: policy.id,
        type: policy.type,
        premium: policy.premium,
        coverage: policy.coverage,
        status: policy.status
      } : null,
      claims: claims.map(claim => ({
        id: claim.id,
        date: claim.submittedAt.toDateString(),
        disruption: claim.description,
        amount: claim.amount,
        status: claim.status
      })),
      riskLevel: riskZone ? riskZone.riskLevel : 'medium',
      earningsProtected,
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