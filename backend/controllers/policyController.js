const Policy = require('../models/Policy')
const User = require('../models/User')
const RiskZone = require('../models/RiskZone')
const { calculatePremium } = require('../utils/premiumCalculator')
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

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' })
    }

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

    // Check if user already has an active policy
    const existingPolicy = await Policy.findOne({
      where: { userId: req.user.id, status: 'active' }
    })
    if (existingPolicy) {
      return res.status(400).json({ message: 'You already have an active policy' })
    }

    const riskZone = await RiskZone.findOne({ where: { location } })
    const weatherData = await getWeatherData(location)

    const riskFactors = {
      location: riskZone ? riskZone.riskLevel : 'medium',
      weatherRisk: weatherData ? (weatherData.weather[0].main.toLowerCase() === 'rain' ? 0.8 : 0.3) : 0.5,
      occupation: occupation.toLowerCase()
    }

    const basePremium = 50
    const calculatedPremium = calculatePremium(basePremium, riskFactors)

    const endDate = new Date()
    endDate.setFullYear(endDate.getFullYear() + 1)

    const policy = await Policy.create({
      userId: req.user.id,
      type,
      premium: calculatedPremium,
      coverage,
      endDate
    })

    res.status(201).json(policy)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// NEW: allows the policy owner to activate, pause or cancel their own policy
exports.updatePolicyStatus = async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id)

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' })
    }

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

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' })
    }

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