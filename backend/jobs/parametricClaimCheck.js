/**
 * jobs/parametricClaimCheck.js
 * ----------------------------
 * Registry entry for the parametric claim check job.
 *
 * Exports the pure worker function (no audit wrapping) so jobScheduler can
 * look it up by name for manual retries of dead-letter runs.
 *
 * The scheduled/hourly execution still goes through:
 *   triggerService.processAutomaticClaims → jobScheduler.runJob(...)
 */

const { _doParametricClaimCheck } = require('../services/triggerService')

module.exports = _doParametricClaimCheck
