const Claim = require('../models/Claim')
const Policy = require('../models/Policy')
const { detectFraud } = require('../services/fraudDetection')

exports.getClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ user: req.user.id })
      .populate('policy')
      .populate('user', 'name email')
      .sort({ submittedAt: -1 })
    res.json(claims)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getClaimById = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('policy')
      .populate('user', 'name email')

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' })
    }

    // Check if user owns the claim or is admin
    if (claim.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
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
    const policy = await Policy.findById(policyId)
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' })
    }

    // Check if policy belongs to user
    if (policy.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    // Fraud detection
    const userClaims = await Claim.find({ user: req.user.id })
    const fraudCheck = detectFraud(
      { amount, description, policyCoverage: policy.coverage },
      userClaims
    )

    const claim = await Claim.create({
      user: req.user.id,
      policy: policyId,
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
    const claim = await Claim.findById(req.params.id)

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' })
    }

    // Only admin can update claim status
    if (req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' })
    }

    const updatedClaim = await Claim.findByIdAndUpdate(
      req.params.id,
      { ...req.body, processedAt: new Date() },
      { new: true }
    ).populate('policy').populate('user', 'name email')

    res.json(updatedClaim)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getAllClaims = async (req, res) => {
  try {
    const claims = await Claim.find({})
      .populate('policy')
      .populate('user', 'name email')
      .sort({ submittedAt: -1 })
    res.json(claims)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}