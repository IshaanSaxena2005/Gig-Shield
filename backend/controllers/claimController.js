const Claim = require('../models/Claim')
const Policy = require('../models/Policy')
const { detectFraud } = require('../services/fraudDetection')
const { Op } = require('sequelize')

exports.getClaims = async (req, res) => {
  try {
    const claims = await Claim.findAll({
      where: { userId: req.user.id },
      include: [{ model: Policy, as: 'policy' }],
      order: [['submittedAt', 'DESC']]
    })
    res.json(claims)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getClaimById = async (req, res) => {
  try {
    const claim = await Claim.findByPk(req.params.id, {
      include: [
        { model: Policy, as: 'policy' },
        { model: require('../models/User'), as: 'user', attributes: ['name', 'email'] }
      ]
    })

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' })
    }

    // Check if user owns the claim or is admin
    if (claim.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' })
    }

    res.json(claim)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.createClaim = async (req, res) => {
  try {
    const { policyId, amount, description } = req.body

    // Get policy details
    const policy = await Policy.findByPk(policyId)
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' })
    }

    // Check if policy belongs to user
    if (policy.userId !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    // Fraud detection
    const userClaims = await Claim.findAll({ where: { userId: req.user.id } })
    const fraudCheck = detectFraud(
      { amount, description, policyCoverage: policy.coverage },
      userClaims
    )

    const claim = await Claim.create({
      userId: req.user.id,
      policyId,
      amount,
      description,
      status: fraudCheck.isFraudulent ? 'pending' : 'approved'
    })

    res.status(201).json({
      claim,
      fraudAlert: fraudCheck.isFraudulent ? fraudCheck.reasons : null
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updateClaim = async (req, res) => {
  try {
    const claim = await Claim.findByPk(req.params.id)

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' })
    }

    // Only admin can update claim status
    if (req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' })
    }

    await claim.update({ ...req.body, processedAt: new Date() })
    const updatedClaim = await Claim.findByPk(req.params.id, {
      include: [
        { model: Policy, as: 'policy' },
        { model: require('../models/User'), as: 'user', attributes: ['name', 'email'] }
      ]
    })

    res.json(updatedClaim)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getAllClaims = async (req, res) => {
  try {
    const claims = await Claim.findAll({
      include: [
        { model: Policy, as: 'policy' },
        { model: require('../models/User'), as: 'user', attributes: ['name', 'email'] }
      ],
      order: [['submittedAt', 'DESC']]
    })
    res.json(claims)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}