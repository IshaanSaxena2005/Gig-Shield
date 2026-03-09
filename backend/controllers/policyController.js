const Policy = require('../models/Policy')

exports.getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({ user: req.user.id })
    res.json(policies)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.createPolicy = async (req, res) => {
  try {
    const policy = await Policy.create({
      ...req.body,
      user: req.user.id
    })
    res.status(201).json(policy)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}