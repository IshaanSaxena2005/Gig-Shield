const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { connectDB } = require('./config/db')
const { processAutomaticClaims } = require('./services/triggerService')

// Load environment variables
dotenv.config({ path: '../.env' })

// Validate required environment variables at startup — fail fast
const configChecks = [
  {
    key: 'JWT_SECRET',
    isInvalid: (value) => !value || value.includes('your-'),
    message: 'JWT auth is using a missing or placeholder secret.'
  },
  {
    key: 'STRIPE_SECRET_KEY',
    isInvalid: (value) => !value || value.includes('your-'),
    message: 'Stripe is running in demo mode until a real secret key is provided.'
  },
  {
    key: 'OPENWEATHER_API_KEY',
    isInvalid: (value) => !value || value.includes('your-'),
    message: 'Weather automation may fail until OPENWEATHER_API_KEY is configured.'
  }
]

configChecks.forEach(({ key, isInvalid, message }) => {
  if (isInvalid(process.env[key] || '')) {
    console.warn(`WARNING: ${message}`)
  }
})

// Import models to ensure they are registered
require('./models/User')
require('./models/Policy')
require('./models/Claim')
require('./models/RiskZone')

const app = express()

// FIX: restrict CORS to your frontend origin only
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'gig-shield-backend',
    automationEnabled,
    automationIntervalMinutes: Number(process.env.AUTOMATION_INTERVAL_MINUTES || 60)
  })
})

// Routes
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/policies', require('./routes/policyRoutes'))
app.use('/api/claims', require('./routes/claimRoutes'))
app.use('/api/payments', require('./routes/paymentRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))
app.use('/api/user', require('./routes/userRoutes'))

// FIX: global error handler — catches anything thrown in controllers
// This removes the need for duplicate try/catch in every controller
app.use((err, req, res, next) => {
  const status = err.statusCode || 500
  const message = err.message || 'Internal server error'
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack)
  }
  res.status(status).json({ message })
})

const PORT = process.env.PORT || 5000
const automationEnabled = process.env.ENABLE_AUTOMATION !== 'false'
const automationIntervalMs = Number(process.env.AUTOMATION_INTERVAL_MINUTES || 60) * 60 * 1000

const startServer = async () => {
  await connectDB()

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })

  if (automationEnabled) {
    setInterval(processAutomaticClaims, automationIntervalMs)
    processAutomaticClaims()
  } else {
    console.log('Automation scheduler disabled via ENABLE_AUTOMATION=false')
  }
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
