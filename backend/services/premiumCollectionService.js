/**
 * premiumCollectionService.js
 * ---------------------------
 * Daily micro-deduction premium collection for gig workers.
 *
 * Workers earn daily; premiums are pulled from those earnings rather than
 * from monthly card charges. Flow for one worker per day:
 *
 *   1. Compute the daily slice: ceil(policy.premium / 7)
 *   2. Call the platform API (Zomato/Swiggy/etc.) to deduct from pending earnings
 *   3. On failure → fall back to UPI mandate (stub for now; Razorpay later)
 *   4. Record the outcome in PremiumCharge (the ledger), always — success or fail
 *   5. Refresh UserBalance materialized cache
 *
 * Idempotency: PremiumCharge has UNIQUE(user_id, policy_id, charge_date), so
 * even if the cron double-fires, we won't double-charge.
 *
 * Retry policy (see retryFailedCollections):
 *   - Rescan failed charges from the last 3 days
 *   - Retry each via the same pipeline (bumps retry_count)
 *   - If retry_count hits 3, suspend the policy (status = 'suspended')
 *
 * Records are written to PremiumCharge (authoritative ledger), NOT UserBalance.
 * UserBalance is a materialized cache of aggregates — it gets recomputed from
 * PremiumCharge via userBalanceService.recomputeForUser().
 */

const PremiumCharge = require('../models/PremiumCharge')
const Policy        = require('../models/Policy')
const User          = require('../models/User')
const platformApi   = require('./platformApi')
const { createNotification } = require('./notificationService')
const { recomputeForUser: recomputeBalance } = require('./userBalanceService')
const { Op } = require('sequelize')

const MAX_RETRIES = 3

class PremiumCollectionService {
  /**
   * @param {object} [deps]
   * @param {object} [deps.platformApi]   injectable for tests
   */
  constructor({ platformApi: platformApiDep = platformApi } = {}) {
    this.platformApi = platformApiDep
  }

  // ── Pure helpers ───────────────────────────────────────────────────────────

  /**
   * Daily premium slice. Rounds UP to the nearest rupee so total collected over
   * a week is ≥ the weekly premium (never under-collect).
   *
   *   weekly 245 → daily ceil(35) = 35  (total week: 245 ✓)
   *   weekly 250 → daily ceil(35.71) = 36  (total week: 252 — 2₹ over)
   */
  calculateDailyPremium(weeklyPremium) {
    const w = parseFloat(weeklyPremium)
    if (!Number.isFinite(w) || w <= 0) return 0
    return Math.ceil(w / 7)
  }

  /**
   * Today's date in YYYY-MM-DD (server local). Override point for tests.
   */
  dateKey(date = new Date()) {
    return date.toISOString().slice(0, 10)
  }

  // ── Platform call wrapper ──────────────────────────────────────────────────

  /**
   * Call the gig platform to deduct `amount` from the worker's pending earnings.
   * Keeps the service decoupled from the platform client.
   *
   * @returns {Promise<{success, transaction_id?, error?}>}
   */
  async callPlatformDeduction(platform, platformUserId, amount, reference) {
    try {
      return await this.platformApi.deductFromEarnings(platform, platformUserId, amount, reference)
    } catch (err) {
      return { success: false, error: err?.message || 'platformApi threw' }
    }
  }

  // ── UPI fallback (stub until Razorpay is wired) ────────────────────────────

  /**
   * Trigger UPI auto-pay mandate execution. Currently a stub that always fails
   * so retries get logged. When Razorpay is integrated, this is the only place
   * that needs a real implementation.
   *
   * Notifies the worker so they can take manual action if needed.
   */
  async fallbackUPICollection(userId, amount) {
    // TODO: Razorpay mandate execution
    //   - Look up user's stored mandate token
    //   - POST to Razorpay /subscriptions/mandate/execute
    //   - Return real { success, transaction_id } on success
    console.warn(`[premiumCollection] UPI fallback stub (user=${userId}, amount=${amount})`)

    // Fire-and-forget notification so the worker knows collection failed
    try {
      await createNotification({
        userId,
        type:    'payment_failed',
        title:   'Premium collection failed',
        message: `We couldn't deduct your ₹${amount} premium today. Please check your platform earnings balance.`,
        data:    { failedAmount: amount, reason: 'platform_api_failed' }
      })
    } catch (err) {
      console.error(`[premiumCollection] Notify failed:`, err.message)
    }

    return { success: false, error: 'UPI mandate execution not yet implemented (TODO: Razorpay)' }
  }

