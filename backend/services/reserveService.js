/**
 * reserveService.js
 * -----------------
 * Solvency + reserve management for GigShield. Owns all writes to the
 * `reserves` ledger and exposes the solvency ratio used to gate payouts
 * and new policy sales.
 *
 * Key invariants:
 *   - All writes are LEDGER ENTRIES — no UPDATE of existing rows.
 *     Idempotency lives in UNIQUE(reserve_type, reference).
 *   - allocateToClaim + releaseClaimReserve are transactional (atomic
 *     double-entry: -X from liquidity, +X on claims_pending).
 *   - Solvency = (liquidity + reinsurance) / (claims_pending * 1.2).
 *     The 1.2 factor is the regulatory safety margin — keeps us above
 *     1.0 even when claims_pending swings upward mid-cycle.
 *
 * Gating thresholds (used by the 2 AM health job):
 *   ratio < 0.8  →  admin alert (reserve_low)
 *   ratio < 0.6  →  policy sales auto-halted + critical alert (reserve_critical)
 *   ratio < 1.0  →  individual payouts blocked (checkBeforePayout throws)
 */

const { fn, col, Op } = require('sequelize')
const { sequelize }   = require('../config/db')
const Reserve         = require('../models/Reserve')
const User            = require('../models/User')
const { createNotification } = require('./notificationService')

const SAFETY_MARGIN       = 1.2
const PAYOUT_MIN_RATIO    = 1.0
const LOW_ALERT_RATIO     = 0.8
const CRITICAL_RATIO      = 0.6
const NO_OBLIGATIONS      = Number.POSITIVE_INFINITY

class ReserveService {
  // ── Pool math ─────────────────────────────────────────────────────────────

  /** Net pool for a reserve_type: SUM(amount). Returns a Number. */
  async _poolSum(reserveType, { transaction } = {}) {
    const result = await Reserve.findOne({
      attributes: [[fn('SUM', col('amount')), 'total']],
      where:      { reserve_type: reserveType },
      raw:        true,
      transaction
    })
    return parseFloat(result?.total) || 0
  }

  /**
   * Current solvency ratio.
   * Formula: (liquidity + reinsurance) / (claims_pending * SAFETY_MARGIN)
   * Returns Infinity when there are no outstanding claims (healthy).
   */
  async getSolvencyRatio({ transaction } = {}) {
    const [liquidity, reinsurance, claimsPending] = await Promise.all([
      this._poolSum('liquidity',      { transaction }),
      this._poolSum('reinsurance',    { transaction }),
      this._poolSum('claims_pending', { transaction })
    ])

    const denom = claimsPending * SAFETY_MARGIN
    if (denom <= 0) return NO_OBLIGATIONS
    return (liquidity + reinsurance) / denom
  }

