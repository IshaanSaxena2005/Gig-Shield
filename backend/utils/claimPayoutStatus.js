/**
 * claimPayoutStatus.js
 * --------------------
 * PURE derivation of a claim's `payout_status` (money state) from its
 * lifecycle `status` and the current `payout_status`.
 *
 * No I/O, no mutation, no Sequelize dependency — so it's safely testable
 * without a database connection.
 *
 * Rules (single source of truth):
 *   • Sticky terminal states:
 *       payout_status='clawed_back' → stays 'clawed_back'
 *       payout_status='disbursed'   → stays 'disbursed'
 *         (unless a subsequent rejection causes a clawback — see below)
 *
 *   • Lifecycle-driven transitions:
 *       status='approved'                     → 'queued'
 *       status='rejected' AND was disbursed   → 'clawed_back' (post-payout fraud)
 *       status='rejected' AND not disbursed   → 'not_applicable'
 *       anything else (pending, flagged, disputed, pending_verification)
 *                                             → 'not_applicable'
 */

const VALID_STATUSES = Object.freeze([
  'pending',
  'pending_verification',
  'approved',
  'rejected',
  'flagged',
  'disputed'
])

const VALID_PAYOUT_STATUSES = Object.freeze([
  'not_applicable',
  'queued',
  'disbursed',
  'failed',
  'clawed_back'
])

/**
 * @param {object} input
 * @param {string} input.status          one of VALID_STATUSES
 * @param {string} input.payout_status   one of VALID_PAYOUT_STATUSES
 * @returns {string}  the correct payout_status for this claim
 */
const derivePayoutStatus = ({ status, payout_status } = {}) => {
  // 1. clawed_back is FULLY sticky — preserves audit trail that money was
  //    reversed. A subsequent rejection shouldn't downgrade to 'not_applicable'.
  if (payout_status === 'clawed_back') return 'clawed_back'

  // 2. Rejection can override the sticky 'disbursed' state (clawback path)
  //    before the generic sticky check fires.
  if (status === 'rejected') {
    return payout_status === 'disbursed' ? 'clawed_back' : 'not_applicable'
  }

  // 3. disbursed is sticky for everything OTHER than rejection
  if (payout_status === 'disbursed') return 'disbursed'

  // 4. Lifecycle-driven forward transitions
  if (status === 'approved') return 'queued'

  // 5. pending, pending_verification, flagged, disputed → money hasn't moved
  return 'not_applicable'
}

module.exports = {
  derivePayoutStatus,
  VALID_STATUSES,
  VALID_PAYOUT_STATUSES
}