  // ── Main collection entry point ────────────────────────────────────────────

  /**
   * Collect today's premium from one user's active policy.
   *
   * @param {number} userId
   * @param {Date}   [date=new Date()]  which calendar day this charge covers
   * @returns {Promise<object>}  summary of the outcome
   */
  async collectDailyPremium(userId, date = new Date()) {
    const today = this.dateKey(date)

    // 1. Get user with active policy
    const user = await User.findByPk(userId)
    if (!user) {
      return { status: 'skipped', reason: 'user not found' }
    }

    const policy = await Policy.findOne({
      where: { userId, status: 'active' }
    })
    if (!policy) {
      return { status: 'skipped', reason: 'no active policy' }
    }

    // 2. Calculate daily premium
    const dailyPremium = this.calculateDailyPremium(policy.premium)
    if (dailyPremium <= 0) {
      return { status: 'skipped', reason: 'zero premium on policy' }
    }

    // Idempotency: check for an existing charge row for this user+policy+day
    const existing = await PremiumCharge.findOne({
      where: { user_id: userId, policy_id: policy.id, charge_date: today }
    })
    if (existing && existing.status === 'success') {
      return {
        status:    'already_charged',
        reference: existing.reference,
        amount:    Number(existing.amount)
      }
    }

    // Create or reuse a pending ledger row so the attempt is logged even on crash
    const charge = existing || await PremiumCharge.create({
      user_id:        userId,
      policy_id:      policy.id,
      amount:         dailyPremium,
      charge_date:    today,
      status:         'pending',
      payment_method: 'platform_earnings'
    })

    // 3. Call platform API
    const platformResult = await this.callPlatformDeduction(
      user.platform,
      user.platformId,
      dailyPremium,
      `pc_${charge.id}`          // our idempotency key
    )

    if (platformResult.success) {
      await charge.update({
        status:         'success',
        payment_method: 'platform_earnings',
        reference:      platformResult.transaction_id,
        error_message:  null,
        processed_at:   new Date()
      })
      await this._markPolicySuccess(policy, today)
      await this._refreshBalance(userId)
      return {
        status:    'success',
        method:    'platform_earnings',
        reference: platformResult.transaction_id,
        amount:    dailyPremium
      }
    }

    // 4. Fallback: UPI mandate
    const upiResult = await this.fallbackUPICollection(userId, dailyPremium)
    if (upiResult.success) {
      await charge.update({
        status:         'success',
        payment_method: 'upi',
        reference:      upiResult.transaction_id,
        error_message:  null,
        processed_at:   new Date()
      })
      await this._markPolicySuccess(policy, today)
      await this._refreshBalance(userId)
      return {
        status:    'success',
        method:    'upi',
        reference: upiResult.transaction_id,
        amount:    dailyPremium
      }
    }

    // 5. Both failed — record failure (retryFailedCollections will pick it up)
    await charge.update({
      status:        'failed',
      retry_count:   (charge.retry_count || 0) + 1,
      error_message: `platform: ${platformResult.error || 'unknown'} | upi: ${upiResult.error || 'unknown'}`.slice(0, 2000),
      processed_at:  new Date()
    })
    await this._markPolicyFailure(policy)
    return {
      status:      'failed',
      error:       platformResult.error || 'collection failed',
      amount:      dailyPremium,
      retryCount:  charge.retry_count + 1
    }
  }

  // ── Batch entry point (daily cron) ─────────────────────────────────────────

  /**
   * Process every user with an active policy for today.
   * Individual failures don't abort the whole run.
   *
   * @returns {Promise<{affectedCount, metadata}>}  shape expected by jobScheduler
   */
  async processDailyCollections(date = new Date()) {
    const policies = await Policy.findAll({
      where:      { status: 'active' },
      attributes: ['userId']
    })
    const userIds = [...new Set(policies.map(p => p.userId))]

    let succeeded = 0
    let failed    = 0
    let skipped   = 0

    for (const userId of userIds) {
      try {
        const r = await this.collectDailyPremium(userId, date)
        if (r.status === 'success' || r.status === 'already_charged') succeeded++
        else if (r.status === 'failed')                               failed++
        else                                                           skipped++
      } catch (err) {
        failed++
        console.error(`[premiumCollection] Unexpected error for user ${userId}:`, err.message)
      }
    }

    const result = { usersProcessed: userIds.length, succeeded, failed, skipped, date: this.dateKey(date) }
    console.log(`[premiumCollection] Collected premiums for ${succeeded} users, failed for ${failed} users (skipped ${skipped}, date ${result.date})`)

    return { affectedCount: succeeded, metadata: result }
  }

