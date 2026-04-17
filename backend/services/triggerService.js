/**
 * triggerService.js
 * -----------------
 * Parametric trigger engine. Runs hourly to check live weather/AQI data
 * against defined thresholds. Fires automatic claims for matched policies.
 *
 * Trigger thresholds (food delivery outdoor workers, Zomato/Swiggy persona):
 *  - Heavy rain:     >= 50mm accumulated in 3 hours (IMD standard)
 *  - Moderate rain:  >= 30mm in 3 hours
 *  - Extreme heat:   >= 42°C sustained (outdoor work becomes unsafe)
 *  - Severe AQI:     >= 200 (CPCB "Severe" band — respiratory risk)
 *  - Cyclone alert:  weather ID 900-902 (OpenWeather tropical storm codes)
 *
 * Hours-lost calculation is now DYNAMIC (see weatherService.calculateHoursLost):
 *   hours = (durationMinutes / 60) × intensityFactor × timeOfDayMultiplier
 *   capped per trigger type.
 */

const Policy  = require('../models/Policy')
const Claim   = require('../models/Claim')
const User    = require('../models/User')
const RiskZone = require('../models/RiskZone')
const {
  getWeatherData,
  getAQIData,
  detectTriggers: detectWeatherTriggers,
  calculateHoursLost,
  normaliseWeather,
  THRESHOLDS
} = require('./weatherService')
const { calculatePayout, PLAN_TRIGGERS } = require('../utils/premiumCalculator')
const { evaluateDisruptionSignals } = require('./disruptionSignals')
const { createNotification } = require('./notificationService')
const jobScheduler = require('../utils/jobScheduler')
const { Op } = require('sequelize')

const JOB_NAME = 'parametric_claim_check'

// ── Trigger type → plan category mapping ─────────────────────────────────────
// weatherService emits fine-grained trigger types; premium plans filter by
// coarse categories. This maps one to the other.
const TRIGGER_CATEGORY = {
  heavy_rain:    'rain',
  moderate_rain: 'rain',
  extreme_heat:  'heat',
  severe_aqi:    'aqi',
  cyclone:       'cyclone'
}

// ── Default event durations (minutes) ────────────────────────────────────────
// Used by calculateHoursLost when we don't have continuous event-duration
// tracking. Conservative estimates based on how long each event typically
// disrupts delivery operations.
const DEFAULT_DURATION_MINUTES = {
  heavy_rain:    180,   // 3hr rainfall window
  moderate_rain: 180,
  extreme_heat:  240,   // 4hr sustained heat
  severe_aqi:    240,   // 4hr severe AQI
  cyclone:       360    // 6hr disruption
}

/**
 * Checks if a duplicate auto-claim was already filed for the same event
 * in the last 24 hours (prevents double-paying the same storm).
 */
const isDuplicateClaim = async (userId, triggerType) => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const existing = await Claim.findOne({
    where: {
      userId,
      triggerType,
      submittedAt: { [Op.gte]: cutoff }
    }
  })
  return !!existing
}

/**
 * Filter weatherService triggers by what the user's plan covers.
 */
const filterByPlan = (triggers, planType) => {
  const allowed = PLAN_TRIGGERS[planType] || PLAN_TRIGGERS.Standard
  return triggers.filter(t => allowed.includes(TRIGGER_CATEGORY[t.triggerType]))
}

/**
 * Resolve sub-zone risk level for a user's delivery zone or pincode.
 * Returns the sub-zone entry if matched, or null (falls back to city-level risk).
 */
const resolveSubZoneRisk = (riskZone, deliveryZone, pincode) => {
  if (!riskZone?.subZones?.length) return null

  const normZone = (deliveryZone || '').toLowerCase().trim()
  const normPin  = (pincode || '').trim()

  for (const sz of riskZone.subZones) {
    if (normPin && sz.pincode === normPin) return sz
    if (normZone && sz.zone && normZone.includes(sz.zone.toLowerCase())) return sz
  }
  return null
}

// Sub-zone risk multipliers — applied after calculateHoursLost
const SUB_ZONE_MULTIPLIER = {
  high:   1.25,
  medium: 1.0,
  low:    0.85
}

/**
 * Pure worker: runs the parametric claim check. Throws on failure so the
 * job runner can retry / dead-letter it. Returns { affectedRecords, metadata }.
 */