  /** Full breakdown for admin dashboards + health job logs. */
  async getSolvencySnapshot() {
    const [liquidity, reinsurance, claimsPending, operational] = await Promise.all([
      this._poolSum('liquidity'),
      this._poolSum('reinsurance'),
      this._poolSum('claims_pending'),
      this._poolSum('operational')
    ])
    const denom = claimsPending * SAFETY_MARGIN
    const ratio = denom <= 0 ? NO_OBLIGATIONS : (liquidity + reinsurance) / denom
    return { liquidity, reinsurance, claimsPending, operational, ratio, safetyMargin: SAFETY_MARGIN }
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  /**
   * Create a reserve ledger entry. Idempotent via UNIQUE(reserve_type, reference).
   * If a row with the same (type, reference) already exists, returns it instead
   * of inserting — callers can safely retry.
   *
   * @param {string} type                   reserve_type enum value
   * @param {number} amount                 signed; positive = deposit, negative = deduction
   * @param {object} [opts]
   * @param {string} [opts.reference]       idempotency key — REQUIRED for safe retries
   * @param {number} [opts.claimId]         allocated_to_claim_id
   * @param {Date}   [opts.expiresAt]
   * @param {object} [opts.metadata={}]
   * @param {object} [opts.transaction]     sequelize txn (optional)
   */
  async createReserve(type, amount, {
    reference = null,
    claimId   = null,
    expiresAt = null,
    metadata  = {},
    transaction
  } = {}) {
    if (!type)                      throw new Error('reserve_type is required')
    if (!Number.isFinite(amount))   throw new Error('amount must be a finite number')
    if (amount === 0)               throw new Error('amount must be non-zero')

    // Idempotency guard: look up first when a reference is given
    if (reference) {
      const existing = await Reserve.findOne({
        where: { reserve_type: type, reference },
        transaction
      })
      if (existing) return existing
    }

    return Reserve.create({
      reserve_type:          type,
      amount,
      reference,
      allocated_to_claim_id: claimId,
      expires_at:            expiresAt,
      metadata
    }, { transaction })
  }

  /**
   * Atomically allocate `amount` from liquidity to claims_pending for this claim.
   * Double-entry: -X on liquidity, +X on claims_pending. Both rows share the
   * reference `alloc-claim-<id>` so a retry is a no-op.
   */
  async allocateToClaim(claimId, amount) {
    if (!claimId)                   throw new Error('claimId is required')
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('amount must be positive')

    const reference = `alloc-claim-${claimId}`

    return sequelize.transaction(async (t) => {
      await this.createReserve('liquidity', -amount, {
        reference, claimId, metadata: { operation: 'claim_allocation', claimId }, transaction: t
      })
      await this.createReserve('claims_pending', amount, {
        reference, claimId, metadata: { operation: 'claim_allocation', claimId }, transaction: t
      })
      return { claimId, amount, reference }
    })
  }

  /**
   * Release the claim's pending reserve after payout has been disbursed.
   * Writes a -X entry on claims_pending (the liquidity was already spent
   * at allocation time, so nothing moves back into liquidity).
   */
  async releaseClaimReserve(claimId) {
    if (!claimId) throw new Error('claimId is required')

    // Find the active allocation for this claim
    const allocation = await Reserve.findOne({
      where: {
        reserve_type:          'claims_pending',
        allocated_to_claim_id: claimId,
        reference:             `alloc-claim-${claimId}`,
        amount:                { [Op.gt]: 0 }
      }
    })
    if (!allocation) {
      throw new Error(`No active claim allocation found for claimId=${claimId}`)
    }

    return this.createReserve('claims_pending', -parseFloat(allocation.amount), {
      reference: `release-claim-${claimId}`,
      claimId,
      metadata:  { operation: 'claim_release', claimId }
    })
  }

  // ── Gates ─────────────────────────────────────────────────────────────────

  /**
   * Block a payout if reserves can't cover it.
   * Throws with a structured error; caller flips the claim to
   * `halted_insufficient_reserves` and notifies admins.
   *
   * We check the *prospective* ratio (after this payout would leave liquidity)
   * — not just the current one — so we refuse a payout that would drop us
   * below the floor, even if we're currently above it.
   */
  async checkBeforePayout(claimAmount) {
    if (!Number.isFinite(claimAmount) || claimAmount <= 0) {
      throw new Error('claimAmount must be positive')
    }

    const snap = await this.getSolvencySnapshot()
    const prospectiveLiquidity = snap.liquidity - claimAmount
    const denom = snap.claimsPending * SAFETY_MARGIN
    const prospective = denom <= 0
      ? NO_OBLIGATIONS
      : (prospectiveLiquidity + snap.reinsurance) / denom

    if (snap.ratio < PAYOUT_MIN_RATIO || prospective < PAYOUT_MIN_RATIO) {
      const err = new Error(
        `Payout blocked: solvency ratio ${snap.ratio.toFixed(3)} ` +
        `(prospective ${prospective.toFixed(3)}) below minimum ${PAYOUT_MIN_RATIO}`
      )
      err.code            = 'INSUFFICIENT_RESERVES'
      err.statusCode      = 503
      err.currentRatio    = snap.ratio
      err.prospectiveRatio = prospective
      throw err
    }
    return { ok: true, ratio: snap.ratio, prospective }
  }

  /** Sync check for the policy-creation hot path. Throws if sales are halted. */
  async checkBeforeNewPolicy() {
    const ratio = await this.getSolvencyRatio()
    if (ratio < CRITICAL_RATIO) {
      const err = new Error(
        `New policy sales are temporarily suspended — reserve solvency is ` +
        `critically low (${ratio.toFixed(3)} < ${CRITICAL_RATIO}). Please try again later.`
      )
      err.code       = 'POLICY_SALES_HALTED'
      err.statusCode = 503
      err.ratio      = ratio
      throw err
    }
    return { ok: true, ratio }
  }

  // ── Admin alert helpers (used by the health job) ─────────────────────────

  /** Fan-out a notification to every admin user. */
  async _alertAdmins(type, title, message, data = {}) {
    const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id'] })
    if (!admins.length) {
      console.warn('[reserveService] No admin users to alert — notification skipped')
      return
    }
    await Promise.all(admins.map(a =>
      createNotification({ userId: a.id, type, title, message, data }).catch(err => {
        console.error(`[reserveService] Failed to notify admin id=${a.id}:`, err.message)
      })
    ))
    // SMS stub — wire Twilio/MSG91 here when ready
    console.warn(`[SMS-STUB] [${type}] ${title} — ${message}`)
  }

  async alertReserveLow(snapshot) {
    return this._alertAdmins(
      'reserve_low',
      'Reserve solvency low',
      `Solvency ratio ${snapshot.ratio.toFixed(3)} is below ${LOW_ALERT_RATIO}. ` +
      `Liquidity ₹${snapshot.liquidity.toLocaleString('en-IN')}, ` +
      `claims pending ₹${snapshot.claimsPending.toLocaleString('en-IN')}.`,
      { ...snapshot, threshold: LOW_ALERT_RATIO }
    )
  }

  async alertReserveCritical(snapshot) {
    return this._alertAdmins(
      'reserve_critical',
      'URGENT: Reserves critical — new policy sales halted',
      `Solvency ratio ${snapshot.ratio.toFixed(3)} is below ${CRITICAL_RATIO}. ` +
      `New policy sales are now auto-suspended. Top up liquidity reserves immediately.`,
      { ...snapshot, threshold: CRITICAL_RATIO, action: 'policy_sales_halted' }
    )
  }
}

const reserveService = new ReserveService()

module.exports = reserveService
module.exports.ReserveService = ReserveService
module.exports.THRESHOLDS = Object.freeze({
  PAYOUT_MIN_RATIO,
  LOW_ALERT_RATIO,
  CRITICAL_RATIO,
  SAFETY_MARGIN
})
