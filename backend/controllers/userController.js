const { Op } = require('sequelize')
const Policy = require('../models/Policy')
const Claim = require('../models/Claim')
const RiskZone = require('../models/RiskZone')
const User = require('../models/User')
const UserBalance = require('../models/UserBalance')
const { getWeatherData, getAQIData } = require('../services/weatherService')
const { calculatePayout, PLAN_CONFIG } = require('../utils/premiumCalculator')
const { recomputeForUser: recomputeBalance } = require('../services/userBalanceService')

const UPI_RE = /^[\w.\-]{2,}@[A-Za-z]{2,}$/

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
    const aqiValue = await getAQIData(req.user.location)

    const avgDailyEarnings = parseFloat(req.user.avgDailyEarnings) || 700
    const workHoursPerDay = parseFloat(req.user.workHoursPerDay) || 6
    const coverageCap = policy ? parseFloat(policy.coverage) : PLAN_CONFIG.standard.coverage

    const earningsProtected = policy
      ? calculatePayout({ avgDailyEarnings, workHoursPerDay, hoursLost: workHoursPerDay, coverageCap })
      : 0

    res.json({
      user: {
        name: req.user.name,
        email: req.user.email,
        occupation: req.user.occupation,
        platform: req.user.platform,
        platformId: req.user.platformId,
        location: req.user.location,
        deliveryZone: req.user.deliveryZone,
        avgDailyEarnings: req.user.avgDailyEarnings,
        workHoursPerDay: req.user.workHoursPerDay,
        latitude: req.user.latitude,
        longitude: req.user.longitude,
        payoutMethod: req.user.payoutMethod,
        payoutHandle: req.user.payoutHandle,
        payoutAccountName: req.user.payoutAccountName,
        directPayoutConsent: req.user.directPayoutConsent,
        locationTrackingConsent: req.user.locationTrackingConsent,
        lastTrackedAt: req.user.lastTrackedAt
      },
      policy: policy ? {
        id: policy.id,
        type: policy.type,
        premium: policy.premium,
        coverage: policy.coverage,
        status: policy.status,
        endDate: policy.endDate
      } : null,
      claims: claims.map((claim) => ({
        id: claim.id,
        submittedAt: claim.submittedAt,
        description: claim.description,
        triggerType: claim.triggerType,
        triggerValue: claim.triggerValue,
        amount: claim.amount,
        status: claim.status
      })),
      riskLevel: riskZone ? riskZone.riskLevel : 'medium',
      earningsProtected,
      weather: weatherData ? {
        condition: weatherData.weather[0].main,
        temperature: Math.round(weatherData.main.temp),
        humidity: weatherData.main.humidity,
        aqi: aqiValue
      } : null
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const {
      location, occupation, platform, avgDailyEarnings, deliveryZone, platformId,
      latitude, longitude, pincode, payoutMethod, payoutHandle, payoutAccountName,
      directPayoutConsent, locationTrackingConsent, lastTrackedAt
    } = req.body

    const validFields = [
      'location', 'occupation', 'platform', 'avgDailyEarnings', 'deliveryZone', 'platformId',
      'latitude', 'longitude', 'pincode', 'payoutMethod', 'payoutHandle', 'payoutAccountName',
      'directPayoutConsent', 'locationTrackingConsent', 'lastTrackedAt'
    ]

    const hasAtLeastOne = validFields.some((field) => req.body[field] !== undefined)
    if (!hasAtLeastOne) {
      return res.status(400).json({ message: 'Provide at least one field to update' })
    }

    const updateData = {}

    if (location) updateData.location = location
    if (occupation) updateData.occupation = occupation
    if (platform) updateData.platform = platform
    if (platformId) updateData.platformId = platformId
    if (deliveryZone) updateData.deliveryZone = deliveryZone
    if (pincode) updateData.pincode = pincode

    if (avgDailyEarnings !== undefined) {
      const val = parseFloat(avgDailyEarnings)
      if (isNaN(val) || val <= 0) {
        return res.status(400).json({ message: 'avgDailyEarnings must be a positive number' })
      }
      if (val > 5000) {
        return res.status(400).json({ message: 'avgDailyEarnings cannot exceed 5000 per day' })
      }
      updateData.avgDailyEarnings = val
    }

    if (latitude !== undefined) {
      const lat = parseFloat(latitude)
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ message: 'latitude must be between -90 and 90' })
      }
      updateData.latitude = lat
      updateData.lastTrackedAt = new Date()
    }

    if (longitude !== undefined) {
      const lng = parseFloat(longitude)
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ message: 'longitude must be between -180 and 180' })
      }
      updateData.longitude = lng
      updateData.lastTrackedAt = new Date()
    }

    if (payoutMethod !== undefined) {
      if (payoutMethod !== null && payoutMethod !== '' && !['UPI', 'BANK_TRANSFER'].includes(payoutMethod)) {
        return res.status(400).json({ message: 'payoutMethod must be UPI or BANK_TRANSFER' })
      }
      updateData.payoutMethod = payoutMethod || null
    }

    if (payoutHandle !== undefined) {
      const handle = String(payoutHandle || '').trim()
      const effectiveMethod = updateData.payoutMethod !== undefined ? updateData.payoutMethod : req.user.payoutMethod
      if (handle && effectiveMethod === 'UPI' && !UPI_RE.test(handle)) {
        return res.status(400).json({ message: 'Please provide a valid UPI ID' })
      }
      updateData.payoutHandle = handle || null
    }

    if (payoutAccountName !== undefined) {
      updateData.payoutAccountName = String(payoutAccountName || '').trim() || null
    }

    if (directPayoutConsent !== undefined) {
      updateData.directPayoutConsent = Boolean(directPayoutConsent)
    }

    if (locationTrackingConsent !== undefined) {
      updateData.locationTrackingConsent = Boolean(locationTrackingConsent)
    }

    if (lastTrackedAt !== undefined) {
      if (lastTrackedAt) {
        updateData.lastTrackedAt = new Date(lastTrackedAt)
      } else {
        updateData.lastTrackedAt = null
      }
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

exports.getTrustSummary = async (req, res) => {
  try {
    const userId = req.user.id

    let balance = await UserBalance.findOne({ where: { user_id: userId } })
    if (!balance) {
      await recomputeBalance(userId).catch(() => null)
      balance = await UserBalance.findOne({ where: { user_id: userId } })
    }

    const pendingAppeals = await Claim.count({
      where: { userId, status: { [Op.in]: ['disputed', 'under_review', 'flagged'] } }
    })

    const activePolicy = await Policy.findOne({ where: { userId, status: 'active' } })

    res.json({
      userId,
      premiumsPaidTotal: Number(balance?.total_premiums_paid || 0),
      claimsTriggered: Number(balance?.claims_count || 0),
      claimsApproved: Number(balance?.approved_claims_count || 0),
      payoutsReceivedTotal: Number(balance?.total_payouts_received || 0),
      pendingPayoutAmount: Number(balance?.pending_payout_amount || 0),
      pendingAppeals,
      activePolicy: activePolicy ? {
        type: activePolicy.type,
        coverage: Number(activePolicy.coverage),
        premium: Number(activePolicy.premium),
        endDate: activePolicy.endDate
      } : null,
      lastPayoutAt: balance?.last_payout_at || null,
      lastPremiumAt: balance?.last_premium_at || null
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
