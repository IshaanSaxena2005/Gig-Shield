/**
 * fraudEngine.js
 * --------------
 * Behaviour scoring for claims — complements the existing ML model in
 * services/mlService.js. Returns a structured verdict the claimController
 * can attach to the claim or use to route into the audit queue.
 *
 * PURE — no DB access. The caller (claimController, triggerService) loads
 * the user's history + device data and passes it in as `context`. This
 * keeps the engine deterministic and trivially unit-testable.
 *
 * Flags:
 *   multi_account       — same deviceId used by 2+ distinct userIds
 *   low_motion          — accelerometer shows idle device during an
 *                         outdoor-activity trigger (AQI / rain / heat)
 *   rapid_claims        — ≥3 claims in last 24h
 *   repeat_trigger      — same triggerType claimed again in last 48h
 *   location_mismatch   — GPS >100km from user's registered city
 *   amount_anomaly      — claim amount > 3× user's 30-day average
 *   device_fingerprint_risk — Incognia/IPQS risk score crosses threshold
 *
 * Score thresholds (total 0–100, additive with caps):
 *   CLEAR   : score < 30
 *   REVIEW  : 30 ≤ score < 70
 *   BLOCKED : score ≥ 70
 */

// ── Flag weights — sum is what drives the verdict ───────────────────────────
const WEIGHTS = Object.freeze({
  multi_account:           50,   // Duplicate device = high confidence fraud
  low_motion:              30,   // Sensor contradicts claim narrative
  rapid_claims:            20,
  repeat_trigger:          15,
  location_mismatch:       25,
  amount_anomaly:          15,
  device_fingerprint_risk: 40    // External fraud-intel provider (Incognia/IPQS)
})

const REVIEW_THRESHOLD  = 30
const BLOCKED_THRESHOLD = 70

// Triggers that REQUIRE outdoor activity — used by low_motion flag
const OUTDOOR_TRIGGERS = new Set([
  'severe_aqi', 'aqi', 'heavy_rain', 'extreme_rain', 'rain',
  'extreme_heat', 'cyclone'
])

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Haversine — km between two lat/lng points. Pure. */
function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v == null || !Number.isFinite(Number(v)))) return null
  const R = 6371
  const toRad = (d) => (Number(d) * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000)

// ── Mock device fingerprinting adapter ──────────────────────────────────────
// In production: swap this for the real Incognia or IPQS SDK call. For now,
// a deterministic mock based on deviceId length + a hash so tests are stable.
function mockDeviceFingerprintScore(deviceId) {
  if (!deviceId) return { riskScore: 0, provider: 'none', mock: true }
  const hash = [...deviceId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0)
  const riskScore = hash % 100
  return { riskScore, provider: 'mock-incognia', mock: true }
}

// ── Individual rule evaluators ──────────────────────────────────────────────

function checkMultiAccount(context) {
  const deviceUsers = context?.userDevices || []
  const shared = deviceUsers.find(d => Array.isArray(d.usedByUserIds) && d.usedByUserIds.length > 1)
  if (!shared) return null
  return {
    flag:   'multi_account',
    detail: `Device ${shared.deviceId} linked to ${shared.usedByUserIds.length} users`
  }
}

function checkLowMotion(claim, context) {
  if (!OUTDOOR_TRIGGERS.has((claim?.triggerType || '').toLowerCase())) return null
  const sensor = context?.activeSensorSnapshot
  if (!sensor) return null            // no sensor data → cannot validate
  if (sensor.motionDetected === false) {
    return {
      flag:   'low_motion',
      detail: `Accelerometer idle during ${claim.triggerType} (no movement detected in sample)`
    }
  }
  return null
}

function checkRapidClaims(context) {
  const claims24h = (context?.userClaims30d || []).filter(c => new Date(c.submittedAt) >= hoursAgo(24))
  if (claims24h.length >= 3) {
    return { flag: 'rapid_claims', detail: `${claims24h.length} claims in last 24h` }
  }
  return null
}

