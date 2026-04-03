const Policy   = require('../models/Policy')
const Claim    = require('../models/Claim')
const RiskZone = require('../models/RiskZone')
const User     = require('../models/User')
const { getWeatherData } = require('../services/weatherService')
const { getAQIData }     = require('../services/aqiService')
const { calculatePayout, PLAN_COVERAGE } = require('../utils/premiumCalculator')

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
    const aqiValue    = await getAQIData(req.user.location)

    // FIX: earnings protected = payout worker would get if full day lost today
    const avgDailyEarnings = parseFloat(req.user.avgDailyEarnings) || 700
    const workHoursPerDay  = parseFloat(req.user.workHoursPerDay)  || 6
    const coverageCap      = policy ? parseFloat(policy.coverage) : PLAN_COVERAGE.Standard

    const earningsProtected = policy
      ? calculatePayout({ avgDailyEarnings, workHoursPerDay, hoursLost: workHoursPerDay, coverageCap })
      : 0

    res.json({
      user: {
        name:             req.user.name,
        email:            req.user.email,
        occupation:       req.user.occupation,
        platform:         req.user.platform,
        platformId:       req.user.platformId,
        location:         req.user.location,
        deliveryZone:     req.user.deliveryZone,
        avgDailyEarnings: req.user.avgDailyEarnings,
        workHoursPerDay:  req.user.workHoursPerDay
      },
      policy: policy ? {
        id:       policy.id,
        type:     policy.type,
        premium:  policy.premium,
        coverage: policy.coverage,
        status:   policy.status,
        endDate:  policy.endDate
      } : null,
      claims: claims.map(claim => ({
        id:           claim.id,
        submittedAt:  claim.submittedAt,
        description:  claim.description,
        triggerType:  claim.triggerType,
        triggerValue: claim.triggerValue,
        amount:       claim.amount,
        status:       claim.status
      })),
      riskLevel:        riskZone ? riskZone.riskLevel : 'medium',
      earningsProtected,
      weather: weatherData ? {
        condition:   weatherData.weather[0].main,
        temperature: Math.round(weatherData.main.temp),
        humidity:    weatherData.main.humidity,
        aqi:         aqiValue   // FIX: include AQI in weather response
      } : null
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// UPDATE profile — FIX: now accepts avgDailyEarnings + deliveryZone
exports.updateProfile = async (req, res) => {
  try {
    const { location, occupation, avgDailyEarnings, deliveryZone, platformId } = req.body

    if (!location && !occupation) {
      return res.status(400).json({ message: 'Provide at least location or occupation to update' })
    }

    const updateData = {}
    if (location)         updateData.location         = location
    if (occupation)       updateData.occupation       = occupation
    if (platformId)       updateData.platformId       = platformId
    if (deliveryZone)     updateData.deliveryZone     = deliveryZone
    if (avgDailyEarnings) {
      const val = parseFloat(avgDailyEarnings)
      if (isNaN(val) || val <= 0) {
        return res.status(400).json({ message: 'avgDailyEarnings must be a positive number' })
      }
      updateData.avgDailyEarnings = val
    }

    await User.update(updateData, { where: { id: req.user.id } })

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] }
    })

    res.json({ message: 'Profile updated successfully', user: updatedUser })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
