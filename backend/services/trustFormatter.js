/**
 * trustFormatter.js
 * -----------------
 * Converts raw TriggerEvidence rows + the parent Claim into a human-readable
 * explanation block surfaced in the worker's claim detail page.
 *
 * Goal: every claim carries its own "receipt" so the worker can see exactly
 * which sources fired the trigger, the reading values, timestamp, location,
 * and whether multiple sources agreed.
 *
 * PURE — no I/O. Takes data in, returns strings + a structured object.
 */

const SOURCE_LABEL = {
  cpcb:         'CPCB',
  imd:          'IMD',
  purpleair:    'PurpleAir',
  openmeteo:    'Open-Meteo',
  google_env:   'Google Env Insights',
  rider_survey: 'Rider survey'
}

const READING_LABEL = {
  aqi:         'AQI',
  rain:        'rainfall',
  temperature: 'temperature',
  wind:        'wind speed'
}

const UNIT_SUFFIX = {
  'US EPA': '',
  'mm/hr':  ' mm/hr',
  'C':      '°C',
  '°C':     '°C',
  'kmh':    ' km/h'
}

const sourceLabel  = (s) => SOURCE_LABEL[s]  || s
const readingLabel = (t) => READING_LABEL[t] || t
const unitSuffix   = (u) => UNIT_SUFFIX[u] ?? (u ? ` ${u}` : '')

const fmtValue = (v, unit) => {
  if (v == null) return 'n/a'
  const n = Number(v)
  if (!Number.isFinite(n)) return 'n/a'
  return `${Math.round(n * 100) / 100}${unitSuffix(unit)}`
}