  // ── Retry + policy suspension ──────────────────────────────────────────────

  /**
   * Scan the last 3 days for failed charges and retry each one. After a charge
   * has failed `MAX_RETRIES` times, suspend the owning policy so the cron
   * stops hammering it — admin must reactivate manually.
   *
   * @returns {Promise<{affectedCount, metadata}>}
   */
  async retryFailedCollections() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    const failedCharges = await PremiumCharge.findAll({
      where: {
        status:       'failed',
        charge_date:  { [Op.gte]: threeDaysAgo.toISOString().slice(0, 10) }
      },
      order: [['charge_date', 'DESC']]
    })

    let retried        = 0
    let stillFailed    = 0
    let suspended      = 0
    const suspendedPolicyIds = new Set()

    for (const charge of failedCharges) {
      // Has this charge already hit the retry ceiling? Suspend the policy once,
      // then skip the retry attempt.
      if ((charge.retry_count || 0) >= MAX_RETRIES) {
        if (!suspendedPolicyIds.has(charge.policy_id)) {
          await this._suspendPolicy(charge.policy_id, charge.user_id)
          suspendedPolicyIds.add(charge.policy_id)
          suspended++
        }
        continue
      }

      // Try again through the normal pipeline. collectDailyPremium will
      // find the existing 'failed' row, reuse it, and re-attempt.
      try {
        const result = await this.collectDailyPremium(charge.user_id, new Date(charge.charge_date))
        if (result.status === 'success') retried++
        else                              stillFailed++
      } catch (err) {
        stillFailed++
        console.error(`[premiumCollection] Retry crashed for charge ${charge.id}:`, err.message)
      }
    }

    const result = {
      scanned:     failedCharges.length,
      recovered:   retried,
      stillFailed,
      suspended
    }
    console.log(`[premiumCollection] Retry run complete:`, result)

    return { affectedCount: retried, metadata: result }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  async _refreshBalance(userId) {
    try {
      await recomputeBalance(userId)
    } catch (err) {
      console.error(`[premiumCollection] Balance recompute failed for user ${userId}:`, err.message)
    }
  }

  /**
   * Flip the policy's money-health fields to reflect a successful collection.
   * Resets the consecutive-failure counter and updates the last-collection date.
   */
  async _markPolicySuccess(policy, todayStr) {
    try {
      await policy.update({
        last_premium_collection_date: todayStr,
        premium_collection_status:    'active',
        consecutive_failures:         0
      })
    } catch (err) {
      console.error(`[premiumCollection] _markPolicySuccess failed for policy ${policy?.id}:`, err.message)
    }
  }

  /**
   * Flip the policy's money-health fields to reflect a failed collection.
   * Increments the consecutive-failure counter. Actual suspension is handled
   * later by retryFailedCollections → _suspendPolicy once MAX_RETRIES is hit.
   */
  async _markPolicyFailure(policy) {
    try {
      await policy.update({
        consecutive_failures:      (policy.consecutive_failures || 0) + 1,
        premium_collection_status: 'failed_retry'
      })
    } catch (err) {
      console.error(`[premiumCollection] _markPolicyFailure failed for policy ${policy?.id}:`, err.message)
    }
  }

  async _suspendPolicy(policyId, userId) {
    try {
      const policy = await Policy.findByPk(policyId)
      if (!policy || policy.status === 'suspended') return

      await policy.update({
        status:                    'suspended',
        premium_collection_status: 'suspended'
      })
      console.warn(`[premiumCollection] SUSPENDED policy ${policyId} (user ${userId}) after ${MAX_RETRIES} failed attempts`)

      // Tell the worker — silent suspension is the worst UX
      try {
        await createNotification({
          userId,
          type:    'payment_failed',
          title:   'Policy suspended — premium collection failed',
          message: `We couldn't collect your premium after ${MAX_RETRIES} attempts. Your coverage is paused. Please update your payment method or contact support.`,
          data:    { policyId, reason: 'premium_collection_failed_max_retries' }
        })
      } catch (err) {
        console.error(`[premiumCollection] Suspension notify failed:`, err.message)
      }
    } catch (err) {
      console.error(`[premiumCollection] Failed to suspend policy ${policyId}:`, err.message)
    }
  }
}

// Singleton for production; class exported for testing
module.exports = new PremiumCollectionService()
module.exports.PremiumCollectionService = PremiumCollectionService
module.exports.MAX_RETRIES = MAX_RETRIES
