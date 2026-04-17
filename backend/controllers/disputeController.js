/**
 * disputeController.js
 * --------------------
 * HTTP layer over disputeService + trustFormatter.
 *
 * Endpoints (mounted at /api/claims):
 *   POST /:id/dispute    — raise a dispute, run multi-source recheck
 *   GET  /:id/trust      — return the full trust/audit report for a claim
 */

const Claim            = require('../models/Claim')
const TriggerEvidence  = require('../models/TriggerEvidence')
const disputeService   = require('../services/disputeService')
const { compareReadings } = require('../services/aqiValidator')
const { buildTrustReport } = require('../services/trustFormatter')

// POST /api/claims/:id/dispute   body: { reason }
exports.raiseDispute = async (req, res) => {
  try {
    const claimId = parseInt(req.params.id, 10)
    const reason  = (req.body?.reason || '').trim()
    if (!Number.isFinite(claimId) || claimId <= 0) {
      return res.status(400).json({ message: 'Invalid claim id' })
    }
    if (!reason) {
      return res.status(400).json({ message: 'reason is required' })
    }

    // Ownership check — worker can only dispute their own claims; admin can dispute any
    const claim = await Claim.findByPk(claimId)
    if (!claim) return res.status(404).json({ message: 'Claim not found' })
    if (req.user.role !== 'admin' && claim.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const result = await disputeService.raiseDispute(claimId, reason, { raisedBy: req.user.id })
    res.json(result)
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message })
    res.status(500).json({ message: error.message })
  }
}

// GET /api/claims/:id/trust
exports.getTrustReport = async (req, res) => {
  try {
    const claimId = parseInt(req.params.id, 10)
    if (!Number.isFinite(claimId) || claimId <= 0) {
      return res.status(400).json({ message: 'Invalid claim id' })
    }
    const claim = await Claim.findByPk(claimId)
    if (!claim) return res.status(404).json({ message: 'Claim not found' })
    if (req.user.role !== 'admin' && claim.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const evidenceRows = await TriggerEvidence.findAll({
      where: { claim_id: claimId },
      order: [['fetched_at', 'ASC']],
      raw:   true
    })

    const normalized = evidenceRows.map(r => ({
      source:      r.source,
      tier:        r.source_tier,
      success:     !!r.success,
      value:       r.reading_value != null ? Number(r.reading_value) : null,
      reading_type: r.reading_type,
      unit:        r.unit,
      stage:       r.stage
    }))
    const consensus = compareReadings(normalized)

    res.json(buildTrustReport(claim, evidenceRows, consensus))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
