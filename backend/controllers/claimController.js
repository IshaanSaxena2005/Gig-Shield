const Claim  = require('../models/Claim')
const Policy = require('../models/Policy')
const { checkFraud } = require('../services/aiService')
const { Op }   = require('sequelize')

exports.getClaims = async (req, res) => {
  try {
    const claims = await Claim.findAll({
      where:   { userId: req.user.id },
      include: [{ model: Policy, as: 'policy' }],
      order:   [['submittedAt', 'DESC']]
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
        { model: Policy,                       as: 'policy' },
        { model: require('../models/User'),     as: 'user', attributes: ['name', 'email'] }
      ]
    })
    if (!claim) return res.status(404).json({ message: 'Claim not found' })
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

    if (!policyId || !amount || !description) {
      return res.status(400).json({ message: 'policyId, amount and description are required' })
    }
    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' })
    }

    const policy = await Policy.findByPk(policyId)
    if (!policy) return res.status(404).json({ message: 'Policy not found' })
    if (policy.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    if (policy.status !== 'active') {
      return res.status(400).json({ message: 'Claims can only be submitted against an active policy' })
    }

    const userClaims = await Claim.findAll({ where: { userId: req.user.id } })

    // FIX: use aiService which calls Flask engine with JS fallback
    const fraudCheck = await checkFraud(
      { amount: Number(amount), description, policyCoverage: policy.coverage },
      userClaims
    )

    const claim = await Claim.create({
      userId:      req.user.id,
      policyId,
      amount:      Number(amount),
      description,
      status:      fraudCheck.isFraudulent ? 'flagged' : 'pending'
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
    if (!claim)              return res.status(404).json({ message: 'Claim not found' })
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' })

    const { status, notes } = req.body
    const validStatuses = ['pending', 'approved', 'rejected', 'flagged']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${validStatuses.join(', ')}` })
    }

    await claim.update({ status, processedAt: new Date() })

    const updated = await Claim.findByPk(req.params.id, {
      include: [
        { model: Policy,                       as: 'policy' },
        { model: require('../models/User'),     as: 'user', attributes: ['name', 'email'] }
      ]
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// FIX: pagination on admin all-claims (now handled via adminController)
// This remains for backward compat with /claims/all route
exports.getAllClaims = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1)
    const limit  = Math.min(100, parseInt(req.query.limit) || 20)
    const offset = (page - 1) * limit

    const { count, rows } = await Claim.findAndCountAll({
      include: [
        { model: Policy,                       as: 'policy' },
        { model: require('../models/User'),     as: 'user', attributes: ['name', 'email'] }
      ],
      order:  [['submittedAt', 'DESC']],
      limit,
      offset
    })

    res.json({
      claims:     rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
