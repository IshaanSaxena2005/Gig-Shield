/**
 * edgeCaseHandler.js
 * ------------------
 * Pure utilities for the messy real-world claim scenarios:
 *
 *   A. Partial work hours        — prorate payout by hours worked
 *   B. Multi-app aggregation     — dedupe overlapping Zomato/Swiggy minutes
 *   C. Offline work submission   — validate photo-proof + monthly quota
 *
 * Every function is PURE (no DB, no network). Callers assemble inputs and
 * decide what to do with the result.
 */

// ── A. Partial work hours ───────────────────────────────────────────────────

const STANDARD_SHIFT_HOURS = 8
const MIN_REIMBURSABLE_HR  = 0.5      // less than 30 min → no payout

/**
 * Prorated payout for a partial shift.
 *   Claim = (hoursWorked / standardShift) × fullBenefit
 *
 * @param {number} hoursWorked
 * @param {number} fullBenefit        what the worker would get for a full shift
 * @param {object} [opts]
 * @param {number} [opts.standardShiftHours=8]
 * @param {number} [opts.minHours=0.5]
 * @returns {{ payout:number, proratedFraction:number, reason?:string, eligible:boolean }}
 */
function calculatePartialPayout(hoursWorked, fullBenefit, { standardShiftHours = STANDARD_SHIFT_HOURS, minHours = MIN_REIMBURSABLE_HR } = {}) {
  const h = Number(hoursWorked)
  const b = Number(fullBenefit)
  if (!Number.isFinite(h) || h < 0)  throw new Error('hoursWorked must be a non-negative number')
  if (!Number.isFinite(b) || b <= 0) throw new Error('fullBenefit must be a positive number')

  if (h < minHours) {
    return { payout: 0, proratedFraction: 0, eligible: false, reason: `Below minimum reimbursable duration (${minHours}h)` }
  }
  const cappedHours = Math.min(h, standardShiftHours)
  const fraction    = cappedHours / standardShiftHours
  return {
    payout:           Math.round(fraction * b),
    proratedFraction: parseFloat(fraction.toFixed(3)),
    eligible:         true,
    ...(h > standardShiftHours && { reason: `Hours capped at ${standardShiftHours}h shift` })
  }
}

// ── B. Multi-app aggregation (interval merge) ───────────────────────────────

/**
 * Merge overlapping [start, end) intervals across platforms.
 * Prevents double-counting a minute that appeared in both Zomato AND Swiggy.
 *
 * @param {Array<{ platform:string, start:Date|string|number, end:Date|string|number }>} sessions
 * @returns {{ totalMinutes:number, merged:Array<{start:Date, end:Date, platforms:string[]}>, perPlatformMinutes:object }}
 */
function aggregateMultiAppMinutes(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { totalMinutes: 0, merged: [], perPlatformMinutes: {} }
  }

  const normalized = sessions
    .map(s => ({
      platform: String(s.platform || 'unknown'),
      start:    new Date(s.start),
      end:      new Date(s.end)
    }))
    .filter(s => !isNaN(s.start) && !isNaN(s.end) && s.end > s.start)
    .sort((a, b) => a.start - b.start)

  if (normalized.length === 0) {
    return { totalMinutes: 0, merged: [], perPlatformMinutes: {} }
  }

  // Per-platform totals (raw, not dedup'd — useful for display)
  const perPlatformMinutes = {}
  for (const s of normalized) {
    const min = (s.end - s.start) / 60000
    perPlatformMinutes[s.platform] = (perPlatformMinutes[s.platform] || 0) + min
  }

  // Merge overlapping intervals
  const merged = []
  let cur = { start: normalized[0].start, end: normalized[0].end, platforms: new Set([normalized[0].platform]) }
  for (let i = 1; i < normalized.length; i++) {
    const s = normalized[i]
    if (s.start <= cur.end) {
      cur.end = s.end > cur.end ? s.end : cur.end
      cur.platforms.add(s.platform)
    } else {
      merged.push({ start: cur.start, end: cur.end, platforms: [...cur.platforms] })
      cur = { start: s.start, end: s.end, platforms: new Set([s.platform]) }
    }
  }
  merged.push({ start: cur.start, end: cur.end, platforms: [...cur.platforms] })

  const totalMinutes = merged.reduce((sum, m) => sum + (m.end - m.start) / 60000, 0)
  return {
    totalMinutes:       Math.round(totalMinutes),
    merged,
    perPlatformMinutes: Object.fromEntries(
      Object.entries(perPlatformMinutes).map(([k, v]) => [k, Math.round(v)])
    )
  }
}