const fmtWhen = (d) => {
  if (!d) return 'unknown time'
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * Build a single-line explanation suitable for claim cards.
 *
 * Examples:
 *   "Claim triggered due to AQI 312 at 3:00 PM in Chennai (CPCB verified).
 *    Also confirmed by PurpleAir (298)."
 *
 *   "Claim triggered due to rainfall 72 mm/hr at 7:42 AM in Mumbai (IMD verified)."
 */
function explainClaim(claim, evidence = []) {
  if (!claim?.triggerType) return 'No parametric trigger recorded for this claim.'

  const triggerRows = evidence.filter(e => e.stage === 'trigger' && e.success)
  if (triggerRows.length === 0) {
    return `Claim triggered by ${readingLabel(claim.triggerType)} (${claim.triggerValue || 'value unavailable'}). ` +
           `Source evidence is missing from the audit log.`
  }

  // Pick the highest-priority (lowest tier number) successful row as the primary
  const primary = [...triggerRows].sort((a, b) => (a.source_tier ?? 99) - (b.source_tier ?? 99))[0]
  const confirmers = triggerRows.filter(r => r.source !== primary.source)

  const readingType = primary.reading_type || claim.triggerType
  const location    = primary.location || claim.location || 'your area'

  const head = `Claim triggered due to ${readingLabel(readingType)} ${fmtValue(primary.reading_value, primary.unit)} ` +
               `at ${fmtWhen(primary.fetched_at)} in ${location} (${sourceLabel(primary.source)} verified).`

  const tail = confirmers.length
    ? ` Also confirmed by ${confirmers.map(c => `${sourceLabel(c.source)} (${fmtValue(c.reading_value, c.unit)})`).join(', ')}.`
    : ''

  return head + tail
}

/**
 * Build the full trust object the frontend can render (source list, timeline,
 * verdict, explanation line). This is what GET /api/claims/:id/trust returns.
 */
function buildTrustReport(claim, evidence = [], consensusResult = null) {
  const byStage = {
    trigger:         evidence.filter(e => e.stage === 'trigger'),
    dispute_recheck: evidence.filter(e => e.stage === 'dispute_recheck')
  }

  const sources = evidence.map(e => ({
    source:       e.source,
    label:        sourceLabel(e.source),
    tier:         e.source_tier,
    success:      e.success,
    value:        e.reading_value != null ? Number(e.reading_value) : null,
    unit:         e.unit,
    fetched_at:   e.fetched_at,
    latency_ms:   e.latency_ms,
    stage:        e.stage,
    error:        e.error || null
  }))

  return {
    claimId:     claim.id,
    status:      claim.status,
    triggerType: claim.triggerType,
    triggerValue: claim.triggerValue,
    location:    claim.location || null,
    explanation: explainClaim(claim, evidence),
    sources,
    byStage,
    consensus:   consensusResult ? {
      agreement:        consensusResult.agreement,
      value:            consensusResult.consensus,
      median:           consensusResult.median,
      tolerancePercent: consensusResult.tolerancePercent,
      recommendReview:  consensusResult.recommendReview
    } : null
  }
}

// ── Payout-logic explainers ─────────────────────────────────────────────────
// The goal of describePayoutLogic is to turn the abstract trigger + plan into
// a one-line rule the worker sees on their claim:
//   "Policy pays ₹100/hr above AQI 200, capped at ₹3,500/week"

const HOURLY_RATE_DEFAULT = 100   // ₹/hr — keep in sync with triggerService.HOURLY_RATE
const THRESHOLD_LABELS = {
  severe_aqi:   { type: 'aqi',         threshold: 200, unit: '',       name: 'AQI' },
  aqi:          { type: 'aqi',         threshold: 200, unit: '',       name: 'AQI' },
  heavy_rain:   { type: 'rain',        threshold: 50,  unit: 'mm/3hr', name: 'rainfall' },
  extreme_rain: { type: 'rain',        threshold: 50,  unit: 'mm/3hr', name: 'rainfall' },
  extreme_heat: { type: 'temperature', threshold: 42,  unit: '°C',     name: 'temperature' },
  cyclone:      { type: 'wind',        threshold: 0,   unit: '',       name: 'state red alert' },
  curfew:       { type: 'event',       threshold: 0,   unit: '',       name: 'curfew / strike' }
}

/**
 * Describe the policy's payout rule for the claim's trigger type.
 * PURE — takes only the data it needs.
 *
 * @param {object} policy    { type, coverage } — Basic/Standard/Pro + weekly cap
 * @param {string} triggerType
 * @param {number} [hourlyRate=100]
 * @returns {string}
 */
function describePayoutLogic(policy, triggerType, hourlyRate = HOURLY_RATE_DEFAULT) {
  const rule = THRESHOLD_LABELS[(triggerType || '').toLowerCase()]
  const cap  = policy?.coverage ? `, capped at ₹${Number(policy.coverage).toLocaleString('en-IN')}/week` : ''
  if (!rule) return `Policy pays parametric benefits per plan terms${cap}.`
  if (rule.threshold === 0) {
    return `Policy pays ₹${hourlyRate}/hr during a ${rule.name}${cap}.`
  }
  return `Policy pays ₹${hourlyRate}/hr above ${rule.name} ${rule.threshold}${rule.unit ? ' ' + rule.unit : ''}${cap}.`
}

const fmtGps = (lat, lng) => {
  if (lat == null || lng == null) return null
  const latStr = `${Math.abs(Number(lat)).toFixed(4)}°${Number(lat) >= 0 ? 'N' : 'S'}`
  const lngStr = `${Math.abs(Number(lng)).toFixed(4)}°${Number(lng) >= 0 ? 'E' : 'W'}`
  return `${latStr}, ${lngStr}`
}

/**
 * Expanded explainer that matches the spec format:
 *   "On Jan 15 at 10:32 AM, your GPS (12.9716°N, 77.5946°E) matched AQI = 312
 *    (source: CPCB). Policy pays ₹100/hr above AQI 200."
 *
 * Falls back gracefully if GPS or policy is missing.
 */
function explainClaimWithPayout(claim, evidence = [], policy = null) {
  if (!claim?.triggerType) return 'No parametric trigger recorded for this claim.'

  const triggerRows = evidence.filter(e => e.stage === 'trigger' && e.success)
  const primary = triggerRows.length
    ? [...triggerRows].sort((a, b) => (a.source_tier ?? 99) - (b.source_tier ?? 99))[0]
    : null

  const when = fmtWhen(primary?.fetched_at || claim.submittedAt || claim.createdAt)
  const gps  = fmtGps(primary?.latitude ?? claim.latitude, primary?.longitude ?? claim.longitude)
  const gpsClause = gps ? `your GPS (${gps}) ` : ''

  const readingType = primary?.reading_type || claim.triggerType
  const readingStr  = primary
    ? `${readingLabel(readingType)} = ${fmtValue(primary.reading_value, primary.unit)}`
    : `${readingLabel(readingType)} (${claim.triggerValue || 'value unavailable'})`

  const srcStr = primary ? ` (source: ${sourceLabel(primary.source)})` : ''
  const rule   = describePayoutLogic(policy, claim.triggerType)

  return `On ${when}, ${gpsClause}matched ${readingStr}${srcStr}. ${rule}`
}

/**
 * Structured payout breakdown for the UI to render as rows.
 * Lets the frontend explain the math, not just the trigger.
 */
function buildPayoutBreakdown(claim, policy, { hourlyRate = HOURLY_RATE_DEFAULT, hoursLost = null } = {}) {
  const amount = claim?.amount != null ? Number(claim.amount) : null
  const cap    = policy?.coverage != null ? Number(policy.coverage) : null

  const rows = []
  if (hoursLost != null) rows.push({ label: 'Hours of work lost',    value: `${hoursLost} hr` })
  rows.push({ label: 'Hourly rate',           value: `₹${hourlyRate}` })
  if (hoursLost != null) rows.push({ label: 'Calculated payout',     value: `₹${Math.round(hoursLost * hourlyRate)}` })
  if (cap != null)       rows.push({ label: 'Weekly cap (plan)',     value: `₹${cap.toLocaleString('en-IN')}` })
  if (amount != null)    rows.push({ label: 'Final paid out',        value: `₹${amount.toLocaleString('en-IN')}`, highlight: true })

  return {
    rule:   describePayoutLogic(policy, claim?.triggerType, hourlyRate),
    rows,
    capApplied: amount != null && cap != null && amount < (hoursLost * hourlyRate)
  }
}

module.exports = {
  explainClaim,
  explainClaimWithPayout,
  describePayoutLogic,
  buildPayoutBreakdown,
  buildTrustReport,
  sourceLabel,
  readingLabel
}
