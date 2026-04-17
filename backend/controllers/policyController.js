const Policy         = require('../models/Policy')
const User           = require('../models/User')
const reserveService = require('../services/reserveService')
const { calculateWeeklyPremium, calculateContributionPremium, PLAN_CONFIG } = require('../utils/premiumCalculator')

exports.getPolicies = async (req, res) => {
  try {
    const policies = await Policy.findAll({ where: { userId: req.user.id } })
    res.json(policies)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getPolicyById = async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
    })
    if (!policy) return res.status(404).json({ message: 'Policy not found' })
    if (policy.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' })
    }
    res.json(policy)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.createPolicy = async (req, res) => {
  try {
    const { type, occupation, location } = req.body

    if (!type || !occupation || !location) {
      return res.status(400).json({ message: 'type, occupation and location are required' })
    }

    const validTypes = ['Basic', 'Standard', 'Pro']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${validTypes.join(', ')}` })
    }

    const city               = location.split(',')[0].trim()
    const avgDailyEarnings   = parseFloat(req.user.avgDailyEarnings) || 700
    const premiumResult      = calculateWeeklyPremium({ city, planType: type, avgDailyEarnings })

    // Preview-only mode — return price without creating a policy
    if (req.body.previewOnly) {
      return res.json({
        premium:          premiumResult.grossPremium,
        contributionPct:  premiumResult.contributionPct,
        weeklyEarnings:   premiumResult.weeklyEarnings,
        premiumBreakdown: premiumResult.breakdown,
        targetLossRatio:  premiumResult.targetLossRatio,
        coverage:         PLAN_CONFIG[type.toLowerCase()].coverage,
        cityRisk:         premiumResult.cityRisk
      })
    }

    // Block duplicate active policy
    const existing = await Policy.findOne({ where: { userId: req.user.id, status: 'active' } })
    if (existing) {
      return res.status(400).json({ message: 'You already have an active policy' })
    }

    // Solvency gate — auto-halt new sales when reserves are critically low.
    // Re-derived live from the reserve ledger each call (no stale flag to drift).
    try {
      await reserveService.checkBeforeNewPolicy()
    } catch (err) {
      if (err.code === 'POLICY_SALES_HALTED') {
        return res.status(503).json({
          message:      err.message,
          code:         err.code,
          currentRatio: err.ratio
        })
      }
      throw err
    }

    const startDate = new Date()
    const endDate   = new Date()
    endDate.setDate(endDate.getDate() + 7)

    const policy = await Policy.create({
      userId:   req.user.id,
      type,
      premium:  premiumResult.grossPremium,   // contribution price — what worker pays
      coverage: PLAN_CONFIG[type.toLowerCase()].coverage,
      startDate,
      endDate
    })

    res.status(201).json({
      ...policy.toJSON(),
      contributionPct:  premiumResult.contributionPct,
      weeklyEarnings:   premiumResult.weeklyEarnings,
      premiumBreakdown: premiumResult.breakdown,
      targetLossRatio:  premiumResult.targetLossRatio,
      cityRisk:         premiumResult.cityRisk
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updatePolicyStatus = async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id)
    if (!policy) return res.status(404).json({ message: 'Policy not found' })
    if (policy.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    const { status } = req.body
    const allowed = ['active', 'paused', 'cancelled']
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` })
    }
    await policy.update({ status })
    res.json(policy)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updatePolicy = async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id)
    if (!policy) return res.status(404).json({ message: 'Policy not found' })
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' })
    }
    const { status, premium, coverage } = req.body
    await policy.update({ status, premium, coverage })
    const updated = await Policy.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getAllPolicies = async (req, res) => {
  try {
    const policies = await Policy.findAll({
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
      order:   [['startDate', 'DESC']]
    })
    res.json(policies)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