function checkRepeatTrigger(claim, context) {
  if (!claim?.triggerType) return null
  const recent = (context?.userClaims30d || []).filter(c =>
    c.id !== claim.id &&
    c.triggerType === claim.triggerType &&
    new Date(c.submittedAt) >= hoursAgo(48)
  )
  if (recent.length > 0) {
    return { flag: 'repeat_trigger', detail: `Same trigger (${claim.triggerType}) claimed ${recent.length}× in last 48h` }
  }
  return null
}

function checkLocationMismatch(claim, context) {
  const home = context?.userHomeCoords   // { lat, lng } optional
  const claimLat = claim?.latitude  ?? context?.claimLat
  const claimLng = claim?.longitude ?? context?.claimLng
  if (!home || claimLat == null || claimLng == null) return null
  const km = distanceKm(home.lat, home.lng, claimLat, claimLng)
  if (km == null || km < 100) return null
  return { flag: 'location_mismatch', detail: `Claim GPS ${km.toFixed(0)} km from registered city` }
}

function checkAmountAnomaly(claim, context) {
  const avg = Number(context?.userAvgClaimAmount || 0)
  const amt = Number(claim?.amount || 0)
  if (avg <= 0 || amt <= 0) return null
  if (amt > avg * 3) {
    return { flag: 'amount_anomaly', detail: `Amount ₹${amt} is ${(amt/avg).toFixed(1)}× user's 30-day average (₹${avg.toFixed(0)})` }
  }
  return null
}

function checkDeviceFingerprint(context) {
  const deviceId = context?.deviceId
  if (!deviceId) return null
  const fp = (context?.deviceFingerprint) || mockDeviceFingerprintScore(deviceId)
  if (fp.riskScore >= 60) {
    return {
      flag:   'device_fingerprint_risk',
      detail: `${fp.provider} risk score ${fp.riskScore}/100`
    }
  }
  return null
}

// ── Main entry ──────────────────────────────────────────────────────────────

/**
 * Evaluate a claim for fraud. PURE.
 *
 * @param {object} claim    Claim-like object. Required: triggerType, amount.
 *                          Optional: id, userId, latitude, longitude, submittedAt
 * @param {object} [context]
 * @param {Claim[]}  [context.userClaims30d]      recent claims (for rapid/repeat/amount)
 * @param {object[]} [context.userDevices]        [{ deviceId, usedByUserIds:[] }]
 * @param {object}   [context.activeSensorSnapshot] { motionDetected, accuracyM, source }
 * @param {object}   [context.userHomeCoords]    { lat, lng }
 * @param {number}   [context.userAvgClaimAmount]
 * @param {string}   [context.deviceId]
 * @param {object}   [context.deviceFingerprint] { riskScore, provider }
 * @returns {{ fraudScore:number, flags:string[], details:object[], status:'CLEAR'|'REVIEW'|'BLOCKED', weights:object }}
 */
function evaluateClaim(claim, context = {}) {
  if (!claim || typeof claim !== 'object') {
    throw new Error('evaluateClaim: claim is required')
  }

  const evaluators = [
    () => checkMultiAccount(context),
    () => checkLowMotion(claim, context),
    () => checkRapidClaims(context),
    () => checkRepeatTrigger(claim, context),
    () => checkLocationMismatch(claim, context),
    () => checkAmountAnomaly(claim, context),
    () => checkDeviceFingerprint(context)
  ]

  const hits = evaluators.map(fn => fn()).filter(Boolean)

  // Additive score, capped at 100
  let fraudScore = 0
  for (const h of hits) fraudScore += WEIGHTS[h.flag] || 0
  fraudScore = Math.min(100, fraudScore)

  let status
  if      (fraudScore >= BLOCKED_THRESHOLD) status = 'BLOCKED'
  else if (fraudScore >= REVIEW_THRESHOLD)  status = 'REVIEW'
  else                                      status = 'CLEAR'

  return {
    fraudScore,
    flags:   hits.map(h => h.flag),
    details: hits,
    status,
    weights: WEIGHTS
  }
}

module.exports = {
  evaluateClaim,
  distanceKm,
  mockDeviceFingerprintScore,
  WEIGHTS,
  THRESHOLDS: Object.freeze({ REVIEW_THRESHOLD, BLOCKED_THRESHOLD })
}