const _doParametricClaimCheck = async () => {
  console.log('[triggerService] Running parametric claim check...')
  const startedAt = Date.now()

  const policies = await Policy.findAll({
    where: { status: 'active' },
    include: [{ model: User, as: 'user' }]
  })

  let claimsCreated = 0
  const currentHour = new Date().getHours()

    for (const policy of policies) {
      const user = policy.user
      if (!user?.location) continue

      // Build coordinate object for hyper-local queries (if user has lat/lon)
      const coords = (user.latitude != null && user.longitude != null)
        ? { lat: parseFloat(user.latitude), lon: parseFloat(user.longitude) }
        : null

      // Fetch weather + AQI data using coordinates when available (hyper-local)
      const weatherData = await getWeatherData(user.location, coords)
      const aqiValue    = await getAQIData(user.location, coords)

      if (!weatherData) continue

      // Normalised snapshot for intensity calculations
      const normalised = normaliseWeather(weatherData, aqiValue)

      // Detect which triggers fired (new fine-grained trigger types)
      const rawTriggers = detectWeatherTriggers(weatherData, aqiValue)
      const firedTriggers = filterByPlan(rawTriggers, policy.type)

      // Sub-zone risk boost
      const riskZone = await RiskZone.findOne({
        where: { location: { [Op.like]: '%' + user.location.split(',')[0].trim() + '%' } }
      })
      const subZoneRisk = resolveSubZoneRisk(riskZone, user.deliveryZone, user.pincode)
      const zoneMultiplier = subZoneRisk
        ? (SUB_ZONE_MULTIPLIER[subZoneRisk.riskLevel] || 1.0)
        : 1.0

      // Supplement with disruptionSignals (thunderstorm, flood-risk, civic events)
      const extraSignals = evaluateDisruptionSignals({ location: user.location, riskZone, weatherData })
      for (const sig of extraSignals) {
        if (sig.autoApprove && !firedTriggers.find(t => t.triggerType === sig.type)) {
          // Disruption signals carry their own payout estimate (percentile-based)
          firedTriggers.push({
            triggerType:  sig.type,
            triggerValue: sig.title,
            _hoursLostOverride: Math.round(sig.payoutPercentile / 10)
          })
        }
      }

      for (const trigger of firedTriggers) {
        // Skip if already paid for same event in last 24h
        if (await isDuplicateClaim(user.id, trigger.triggerType)) continue

        const avgDailyEarnings = parseFloat(user.avgDailyEarnings) || 700
        const workHoursPerDay  = parseFloat(user.workHoursPerDay)  || 6
        const coverageCap      = parseFloat(policy.coverage)

        // ── Dynamic hours-lost calculation ────────────────────────────────────
        let hoursLost
        if (trigger._hoursLostOverride != null) {
          // Disruption signal fallback (no intensity data available)
          hoursLost = trigger._hoursLostOverride
        } else {
          const duration = DEFAULT_DURATION_MINUTES[trigger.triggerType] || 180
          hoursLost = calculateHoursLost(
            trigger.triggerType,
            normalised,
            duration,
            currentHour
          )
        }

        // Apply sub-zone multiplier (hyper-local adjustment)
        const adjustedHoursLost = Math.round(hoursLost * zoneMultiplier * 10) / 10

        const payoutAmount = calculatePayout({
          avgDailyEarnings,
          workHoursPerDay,
          hoursLost:   adjustedHoursLost,
          coverageCap
        })

        // Auto-claim starts in 'pending_verification' — worker must confirm via
        // the notification's "Yes, confirm" / "No, I worked" buttons before payout.
        const claim = await Claim.create({
          userId:       user.id,
          policyId:     policy.id,
          amount:       payoutAmount,
          description:  `Auto-claim: ${trigger.triggerType} — ${trigger.triggerValue}. Estimated ${adjustedHoursLost} hours of income lost${subZoneRisk ? ` (zone: ${subZoneRisk.zone}, ${subZoneRisk.riskLevel} risk)` : ''}.`,
          triggerType:  trigger.triggerType,
          triggerValue: trigger.triggerValue,
          isAutoClaim:  true,
          status:       'pending_verification'
        })

        // Fire the self-certification notification (worker will see it in the verification modal)
        try {
          await createNotification({
            userId:  user.id,
            type:    'weather_trigger_confirmation',
            title:   `Confirm: were you unable to work?`,
            message: `We detected ${trigger.triggerType.replace(/_/g, ' ')} (${trigger.triggerValue}) in your area. If you couldn't work, confirm to receive ₹${payoutAmount}.`,
            data: {
              claimId:       claim.id,
              payoutAmount,
              triggerType:   trigger.triggerType,
              triggerValue:  trigger.triggerValue,
              hoursLost:     adjustedHoursLost
            },
            // Self-cert expires in 48h — unconfirmed claims fall back to admin review
            expiresInMs: 48 * 60 * 60 * 1000
          })
        } catch (err) {
          console.error(`[triggerService] Failed to create notification for claim ${claim.id}:`, err.message)
          // Don't abort the job — claim is still created, admin can manually prompt the worker
        }

        console.log(`[triggerService] Auto-claim: user=${user.id} trigger=${trigger.triggerType} hours=${adjustedHoursLost} payout=₹${payoutAmount} (pending verification)`)
        claimsCreated++
      }
    }

  const elapsedMs = Date.now() - startedAt
  console.log(`[triggerService] Done. ${claimsCreated} auto-claims created in ${elapsedMs}ms.`)

  return {
    affectedCount: claimsCreated,
    metadata: {
      policiesChecked: policies.length,
      claimsCreated,
      elapsedMs
    }
  }
}

/**
 * Audited entry point. Called on interval by server.js.
 * Routed through jobScheduler.runJob() — gets full audit logging, exponential
 * backoff (5min → 25min → 2hr → 6hr), and dead-letter alerting on total
 * failure. Errors from _doParametricClaimCheck propagate up so the scheduler
 * can record and reschedule them.
 */
const processAutomaticClaims = async () => {
  return jobScheduler.runJob(JOB_NAME, _doParametricClaimCheck)
}

module.exports = {
  processAutomaticClaims,
  _doParametricClaimCheck,
  JOB_NAME,
  filterByPlan,
  resolveSubZoneRisk,
  TRIGGER_CATEGORY,
  DEFAULT_DURATION_MINUTES,
  SUB_ZONE_MULTIPLIER,
  THRESHOLDS
}
