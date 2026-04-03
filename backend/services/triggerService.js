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
 */

const Policy  = require('../models/Policy')
const Claim   = require('../models/Claim')
const User    = require('../models/User')
const { getWeatherData } = require('./weatherService')
const { getAQIData }     = require('./aqiService')
const { calculatePayout, PLAN_COVERAGE, PLAN_TRIGGERS } = require('../utils/premiumCalculator')
const { Op } = require('sequelize')

// ── Trigger thresholds ────────────────────────────────────────────────────────
const THRESHOLDS = {
  rain: {
    moderate: 30,   // mm / 3hr — Tier 1 payout
    heavy:    50,   // mm / 3hr — Tier 2 payout (primary trigger)
  },
  heat: {
    extreme:  42    // °C sustained
  },
  aqi: {
    severe:   200   // CPCB AQI "Severe" band
  }
}

// ── Hours lost estimation by event type and severity ─────────────────────────
const HOURS_LOST = {
  rain_moderate: 3,
  rain_heavy:    6,
  heat_extreme:  5,
  aqi_severe:    4,
  cyclone:       10,  // full day + morning
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
 * Determine which parametric triggers fired for a given weather snapshot.
 * Returns array of { triggerType, triggerValue, hoursLost }
 */
const detectTriggers = (weatherData, aqiValue, planType) => {
  const triggers = []
  const allowedTriggers = PLAN_TRIGGERS[planType] || PLAN_TRIGGERS.Standard

  if (!weatherData) return triggers

  const tempC     = weatherData.main?.temp ?? 0
  const rain1h    = weatherData.rain?.['1h'] ?? 0
  const rain3h    = weatherData.rain?.['3h'] ?? (rain1h * 3)  // estimate 3hr from 1hr if needed
  const weatherId = weatherData.weather?.[0]?.id ?? 0

  // ── Rain triggers ──────────────────────────────────────────────────────────
  if (allowedTriggers.includes('rain')) {
    if (rain3h >= THRESHOLDS.rain.heavy) {
      triggers.push({
        triggerType:  'rain_heavy',
        triggerValue: `${rain3h.toFixed(1)}mm/3hr`,
        hoursLost:    HOURS_LOST.rain_heavy
      })
    } else if (rain3h >= THRESHOLDS.rain.moderate) {
      triggers.push({
        triggerType:  'rain_moderate',
        triggerValue: `${rain3h.toFixed(1)}mm/3hr`,
        hoursLost:    HOURS_LOST.rain_moderate
      })
    }
  }

  // ── Heat trigger ──────────────────────────────────────────────────────────
  if (allowedTriggers.includes('heat') && tempC >= THRESHOLDS.heat.extreme) {
    triggers.push({
      triggerType:  'heat_extreme',
      triggerValue: `${tempC.toFixed(1)}°C`,
      hoursLost:    HOURS_LOST.heat_extreme
    })
  }

  // ── Cyclone / tropical storm trigger (OpenWeather IDs 900-902, 781) ───────
  if (allowedTriggers.includes('cyclone') &&
      ((weatherId >= 900 && weatherId <= 902) || weatherId === 781)) {
    triggers.push({
      triggerType:  'cyclone',
      triggerValue: `WeatherID ${weatherId}`,
      hoursLost:    HOURS_LOST.cyclone
    })
  }

  // ── AQI trigger ───────────────────────────────────────────────────────────
  if (allowedTriggers.includes('aqi') &&
      aqiValue !== null && aqiValue >= THRESHOLDS.aqi.severe) {
    triggers.push({
      triggerType:  'aqi_severe',
      triggerValue: `AQI ${aqiValue}`,
      hoursLost:    HOURS_LOST.aqi_severe
    })
  }

  return triggers
}

/**
 * Main hourly job. Processes all active policies and fires parametric claims.
 */
const processAutomaticClaims = async () => {
  console.log('[triggerService] Running parametric claim check...')
  try {
    const policies = await Policy.findAll({
      where: { status: 'active' },
      include: [{ model: User, as: 'user' }]
    })

    let claimsCreated = 0

    for (const policy of policies) {
      const user = policy.user
      if (!user?.location) continue

      // Fetch weather + AQI data (both cached internally)
      const weatherData = await getWeatherData(user.location)
      const aqiValue    = await getAQIData(user.location)

      if (!weatherData) continue

      // Detect which triggers fired
      const firedTriggers = detectTriggers(weatherData, aqiValue, policy.type)

      for (const trigger of firedTriggers) {
        // Skip if already paid for same event in last 24h
        if (await isDuplicateClaim(user.id, trigger.triggerType)) continue

        // FIX: compute payout from worker's actual earnings profile
        const avgDailyEarnings = parseFloat(user.avgDailyEarnings) || 700
        const workHoursPerDay  = parseFloat(user.workHoursPerDay)  || 6
        const coverageCap      = parseFloat(policy.coverage)

        const payoutAmount = calculatePayout({
          avgDailyEarnings,
          workHoursPerDay,
          hoursLost:   trigger.hoursLost,
          coverageCap
        })

        await Claim.create({
          userId:       user.id,
          policyId:     policy.id,
          amount:       payoutAmount,
          description:  `Auto-claim: ${trigger.triggerType} — ${trigger.triggerValue}. Estimated ${trigger.hoursLost} hours of income lost.`,
          triggerType:  trigger.triggerType,
          triggerValue: trigger.triggerValue,
          status:       'approved'
        })

        console.log(`[triggerService] Auto-claim created: user=${user.id} trigger=${trigger.triggerType} payout=₹${payoutAmount}`)
        claimsCreated++
      }
    }

    console.log(`[triggerService] Done. ${claimsCreated} auto-claims created.`)
  } catch (error) {
    console.error('[triggerService] Error processing automatic claims:', error)
  }
}

module.exports = { processAutomaticClaims, detectTriggers, THRESHOLDS }
