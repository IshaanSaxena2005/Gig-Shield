const User = require('../models/User')
const Policy = require('../models/Policy')
const Claim = require('../models/Claim')
const RiskZone = require('../models/RiskZone')

exports.getDashboardStats = async (req, res) => {
  try {
    // Platform metrics
    const workersInsured = await User.countDocuments({ role: 'worker' })
    const activePolicies = await Policy.countDocuments({ status: 'active' })

    const totalPremiumResult = await Policy.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$premium' } } }
    ])
    const totalPremium = totalPremiumResult.length > 0 ? totalPremiumResult[0].total : 0

    const totalPayoutResult = await Claim.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    const totalPayout = totalPayoutResult.length > 0 ? totalPayoutResult[0].total : 0

    // Claims overview
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const claimsToday = await Claim.countDocuments({
      submittedAt: { $gte: today, $lt: tomorrow }
    })

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const claimsThisWeek = await Claim.countDocuments({
      submittedAt: { $gte: weekAgo }
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
    const riskZones = await RiskZone.find({})
    res.json(riskZones)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updateRiskZone = async (req, res) => {
  try {
    const { location, riskLevel, weatherConditions } = req.body

    const riskZone = await RiskZone.findOneAndUpdate(
      { location },
      { riskLevel, weatherConditions, updatedAt: new Date() },
      { new: true, upsert: true }
    )

    res.json(riskZone)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getFraudAlerts = async (req, res) => {
  try {
    // Simple fraud detection logic - claims with high amounts or frequent claims
    const recentClaims = await Claim.find({
      submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).populate('user', 'name email')

    const fraudAlerts = []

    // Group claims by user
    const userClaims = {}
    recentClaims.forEach(claim => {
      const userId = claim.user._id.toString()
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

      const totalAmount = claims.reduce((sum, claim) => sum + claim.amount, 0)
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