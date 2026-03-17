const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { connectDB } = require('./config/db')
const { processAutomaticClaims } = require('./services/triggerService')

// Load environment variables
dotenv.config({ path: '../.env' })

// Import models to ensure they are registered
require('./models/User')
require('./models/Policy')
require('./models/Claim')
require('./models/RiskZone')

// Connect to database
connectDB()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/policies', require('./routes/policyRoutes'))
app.use('/api/claims', require('./routes/claimRoutes'))
app.use('/api/payments', require('./routes/paymentRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))
app.use('/api/user', require('./routes/userRoutes'))

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Schedule automatic claims processing every hour
setInterval(processAutomaticClaims, 60 * 60 * 1000) // 1 hour

// Initial run
processAutomaticClaims()