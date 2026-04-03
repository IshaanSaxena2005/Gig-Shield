const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  })
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, occupation, location, averageDailyIncome } = req.body
    const normalizedName = String(name || '').trim()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const normalizedLocation = String(location || '').trim()
    const parsedIncome = averageDailyIncome === undefined || averageDailyIncome === null || averageDailyIncome === ''
      ? null
      : Number(averageDailyIncome)

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' })
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    if (parsedIncome !== null && (!Number.isFinite(parsedIncome) || parsedIncome <= 0)) {
      return res.status(400).json({ message: 'Average daily income must be a valid number' })
    }

    const userExists = await User.findOne({ where: { email: normalizedEmail } })
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      occupation: occupation || null,
      location: normalizedLocation || null,
      averageDailyIncome: parsedIncome
    })

    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      occupation: user.occupation,
      location: user.location,
      token: generateToken(user.id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ where: { email: normalizedEmail } })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      occupation: user.occupation,
      location: user.location,
      token: generateToken(user.id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
