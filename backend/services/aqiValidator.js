/**
 * aqiValidator.js
 * ---------------
 * Pure, dependency-free consensus logic. Does NOT do I/O — takes a list of
 * readings (from dataSourceManager) and decides whether they agree.
 *
 * Consensus rules:
 *   - Compute median of successful readings.
 *   - A reading "agrees" if within ±TOLERANCE_PERCENT of the median.
 *   - Agreement levels:
 *       strong   — ≥2 agree AND no outliers
 *       weak     — ≥2 agree BUT some outliers exist
 *       conflict — <2 agree (no majority)
 *       none     — no successful readings at all
 *
 * Why median, not mean? One bad reading (API returning 0 or a stuck sensor
 * returning 500) would skew a mean drastically — median is robust to outliers.
 */

const TOLERANCE_PERCENT   = 0.20
const MIN_AGREEMENT_COUNT = 2
const SEVERE_AQI_THRESHOLD = 200   // CPCB "poor" threshold — used for validator.isSevere

const median = (arr) => {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * @param {Array<{source:string, tier:number, success:boolean, value:number, reading_type:string}>} readings
 * @returns {{
 *   agreement: 'strong'|'weak'|'conflict'|'none',
 *   consensus: number|null,
 *   median:    number|null,
 *   tolerancePercent: number,
 *   agreeing:  Array,
 *   outliers:  Array,
 *   successful: Array,
 *   failed:    Array,
 *   recommendReview: boolean
 * }}
 */
function compareReadings(readings = []) {
  const successful = readings.filter(r => r.success && Number.isFinite(r.value))
  const failed     = readings.filter(r => !r.success)

  if (successful.length === 0) {
    return {
      agreement: 'none', consensus: null, median: null,
      tolerancePercent: TOLERANCE_PERCENT,
      agreeing: [], outliers: [], successful, failed,
      recommendReview: true
    }
  }

  const values    = successful.map(r => Number(r.value))
  const med       = median(values)
  const tolerance = Math.max(med * TOLERANCE_PERCENT, 1)   // absolute floor of 1 prevents divide-near-zero

  const agreeing = successful.filter(r => Math.abs(r.value - med) <= tolerance)
  const outliers = successful.filter(r => !agreeing.includes(r))

  let agreement
  if (agreeing.length >= MIN_AGREEMENT_COUNT && outliers.length === 0)           agreement = 'strong'
  else if (agreeing.length >= MIN_AGREEMENT_COUNT)                               agreement = 'weak'
  else                                                                            agreement = 'conflict'

  // Consensus value = mean of agreeing readings (they're close by definition)
  const consensus = agreeing.length
    ? agreeing.reduce((s, r) => s + Number(r.value), 0) / agreeing.length
    : null

  return {
    agreement,
    consensus,
    median: med,
    tolerancePercent: TOLERANCE_PERCENT,
    agreeing,
    outliers,
    successful,
    failed,
    recommendReview: agreement === 'conflict' || agreement === 'none'
  }
}

/** Is the consensus reading above a severity trigger? Used to uphold/overturn. */
function isSevere(result, threshold = SEVERE_AQI_THRESHOLD) {
  return Number.isFinite(result?.consensus) && result.consensus >= threshold
}

module.exports = {
  compareReadings,
  isSevere,
  CONSTANTS: Object.freeze({ TOLERANCE_PERCENT, MIN_AGREEMENT_COUNT, SEVERE_AQI_THRESHOLD })
}
