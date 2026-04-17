/**
 * jobs/retryFailedPremiums.js
 * ---------------------------
 * Registry entry for the retry sweep of failed premium charges.
 *
 * Rescans the last 3 days of failed charges, retries each, and suspends
 * any policy that hits MAX_RETRIES. Scheduled every 6 hours via server.js.
 */

const premiumCollection = require('../services/premiumCollectionService')

module.exports = () => premiumCollection.retryFailedCollections()
