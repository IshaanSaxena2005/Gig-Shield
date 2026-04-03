const Policy = require('../models/Policy')
const User = require('../models/User')
const RiskZone = require('../models/RiskZone')
const { calculateWeeklyPremium, PLAN_COVERAGE } = require('../utils/premiumCalculator')
const { getWeatherData } = require('../services/weatherService')

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
    const { type, coverage, occupation, location } = req.body

    if (!type || !coverage || !occupation || !location) {
      return res.status(400).json({ message: 'type, coverage, occupation and location are required' })
    }

    // Validate plan type
    const validTypes = ['Basic', 'Standard', 'Pro']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${validTypes.join(', ')}` })
    }

    if (isNaN(coverage) || Number(coverage) <= 0) {
      return res.status(400).json({ message: 'coverage must be a positive number' })
    }

    // Block duplicate active policy
    const existingPolicy = await Policy.findOne({
      where: { userId: req.user.id, status: 'active' }
    })
    if (existingPolicy) {
      return res.status(400).json({ message: 'You already have an active policy' })
    }

    // Derive city from location string for premium calculation
    const cityFromLocation = location.split(',')[0].trim()

    // FIX: use actuarial weekly premium calculator instead of crude multiplier
    const premiumResult = calculateWeeklyPremium({
      city: cityFromLocation,
      planType: type
    })

    // Use plan's defined coverage cap (overrides user input to prevent abuse)
    const coverageCap = PLAN_COVERAGE[type]

    // FIX: weekly end date — policies renew every Monday, expire after 7 days
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7)

    const policy = await Policy.create({
      userId: req.user.id,
      type,
      premium: premiumResult.grossPremium,
      coverage: coverageCap,
      startDate,
      endDate
    })

    res.status(201).json({
      ...policy.toJSON(),
      premiumBreakdown: premiumResult.breakdown,
      targetLossRatio: premiumResult.targetLossRatio
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Worker can activate, pause or cancel their own policy
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

// Admin-only full update
exports.updatePolicy = async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id)
    if (!policy) return res.status(404).json({ message: 'Policy not found' })
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' })
    }
    const { status, premium, coverage } = req.body
    await policy.update({ status, premium, coverage })
    const updatedPolicy = await Policy.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
    })
    res.json(updatedPolicy)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getAllPolicies = async (req, res) => {
  try {
    const policies = await Policy.findAll({
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
      order: [['startDate', 'DESC']]
    })
    res.json(policies)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
