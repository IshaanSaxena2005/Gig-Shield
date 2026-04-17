const axios = require('axios')

const aiClient = axios.create({
  baseURL: process.env.AI_ENGINE_URL || `http://localhost:${process.env.AI_ENGINE_PORT || 5002}`,
  timeout: 3000
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// ── Circuit breaker for AI engine ────────────────────────────────────────────
// After 3 consecutive failures, skip AI calls for 60s (avoids piling up timeouts)
const circuitBreaker = {
  failures:    0,
  maxFailures: 3,
  cooldownMs:  60 * 1000,
  openedAt:    null,

  recordFailure() {
    this.failures++
    if (this.failures >= this.maxFailures) {
      this.openedAt = Date.now()
      console.warn(`[mlService] Circuit breaker OPEN — skipping AI engine for ${this.cooldownMs / 1000}s`)
    }
  },

  recordSuccess() {
    if (this.failures > 0) {
      this.failures = 0
      this.openedAt = null
    }
  },

  isOpen() {
    if (this.openedAt && Date.now() - this.openedAt > this.cooldownMs) {
      // Cooldown expired — half-open, allow one attempt
      this.failures = this.maxFailures - 1
      this.openedAt = null
      return false
    }
    return this.failures >= this.maxFailures
  }
}

const fallbackRiskAssessment = ({ rainfall = 0, temperature = 0, riskLevel = 'medium' }) => {
  const normalizedRisk = String(riskLevel).toLowerCase()
  const locationBoost = normalizedRisk === 'high' ? 0.18 : normalizedRisk === 'medium' ? 0.1 : 0.04
  const weatherBoost = clamp((Number(rainfall) / 30) + Math.max(Number(temperature) - 32, 0) / 25, 0, 0.75)
  return clamp(0.12 + locationBoost + weatherBoost, 0.05, 0.98)
}

const fallbackFraudAssessment = ({
  amount = 0, policyCoverage = 0, claimCount30Days = 0,
  accountAgeDays = 365, triggerTypeSame7Days = 0, claimHour = 12
}) => {
  let riskScore = 12
  const reasons = []

  if (claimCount30Days > 2) {
    riskScore += 22
    reasons.push(`Unusual claim frequency: ${claimCount30Days} claims in 30 days`)
  }

  if (policyCoverage > 0 && Number(amount) > Number(policyCoverage) * 0.75) {
    riskScore += 28
    reasons.push('Claim amount is unusually high for the selected coverage')
  }

  // New account scrutiny
  if (accountAgeDays < 7) {
    riskScore += 15
    reasons.push(`New account: only ${accountAgeDays} day(s) old`)
  }

  // Same trigger type repeated in 7 days
  if (triggerTypeSame7Days >= 2) {
    riskScore += 12
    reasons.push(`Trigger repetition: ${triggerTypeSame7Days} same-type claims in 7 days`)
  }

  // Late-night filing anomaly
  if (claimHour >= 1 && claimHour <= 5) {
    riskScore += 10
    reasons.push(`Unusual filing time: submitted at ${claimHour}:00`)
  }

  return {
    isFraudulent: riskScore >= 55,
    riskScore,
    reasons,
    signalsChecked: 5
  }
}

const getRiskAssessment = async ({ location, rainfall, temperature, riskLevel }) => {
  if (!circuitBreaker.isOpen()) {
    try {
      const response = await aiClient.post('/predict-risk', {
        location,
        rainfall,
        temperature
      })

      const rawScore = Number(response.data?.risk_score)
      if (Number.isFinite(rawScore)) {
        circuitBreaker.recordSuccess()
        return clamp(rawScore, 0.05, 0.98)
      }
    } catch (error) {
      circuitBreaker.recordFailure()
      console.warn('[mlService] AI risk service unavailable, using fallback')
    }
  }

  return fallbackRiskAssessment({ rainfall, temperature, riskLevel })
}

const getFraudAssessment = async ({
  amount, policyCoverage, claimCount30Days,
  accountAgeDays, triggerTypeSame7Days, claimHour
}) => {
  if (!circuitBreaker.isOpen()) {
    try {
      const response = await aiClient.post('/detect-fraud', {
        amount,
        policyCoverage,
        claimCount30Days
      })

      if (typeof response.data?.riskScore === 'number') {
        circuitBreaker.recordSuccess()
        return {
          isFraudulent: Boolean(response.data.isFraudulent),
          riskScore: response.data.riskScore,
          reasons: response.data.reasons || [],
          signalsChecked: response.data.signalsChecked || 0
        }
      }
    } catch (error) {
      circuitBreaker.recordFailure()
      console.warn('[mlService] AI fraud service unavailable, using fallback')
    }
  }

  return fallbackFraudAssessment({
    amount, policyCoverage, claimCount30Days,
    accountAgeDays, triggerTypeSame7Days, claimHour
  })
}

module.exports = {
  getRiskAssessment,
  getFraudAssessment,
  __test__: {
    fallbackRiskAssessment,
    fallbackFraudAssessment,
    clamp
  }
}
