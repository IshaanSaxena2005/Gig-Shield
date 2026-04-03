/**
 * aiService.js
 * ------------
 * Bridge between the Node.js backend and the Python Flask AI engine.
 * Falls back gracefully if the AI engine is not running.
 *
 * AI engine runs on: http://localhost:5002 (or AI_ENGINE_URL in .env)
 */

const axios = require('axios')

const AI_URL     = process.env.AI_ENGINE_URL || 'http://localhost:5002'
const AI_TIMEOUT = 3000  // 3 second timeout — don't block the main request

// Cache last-known engine status to avoid hammering a down service
let engineAvailable = null
let lastCheck       = 0
const CHECK_INTERVAL = 60 * 1000  // recheck every 60s

const checkEngineHealth = async () => {
  const now = Date.now()
  if (now - lastCheck < CHECK_INTERVAL && engineAvailable !== null) {
    return engineAvailable
  }
  try {
    await axios.get(`${AI_URL}/health`, { timeout: 1500 })
    engineAvailable = true
  } catch {
    engineAvailable = false
  }
  lastCheck = now
  return engineAvailable
}

/**
 * getPredictedRiskScore
 * Calls the Flask /predict-risk endpoint.
 * Returns a score 0.0–1.0. Falls back to rule-based heuristic if engine is down.
 */
const getPredictedRiskScore = async (location, rainfall, temperature) => {
  try {
    const isUp = await checkEngineHealth()
    if (!isUp) {
      console.warn('[aiService] AI engine not available — using JS fallback')
      return fallbackRiskScore(location, rainfall, temperature)
    }

    const response = await axios.post(
      `${AI_URL}/predict-risk`,
      { location, rainfall, temperature },
      { timeout: AI_TIMEOUT }
    )
    return response.data.risk_score
  } catch (error) {
    console.warn('[aiService] predict-risk failed:', error.message, '— using fallback')
    return fallbackRiskScore(location, rainfall, temperature)
  }
}

/**
 * detectFraudAI
 * Calls the Flask /detect-fraud endpoint.
 * Falls back to the JS fraudDetection service if engine is down.
 */
const detectFraudAI = async (amount, policyCoverage, claimCount30Days) => {
  try {
    const isUp = await checkEngineHealth()
    if (!isUp) {
      console.warn('[aiService] AI engine not available — using JS fraud service')
      return null  // caller falls back to fraudDetection.js
    }

    const response = await axios.post(
      `${AI_URL}/detect-fraud`,
      { amount, policyCoverage, claimCount30Days },
      { timeout: AI_TIMEOUT }
    )
    return response.data  // { isFraudulent, riskScore, reasons }
  } catch (error) {
    console.warn('[aiService] detect-fraud failed:', error.message)
    return null
  }
}

// JS fallback matches Python rule-based heuristic in risk_prediction.py
const CITY_BASE_RISK = {
  chennai: 0.75, mumbai: 0.72, delhi: 0.65, kolkata: 0.68,
  hyderabad: 0.55, bengaluru: 0.50, pune: 0.45, ahmedabad: 0.52,
}
const fallbackRiskScore = (location, rainfall, temperature) => {
  const city     = (location || '').toLowerCase().split(',')[0].trim()
  const base     = CITY_BASE_RISK[city] ?? 0.50
  const rainFact = Math.min(rainfall / 100, 1.0) * 0.3
  const heatFact = Math.max(0, (temperature - 35) / 15) * 0.2
  return Math.min(parseFloat((base + rainFact + heatFact).toFixed(3)), 1.0)
}

module.exports = { getPredictedRiskScore, detectFraudAI }
