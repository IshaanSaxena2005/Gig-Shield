const Claim = require('../models/Claim')

exports.getClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ user: req.user.id }).populate('policy')
    res.json(claims)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.createClaim = async (req, res) => {
  try {
    const claim = await Claim.create({
      ...req.body,
      user: req.user.id
    })
    res.status(201).json(claim)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updateClaim = async (req, res) => {
  try {
    const claim = await Claim.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    })
    res.json(claim)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}