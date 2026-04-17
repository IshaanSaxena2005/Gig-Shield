/**
 * userBalanceService.js
 * ---------------------
 * Manages the materialized UserBalance cache.
 *
 * Public API:
 *   getOrCreate(userId)             — fetch row, create with zeros if missing
 *   recomputeForUser(userId)        — rebuild every field from the Claim/Policy tables
 *   recomputeAll()                  — rebuild for every user (cron-friendly)
 *   getBalance(userId)              — convenience: getOrCreate then return as plain object
 *
 * Recompute is the only writer that touches the row. Callers MUST NOT do
 * `userBalance.update({ total_payouts_received: ... })` directly — they'll
 * silently drift from the source-of-truth Claim table. Always call recompute.
 */

const UserBalance   = require('../models/UserBalance')
const Claim         = require('../models/Claim')
const PremiumCharge = require('../models/PremiumCharge')
const { fn, col }   = require('sequelize')

/**
 * Get the user's balance row, creating an empty one if needed.
 */
const getOrCreate = async (userId) => {
  const [row] = await UserBalance.findOrCreate({
    where:    { user_id: userId },
    defaults: {
      user_id:    userId,
      created_at: new Date(),
      updated_at: new Date()
    }
  })
  return row
}

/**
 * Rebuild every cached field for a single user from the Claim + Policy tables.
 * Idempotent — safe to call multiple times. Returns the updated row.
 */
const recomputeForUser = async (userId) => {
  // ── Aggregate over claims (single query, grouped by status/payout_status) ─
  const claimRows = await Claim.findAll({
    where:      { userId },
    attributes: [
      'status',
      'payout_status',
      [fn('COUNT', col('id')),     'count'],
      [fn('SUM',   col('amount')), 'total'],
      [fn('MAX',   col('processedAt')), 'last_processed']
    ],
    group: ['status', 'payout_status'],
    raw:   true
  })

  // ── Aggregate over premium_charges (authoritative ledger) ─────────────────
  // Only successful charges count. This is now exact — every daily deduction
  // is its own row in PremiumCharge, summed here.
  const premiumAgg = await PremiumCharge.findAll({
    where:      { user_id: userId, status: 'success' },
    attributes: [
      [fn('SUM', col('amount')),       'total_premium'],
      [fn('MAX', col('processed_at')), 'last_premium_at']
    ],
    raw: true
  })

  let totalPayouts   = 0
  let pendingPayout  = 0
  let disputedAmt    = 0
  let clawbackAmt    = 0
  let claimsCount    = 0
  let approvedCount  = 0
  let lastPayoutAt   = null

  for (const row of claimRows) {
    const count  = Number(row.count)  || 0
    const total  = Number(row.total)  || 0
    claimsCount += count

    if (row.status === 'approved')  approvedCount += count
    if (row.status === 'disputed')  disputedAmt   += total

    // Money status drives the cash columns
    switch (row.payout_status) {
      case 'disbursed':
        totalPayouts += total
        if (row.last_processed) {
          const t = new Date(row.last_processed)
          if (!lastPayoutAt || t > lastPayoutAt) lastPayoutAt = t
        }
        break
      case 'queued':
      case 'failed':
        pendingPayout += total
        break
      case 'clawed_back':
        clawbackAmt += total
        break
      // not_applicable — nothing to count
    }
  }

  const totalPremiums = Number(premiumAgg?.[0]?.total_premium) || 0
  const lastPremiumAt = premiumAgg?.[0]?.last_premium_at
    ? new Date(premiumAgg[0].last_premium_at)
    : null

  // ── Single write: rebuild the entire row ─────────────────────────────────
  const balance = await getOrCreate(userId)
  await balance.update({
    total_payouts_received: totalPayouts,
    total_premiums_paid:    totalPremiums,
    pending_payout_amount:  pendingPayout,
    disputed_amount:        disputedAmt,
    clawback_amount:        clawbackAmt,
    claims_count:           claimsCount,
    approved_claims_count:  approvedCount,
    last_payout_at:         lastPayoutAt,
    last_premium_at:        lastPremiumAt,
    updated_at:             new Date()
  })

  return balance
}

/**
 * Rebuild balances for every user. Cron-friendly (e.g. nightly self-heal).
 * Returns count of users processed.
 */
const recomputeAll = async () => {
  const users = await UserBalance.sequelize.query(
    'SELECT DISTINCT userId AS user_id FROM Claims',
    { type: UserBalance.sequelize.QueryTypes.SELECT }
  ).catch(() => [])

  let processed = 0
  for (const { user_id } of users) {
    if (!user_id) continue
    try {
      await recomputeForUser(user_id)
      processed++
    } catch (err) {
      console.error(`[userBalanceService] Failed to recompute for user ${user_id}:`, err.message)
    }
  }
  return { processed }
}

/**
 * Convenience: return the user's balance as a plain object (after ensuring it exists).
 * Use this from controllers where you just need the data, not the model instance.
 */
const getBalance = async (userId) => {
  const row = await getOrCreate(userId)
  return row.toJSON()
}

module.exports = {
  getOrCreate,
  recomputeForUser,
  recomputeAll,
  getBalance
}