/**
 * Enforce "one payout per day" — given a list of already-paid claim dates and
 * a proposed claim date, decide whether the new claim is blocked as duplicate.
 */
function isDuplicateDailyClaim(proposedDate, paidClaimDatesForDay = []) {
  const d = new Date(proposedDate)
  if (isNaN(d)) return { duplicate: false }
  const day = d.toISOString().slice(0, 10)
  const hit = paidClaimDatesForDay.find(x => new Date(x).toISOString().slice(0, 10) === day)
  return { duplicate: !!hit, duplicateOf: hit || null }
}

// ── C. Offline work submission validator ────────────────────────────────────

const MAX_OFFLINE_PER_MONTH      = 2
const EXCESSIVE_OFFLINE_IN_90D   = 5    // beyond this → flag for review

/**
 * Validate an offline work submission. Caller supplies the user's month-to-date
 * submission count and 90-day history; this returns a decision object.
 *
 * @param {object} input
 * @param {boolean} input.hasPhotoProof
 * @param {number}  input.submissionsThisMonth
 * @param {number}  [input.submissionsLast90Days]
 * @param {string}  [input.photoMimeType]       e.g. 'image/jpeg'
 * @param {number}  [input.photoSizeBytes]
 * @returns {{ allowed:boolean, flagged:boolean, reason?:string, remainingThisMonth:number }}
 */
function validateOfflineSubmission({
  hasPhotoProof,
  submissionsThisMonth = 0,
  submissionsLast90Days = 0,
  photoMimeType,
  photoSizeBytes
} = {}) {
  const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
  const MIN_BYTES    = 10_000       // 10KB — hedge against placeholder/transparent pixels
  const MAX_BYTES    = 5_000_000    // 5MB

  if (!hasPhotoProof) {
    return { allowed: false, flagged: false, reason: 'Photo proof (delivery receipt) is required.', remainingThisMonth: Math.max(0, MAX_OFFLINE_PER_MONTH - submissionsThisMonth) }
  }
  if (photoMimeType && !ALLOWED_MIME.includes(photoMimeType)) {
    return { allowed: false, flagged: false, reason: `Photo must be JPEG/PNG/WebP (got ${photoMimeType}).`, remainingThisMonth: Math.max(0, MAX_OFFLINE_PER_MONTH - submissionsThisMonth) }
  }
  if (photoSizeBytes != null && (photoSizeBytes < MIN_BYTES || photoSizeBytes > MAX_BYTES)) {
    return { allowed: false, flagged: false, reason: `Photo size must be ${MIN_BYTES}–${MAX_BYTES} bytes.`, remainingThisMonth: Math.max(0, MAX_OFFLINE_PER_MONTH - submissionsThisMonth) }
  }
  if (submissionsThisMonth >= MAX_OFFLINE_PER_MONTH) {
    return { allowed: false, flagged: true, reason: `Monthly quota reached (${MAX_OFFLINE_PER_MONTH} offline claims/month).`, remainingThisMonth: 0 }
  }

  const flagged = submissionsLast90Days >= EXCESSIVE_OFFLINE_IN_90D
  return {
    allowed:            true,
    flagged,
    remainingThisMonth: Math.max(0, MAX_OFFLINE_PER_MONTH - submissionsThisMonth - 1),
    ...(flagged && { reason: `Allowed, but flagged for review — ${submissionsLast90Days} offline claims in last 90 days` })
  }
}

module.exports = {
  calculatePartialPayout,
  aggregateMultiAppMinutes,
  isDuplicateDailyClaim,
  validateOfflineSubmission,
  CONSTANTS: Object.freeze({
    STANDARD_SHIFT_HOURS,
    MIN_REIMBURSABLE_HR,
    MAX_OFFLINE_PER_MONTH,
    EXCESSIVE_OFFLINE_IN_90D
  })
}
