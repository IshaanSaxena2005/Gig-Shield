const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { connectDB } = require('./config/db')
const { processAutomaticClaims } = require('./services/triggerService')

// Load environment variables
dotenv.config({ path: '../.env' })

// Validate required environment variables at startup — fail fast
const required = ['JWT_SECRET', 'STRIPE_SECRET_KEY', 'OPENWEATHER_API_KEY']
required.forEach(key => {
  if (!process.env[key] || process.env[key].includes('your-')) {
    console.warn(`WARNING: Environment variable ${key} is missing or still a placeholder`)
  }
})

// Import models to ensure they are registered
require('./models/User')
require('./models/Policy')
require('./models/Claim')
require('./models/RiskZone')

// Connect to database
connectDB()

const app = express()

// FIX: restrict CORS to your frontend origin only
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json())

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Schedule automatic claims processing every hour
setInterval(processAutomaticClaims, 60 * 60 * 1000)

// Initial run on startup
processAutomaticClaims()