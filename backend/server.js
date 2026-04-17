const express  = require('express')
const cors     = require('cors')
const dotenv   = require('dotenv')
const { connectDB } = require('./config/db')
const { processAutomaticClaims } = require('./services/triggerService')
const { renewExpiringPolicies }  = require('./services/policyRenewalService')
const premiumCollection         = require('./services/premiumCollectionService')
const jobScheduler              = require('./utils/jobScheduler')
const { globalLimiter, sanitizeInput } = require('./middleware/security')

dotenv.config({ path: '../.env' })

// Validate required env vars at startup
const required = ['JWT_SECRET', 'FRONTEND_URL']
required.forEach(key => {
  if (!process.env[key] || process.env[key].includes('your-')) {
    if (key === 'FRONTEND_URL' && process.env.NODE_ENV === 'production') {
      console.error(`ERROR: ${key} must be set in production — CORS will block all browser requests`)
      process.exit(1)
    }
    console.warn(`WARNING: Environment variable ${key} is missing or still a placeholder`)
  }
})
;['STRIPE_SECRET_KEY', 'OPENWEATHER_API_KEY'].forEach(key => {
  if (!process.env[key] || process.env[key].includes('your-')) {
    console.warn(`WARNING: ${key} not configured — related features will use fallback/mock mode`)
  }
})

require('./models/User')
require('./models/Policy')
require('./models/Claim')
require('./models/RiskZone')
require('./models/JobAudit')
require('./models/Notification')
require('./models/UserBalance')
require('./models/PremiumCharge')
require('./models/Reserve')
require('./models/TriggerEvidence')
require('./models/DeviceFingerprint')

connectDB()

const app = express()

// CORS: in production, lock to FRONTEND_URL. In dev, accept any localhost
// port so Vite can hop between 5173/5174/5175/etc. without breaking CORS.
const isProduction = process.env.NODE_ENV === 'production'
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173'
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)                          // same-origin / curl / health checks
    if (isProduction) return cb(null, origin === allowedOrigin) // strict in prod
    if (/^http:\/\/localhost(?::\d+)?$/.test(origin)) return cb(null, true)  // any localhost port in dev
    cb(null, origin === allowedOrigin)
  },
  credentials: true
}))
app.use(express.json({ limit: '1mb' }))       // Request body size limit
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(globalLimiter)                          // 100 req/15min per IP
app.use(sanitizeInput)                          // Strip dangerous HTML/script tags

// Health check — used by start-dev.ps1 and deployment monitors
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), env: process.env.NODE_ENV || 'development' })
})

app.use('/api/auth',     require('./routes/authRoutes'))
app.use('/api/policies', require('./routes/policyRoutes'))
app.use('/api/claims',   require('./routes/claimRoutes'))
app.use('/api/payments', require('./routes/paymentRoutes'))
app.use('/api/admin',      require('./routes/adminRoutes'))
app.use('/api/admin/jobs', require('./routes/admin/jobs'))
app.use('/api/user',     require('./routes/userRoutes'))

// Global error handler
app.use((err, req, res, next) => {
  const status  = err.statusCode || 500
  const message = err.message    || 'Internal server error'
  if (process.env.NODE_ENV !== 'production') console.error(err.stack)
  res.status(status).json({ message })
})

const PORT = process.env.PORT || 5001
app.listen(PORT, () => {
  console.log(`GigShield backend running on port ${PORT}`)
})

// ── Background jobs ───────────────────────────────────────────────────────────
// FIX 🟠10: env flag prevents hammering weather API on every dev restart
const DISABLE_JOBS = process.env.DISABLE_BACKGROUND_JOBS === 'true'

/**
 * Compute milliseconds until the next occurrence of `hour:00` (server local time).
 * Used for clock-aligned daily jobs (e.g. "run every day at 6 AM" rather than
 * "run every 24 hours from process start").
 */
const msUntilNextLocalHour = (targetHour) => {
  const now  = new Date()
  const next = new Date(now)
  next.setHours(targetHour, 0, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1) // already past today → tomorrow
  return next.getTime() - now.getTime()
}

if (DISABLE_JOBS) {
  console.log('[jobs] Background jobs disabled (DISABLE_BACKGROUND_JOBS=true)')
} else {
  const ONE_HOUR_MS = 60 * 60 * 1000
  const ONE_DAY_MS  = 24 * ONE_HOUR_MS

  // Parametric claim check — every hour (5s startup delay so DB settles)
  setTimeout(processAutomaticClaims, 5000)
  setInterval(processAutomaticClaims, ONE_HOUR_MS)

  // Policy auto-renewal — every 6 hours (10s startup delay)
  setTimeout(renewExpiringPolicies, 10000)
  setInterval(renewExpiringPolicies, 6 * ONE_HOUR_MS)

  // Daily premium collection — fires at 6:00 AM local, then every 24h.
  // Wrapped in jobScheduler so we get audit logging + retry + dead-letter.
  const runDailyCollection = () =>
    jobScheduler.runJob('daily_premium_collection', () => premiumCollection.processDailyCollections())
  const firstCollectionAt = msUntilNextLocalHour(6)
  setTimeout(() => {
    runDailyCollection()
    setInterval(runDailyCollection, ONE_DAY_MS)
  }, firstCollectionAt)

  // Retry sweep for failed premium charges — every 6 hours (15s startup delay)
  const runRetrySweep = () =>
    jobScheduler.runJob('retry_failed_premiums', () => premiumCollection.retryFailedCollections())
  setTimeout(runRetrySweep, 15000)
  setInterval(runRetrySweep, 6 * ONE_HOUR_MS)

  // Reserve health check — fires at 2:00 AM local, then every 24h.
  // Logs solvency ratio, alerts admins if < 0.8, auto-halts policy sales if < 0.6.
  const checkReserveHealth = require('./jobs/checkReserveHealth')
  const runReserveHealth   = () => jobScheduler.runJob('check_reserve_health', checkReserveHealth)
  const firstReserveAt     = msUntilNextLocalHour(2)
  setTimeout(() => {
    runReserveHealth()
    setInterval(runReserveHealth, ONE_DAY_MS)
  }, firstReserveAt)

  const firstCollectionAt_readable = new Date(Date.now() + firstCollectionAt).toLocaleString()
  const firstReserveAt_readable    = new Date(Date.now() + firstReserveAt).toLocaleString()
  console.log('[jobs] Parametric claim check:     every 60 minutes')
  console.log('[jobs] Policy auto-renewal check:  every 6 hours')
  console.log(`[jobs] Daily premium collection:   first run at ${firstCollectionAt_readable}, then every 24h`)
  console.log('[jobs] Retry failed premiums:      every 6 hours')
  console.log(`[jobs] Reserve health check:       first run at ${firstReserveAt_readable}, then every 24h`)
}
