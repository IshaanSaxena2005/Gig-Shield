const Claim = require('../models/Claim')
const Policy = require('../models/Policy')
const { detectFraud } = require('../services/fraudDetection')
const { getFraudAssessment } = require('../services/mlService')
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

    if (claim.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' })
    }

    res.json(claim)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.createClaim = async (req, res) => {
  try {
    const { policyId, amount, description } = req.body

    // Basic input validation
    if (!policyId || !amount || !description) {
      return res.status(400).json({ message: 'policyId, amount and description are required' })
    }
    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' })
    }

    const policy = await Policy.findByPk(policyId)
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' })
    }

    if (policy.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // Fraud detection
    const userClaims = await Claim.findAll({ where: { userId: req.user.id } })
    const aiFraudAssessment = await getFraudAssessment({
      amount: Number(amount),
      policyCoverage: Number(policy.coverage),
      claimCount30Days: userClaims.filter((claim) =>
        new Date(claim.submittedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length
    })
    const fraudCheck = detectFraud(
      { amount: Number(amount), description, policyCoverage: policy.coverage },
      userClaims,
      aiFraudAssessment
    )

    // FIX: fraudulent → 'flagged' for review, clean → 'pending' (not auto-approved)
    const claim = await Claim.create({
      userId: req.user.id,
      policyId,
      amount: Number(amount),
      description,
      status: fraudCheck.isFraudulent ? 'flagged' : 'pending',
      source: 'manual',
      notes: fraudCheck.isFraudulent
        ? `Soft review required: ${fraudCheck.reasons.join('; ')}`
        : 'Awaiting standard review'
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

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // FIX: whitelist only allowed fields — never spread req.body directly
    const { status, notes } = req.body
    const allowedStatuses = ['pending', 'approved', 'rejected', 'flagged']

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(', ')}` })
    }

    await claim.update({ status, notes, processedAt: new Date() })

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
