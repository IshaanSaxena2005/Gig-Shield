const User = require('../models/User')
const Policy = require('../models/Policy')
const Claim = require('../models/Claim')
const RiskZone = require('../models/RiskZone')
const { Op } = require('sequelize')

exports.getDashboardStats = async (req, res) => {
  try {
    // Platform metrics
    const workersInsured = await User.count({ where: { role: 'worker' } })
    const activePolicies = await Policy.count({ where: { status: 'active' } })

    const totalPremiumResult = await Policy.sum('premium', { where: { status: 'active' } })
    const totalPremium = totalPremiumResult || 0

    const totalPayoutResult = await Claim.sum('amount', { where: { status: 'approved' } })
    const totalPayout = totalPayoutResult || 0

    // Claims overview
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const claimsToday = await Claim.count({
      where: {
        submittedAt: { [Op.gte]: today, [Op.lt]: tomorrow }
      }
    })

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const claimsThisWeek = await Claim.count({
      where: {
        submittedAt: { [Op.gte]: weekAgo }
      }
    })

    res.json({
      platformMetrics: {
        workersInsured,
        activePolicies,
        totalPremium: Math.round(totalPremium),
        totalPayout: Math.round(totalPayout)
      },
      claimsOverview: {
        claimsToday,
        claimsThisWeek,
        totalPayout: Math.round(totalPayout)
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getRiskZones = async (req, res) => {
  try {
    const riskZones = await RiskZone.findAll()
    res.json(riskZones)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updateRiskZone = async (req, res) => {
  try {
    const { location, riskLevel, weatherConditions } = req.body

    const [riskZone, created] = await RiskZone.upsert({
      location,
      riskLevel,
      weatherConditions,
      updatedAt: new Date()
    }, {
      returning: true
    })

    res.json(riskZone)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getFraudAlerts = async (req, res) => {
  try {
    // Simple fraud detection logic - claims with high amounts or frequent claims
    const recentClaims = await Claim.findAll({
      where: {
        submittedAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
    })

    const fraudAlerts = []

    // Group claims by user
    const userClaims = {}
    recentClaims.forEach(claim => {
      const userId = claim.userId
      if (!userClaims[userId]) {
        userClaims[userId] = []
      }
      userClaims[userId].push(claim)
    })

    // Check for suspicious patterns
    Object.keys(userClaims).forEach(userId => {
      const claims = userClaims[userId]
      if (claims.length > 3) {
        fraudAlerts.push({
          id: `freq-${userId}`,
          type: 'High claim frequency',
          severity: 'high',
          user: claims[0].user.name,
          details: `${claims.length} claims in the last week`
        })
      }

      const totalAmount = claims.reduce((sum, claim) => sum + parseFloat(claim.amount), 0)
      if (totalAmount > 1000) {
        fraudAlerts.push({
          id: `amount-${userId}`,
          type: 'Large claim amounts',
          severity: 'medium',
          user: claims[0].user.name,
          details: `Total claims: ₹${totalAmount}`
        })
      }
    })

    res.json(fraudAlerts)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}