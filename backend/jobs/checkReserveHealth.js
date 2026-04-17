/**
 * jobs/checkReserveHealth.js
 * --------------------------
 * Daily solvency monitor. Runs at 2 AM via server.js, wrapped in
 * jobScheduler.runJob so it gets audit logging + retry + dead-letter
 * handling like the other background jobs.
 *
 * Thresholds (from reserveService.THRESHOLDS):
 *   ratio < 0.8  →  reserve_low alert to admins
 *   ratio < 0.6  →  reserve_critical alert; new policy sales auto-halt
 *                   (enforced live in policyController via checkBeforeNewPolicy)
 *
 * NOTE: The "halt" is not a persistent flag — it's re-derived from the
 * solvency ratio on every policy-creation call. This avoids stale state
 * if reserves get topped up between the nightly check and the next sale.
 */

const reserveService = require('../services/reserveService')
const { THRESHOLDS } = reserveService

module.exports = async () => {
  const snap = await reserveService.getSolvencySnapshot()

  const ratioStr = Number.isFinite(snap.ratio) ? snap.ratio.toFixed(3) : '∞ (no obligations)'
  console.log(
    `[reserveHealth] solvency=${ratioStr} ` +
    `liquidity=₹${snap.liquidity.toLocaleString('en-IN')} ` +
    `reinsurance=₹${snap.reinsurance.toLocaleString('en-IN')} ` +
    `claims_pending=₹${snap.claimsPending.toLocaleString('en-IN')} ` +
    `safety_margin=${snap.safetyMargin}`
  )

  if (snap.ratio < THRESHOLDS.CRITICAL_RATIO) {
    console.error(`[reserveHealth] CRITICAL — solvency ${ratioStr} < ${THRESHOLDS.CRITICAL_RATIO}. Policy sales auto-halted.`)
    await reserveService.alertReserveCritical(snap)
    return {
      status:           'critical',
      ratio:            snap.ratio,
      policySalesHalted: true,
      snapshot:         snap
    }
  }

  if (snap.ratio < THRESHOLDS.LOW_ALERT_RATIO) {
    console.warn(`[reserveHealth] LOW — solvency ${ratioStr} < ${THRESHOLDS.LOW_ALERT_RATIO}`)
    await reserveService.alertReserveLow(snap)
    return { status: 'low', ratio: snap.ratio, snapshot: snap }
  }

  return { status: 'ok', ratio: snap.ratio, snapshot: snap }
}
