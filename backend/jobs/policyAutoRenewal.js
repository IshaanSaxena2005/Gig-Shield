/**
 * jobs/policyAutoRenewal.js
 * -------------------------
 * Registry entry for the policy auto-renewal job.
 *
 * Exports the pure worker function so jobScheduler can look it up by name
 * when an admin manually retries a dead-letter run.
 */

const { _doRenewal } = require('../services/policyRenewalService')

module.exports = _doRenewal
