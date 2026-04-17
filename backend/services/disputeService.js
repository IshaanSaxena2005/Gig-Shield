/**
 * disputeService.js
 * -----------------
 * Multi-source dispute resolution. Entry point = raiseDispute(claimId, reason).
 *
 * Flow (implements the spec's Section 2):
 *   1. Load the ORIGINAL trigger evidence (what fired the claim).
 *   2. Re-query all sources NOW — including Tier-3 (satellite) which is
 *      normally skipped for cost/speed.
 *   3. Run aqiValidator.compareReadings over (original + fresh).
 *   4. Decide:
 *        strong/weak agreement with trigger    → verdict: 'upheld'  (no claim change)
 *        conflict or no data                   → verdict: 'under_review'
 *                                                 (claim → status='under_review', admin alerted)
 *
 * Guardrails:
 *   - Idempotent-ish: disputing twice just re-runs the check; no side effects
 *     beyond appending new dispute_recheck evidence rows.
 *   - Failure of any individual source never throws — dataSourceManager
 *     swallows errors and surfaces them as success:false entries.
 */

const Claim             = require('../models/Claim')
const User              = require('../models/User')
const TriggerEvidence   = require('../models/TriggerEvidence')
const dsm               = require('./dataSourceManager')
const { compareReadings, isSevere } = require('./aqiValidator')
const { createNotification }        = require('./notificationService')

// Map claim triggerType → reading type expected by dataSourceManager
const TRIGGER_TO_READING = {
  heavy_rain:   'rain',
  extreme_rain: 'rain',
  rain:         'rain',
  severe_aqi:   'aqi',
  aqi:          'aqi',
  extreme_heat: 'rain',   // IMD / Open-Meteo carry temp in metadata
  cyclone:      'rain',
  curfew:       null      // non-weather trigger — can't data-validate
}

function inferReadingType(claim) {
  const t = (claim.triggerType || '').toLowerCase()
  return TRIGGER_TO_READING[t] || 'aqi'
}

function normalizeEvidence(row) {
  // Convert a TriggerEvidence row into the same shape aqiValidator expects
  return {
    source:       row.source,
    tier:         row.source_tier,
    success:      !!row.success,
    value:        row.reading_value != null ? Number(row.reading_value) : null,
    reading_type: row.reading_type,
    unit:         row.unit,
    location:     row.location,
    fetched_at:   row.fetched_at,
    latency_ms:   row.latency_ms,
    stage:        row.stage
  }
}

/**
 * Raise a dispute for a claim.
 *
 * @param {number} claimId
 * @param {string} reason          worker-supplied free-text reason
 * @param {object} [opts]
 * @param {number} [opts.raisedBy] userId raising the dispute (for audit)
 * @returns {Promise<{
 *   claimId: number,
 *   verdict: 'upheld'|'under_review',
 *   agreement: string,
 *   consensus: number|null,
 *   originalEvidence: Array,
 *   freshEvidence:    Array
 * }>}
 */
async function raiseDispute(claimId, reason, { raisedBy } = {}) {
  const claim = await Claim.findByPk(claimId)
  if (!claim) {
    const err = new Error('Claim not found')
    err.statusCode = 404
    throw err
  }

  const readingType = inferReadingType(claim)
  if (!readingType) {
    const err = new Error(`Trigger type '${claim.triggerType}' is not data-verifiable — manual review only`)
    err.statusCode = 422
    throw err
  }

  // Step 1 — original evidence
  const originalRows = await TriggerEvidence.findAll({
    where: { claim_id: claimId, stage: 'trigger' },
    raw:   true
  })
  const originalEvidence = originalRows.map(normalizeEvidence)

  // Step 2 — re-query all sources INCLUDING satellite
  const city = claim.location || claim.city || 'unknown'
  const freshReadings = await dsm.fetchWithFailover(readingType, city, {
    includeSatellite: true,
    forceAll:         true
  })
  const persistedFresh = await dsm.saveEvidence(claimId, 'dispute_recheck', freshReadings)
  const freshEvidence  = freshReadings.map(r => ({
    source: r.source, tier: r.tier, success: r.success, value: r.value,
    reading_type: r.reading_type, unit: r.unit, stage: 'dispute_recheck',
    fetched_at: new Date(), latency_ms: r.latency_ms
  }))

  // Step 3 — consensus over combined set
  const combined = [...originalEvidence, ...freshEvidence]
  const result   = compareReadings(combined)

  // Step 4 — verdict
  let verdict, nextStatus = null
  const upholdable = (result.agreement === 'strong' || result.agreement === 'weak') && isSevere(result)

  if (upholdable) {
    verdict = 'upheld'
  } else {
    verdict    = 'under_review'
    nextStatus = 'under_review'
  }

  // Step 5 — update claim + audit
  const appended = (claim.notes || '') +
    `\n[${new Date().toISOString()}] Dispute raised by userId=${raisedBy || '?'}: ${reason}` +
    `\n  → verdict=${verdict} agreement=${result.agreement} consensus=${result.consensus?.toFixed(2) ?? 'null'}`
  await claim.update({
    disputeReason: reason,
    notes:         appended.trim(),
    ...(nextStatus && { status: nextStatus })
  })

  // Step 6 — admin alert on under_review
  if (nextStatus === 'under_review') {
    try {
      const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id'] })
      await Promise.all(admins.map(a =>
        createNotification({
          userId:  a.id,
          type:    'audit_selected',
          title:   `Claim #${claimId} under review`,
          message: `Dispute raised — sources disagreed (${result.agreement}). Manual resolution needed.`,
          data:    { claimId, verdict, agreement: result.agreement, consensus: result.consensus }
        }).catch(() => null)
      ))
    } catch (err) {
      console.error('[disputeService] admin notify failed:', err.message)
    }
  }

  return {
    claimId,
    verdict,
    agreement:      result.agreement,
    consensus:      result.consensus,
    median:         result.median,
    tolerance:      result.tolerancePercent,
    agreeing:       result.agreeing.map(r => ({ source: r.source, value: r.value, stage: r.stage })),
    outliers:       result.outliers.map(r => ({ source: r.source, value: r.value, stage: r.stage })),
    originalEvidence,
    freshEvidence
  }
}

/** Read-only: returns the latest dispute evidence + verdict without mutating. */
async function getDisputeReport(claimId) {
  const claim = await Claim.findByPk(claimId)
  if (!claim) return null

  const allRows = await TriggerEvidence.findAll({
    where: { claim_id: claimId },
    order: [['fetched_at', 'ASC']],
    raw:   true
  })
  const normalized = allRows.map(normalizeEvidence)
  const result     = compareReadings(normalized)

  return {
    claimId,
    status:       claim.status,
    triggerType:  claim.triggerType,
    triggerValue: claim.triggerValue,
    agreement:    result.agreement,
    consensus:    result.consensus,
    evidenceByStage: {
      trigger:         normalized.filter(r => r.stage === 'trigger'),
      dispute_recheck: normalized.filter(r => r.stage === 'dispute_recheck')
    }
  }
}

module.exports = { raiseDispute, getDisputeReport, inferReadingType }
