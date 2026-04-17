/**
 * jobs/dailyPremiumCollection.js
 * ------------------------------
 * Registry entry for the daily premium micro-deduction job.
 *
 * Exports the pure worker function (bound to the service singleton) so
 * jobScheduler can look it up by name for manual retries of dead-letter runs.
 *
 * Scheduled daily at 6 AM via server.js.
 */

const premiumCollection = require('../services/premiumCollectionService')

module.exports = () => premiumCollection.processDailyCollections()
