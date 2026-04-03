const axios = require('axios')

const aiClient = axios.create({
  baseURL: process.env.AI_ENGINE_URL || `http://localhost:${process.env.AI_ENGINE_PORT || 5002}`,
  timeout: 2500
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const fallbackRiskAssessment = ({ rainfall = 0, temperature = 0, riskLevel = 'medium' }) => {
  const normalizedRisk = String(riskLevel).toLowerCase()
  const locationBoost = normalizedRisk === 'high' ? 0.18 : normalizedRisk === 'medium' ? 0.1 : 0.04
  const weatherBoost = clamp((Number(rainfall) / 30) + Math.max(Number(temperature) - 32, 0) / 25, 0, 0.75)
  return clamp(0.12 + locationBoost + weatherBoost, 0.05, 0.98)
}

const fallbackFraudAssessment = ({ amount = 0, policyCoverage = 0, claimCount30Days = 0 }) => {
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

  return {
    isFraudulent: riskScore >= 55,
    riskScore,
    reasons
  }
}

const getRiskAssessment = async ({ location, rainfall, temperature, riskLevel }) => {
  try {
    const response = await aiClient.post('/predict-risk', {
      location,
      rainfall,
      temperature
    })

    const rawScore = Number(response.data?.risk_score)
    if (Number.isFinite(rawScore)) {
      return clamp(rawScore, 0.05, 0.98)
    }
  } catch (error) {
    console.warn('AI risk service unavailable, using fallback risk assessment')
  }

  return fallbackRiskAssessment({ rainfall, temperature, riskLevel })
}

const getFraudAssessment = async ({ amount, policyCoverage, claimCount30Days }) => {
  try {
    const response = await aiClient.post('/detect-fraud', {
      amount,
      policyCoverage,
      claimCount30Days
    })

    if (typeof response.data?.riskScore === 'number') {
      return {
        isFraudulent: Boolean(response.data.isFraudulent),
        riskScore: response.data.riskScore,
        reasons: response.data.reasons || []
      }
    }
  } catch (error) {
    console.warn('AI fraud service unavailable, using fallback fraud assessment')
  }

  return fallbackFraudAssessment({ amount, policyCoverage, claimCount30Days })
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
