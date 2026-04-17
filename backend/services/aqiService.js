/**
 * aqiService.js
 * -------------
 * DEPRECATED: AQI fetching has moved into weatherService.js for unified
 * caching, retry, and circuit-breaker behaviour.
 *
 * This file now re-exports from weatherService for backward compatibility.
 */

const { getAQIData } = require('./weatherService')

module.exports = { getAQIData }
