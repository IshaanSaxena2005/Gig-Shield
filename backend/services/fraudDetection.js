// Fraud detection based on claim patterns
const detectFraud = (claimData, userHistory) => {
  let riskScore = 0
  const reasons = [] // FIX: collect only reasons that actually fired

  // Check claim frequency in last 30 days
  const recentClaims = userHistory.filter(claim =>
    new Date(claim.submittedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  )

  if (recentClaims.length > 3) {
    riskScore += 20
    reasons.push(`High claim frequency: ${recentClaims.length} claims in the last 30 days`)
  }

  // Check claim amount vs policy coverage
  if (claimData.amount > claimData.policyCoverage * 0.8) {
    riskScore += 30
    reasons.push(`Large claim amount: ₹${claimData.amount} is over 80% of policy coverage`)
  }

  // Check for suspicious weather description mismatch
  if (
    claimData.description.toLowerCase().includes('rain') &&
    claimData.weatherCondition !== 'rain'
  ) {
    riskScore += 50
    reasons.push('Weather mismatch: claim mentions rain but weather data does not confirm it')
  }

  return {
    isFraudulent: riskScore > 50,
    riskScore,
    reasons // now only contains reasons for rules that actually triggered
  }
}

module.exports = { detectFraud }