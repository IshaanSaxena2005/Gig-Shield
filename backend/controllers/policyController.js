const Policy = require('../models/Policy')
const User = require('../models/User')
const RiskZone = require('../models/RiskZone')
const { calculatePremium } = require('../utils/premiumCalculator')
const { getWeatherData } = require('../services/weatherService')

exports.getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({ user: req.user.id })
    res.json(policies)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getPolicyById = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id).populate('user', 'name email')

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' })
    }

    // Check if user owns the policy or is admin
    if (policy.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' })
    }

    res.json(policy)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.createPolicy = async (req, res) => {
  try {
    const { type, coverage, occupation, location } = req.body

    // Get risk zone data
    const riskZone = await RiskZone.findOne({ location: location })

    // Get weather data for risk assessment
    const weatherData = await getWeatherData(location)

    // Calculate risk factors
    const riskFactors = {
      location: riskZone ? riskZone.riskLevel : 'medium',
      weatherRisk: weatherData ? (weatherData.weather[0].main.toLowerCase() === 'rain' ? 0.8 : 0.3) : 0.5,
      occupation: occupation.toLowerCase()
    }

    // Calculate premium
    const basePremium = 50 // Base weekly premium
    const calculatedPremium = calculatePremium(basePremium, riskFactors)

    // Calculate end date (1 year from now)
    const endDate = new Date()
    endDate.setFullYear(endDate.getFullYear() + 1)

    const policy = await Policy.create({
      user: req.user.id,
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

exports.updatePolicy = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id)

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' })
    }

    // Only admin can update policies
    if (req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' })
    }

    const updatedPolicy = await Policy.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    }).populate('user', 'name email')

    res.json(updatedPolicy)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getAllPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({})
      .populate('user', 'name email')
      .sort({ startDate: -1 })
    res.json(policies)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}