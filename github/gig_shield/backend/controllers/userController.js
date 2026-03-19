const Policy = require('../models/Policy')
const Claim = require('../models/Claim')
const RiskZone = require('../models/RiskZone')
const User = require('../models/User')
const { getWeatherData } = require('../services/weatherService')

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

    const riskZone = await RiskZone.findOne({
      where: { location: req.user.location }
    })

    const weatherData = await getWeatherData(req.user.location)
    const earningsProtected = policy ? Math.min(policy.coverage * 0.5, 300) : 0

    res.json({
      user: {
        name: req.user.name,
        email: req.user.email,
        occupation: req.user.occupation,
        location: req.user.location
      },
      policy: policy ? {
        id: policy.id,
        type: policy.type,
        premium: policy.premium,
        coverage: policy.coverage,
        status: policy.status
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