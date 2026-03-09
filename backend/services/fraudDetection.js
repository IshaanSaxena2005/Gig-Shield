// Simple fraud detection based on claim patterns
const detectFraud = (claimData, userHistory) => {
  let riskScore = 0

  // Check claim frequency
  const recentClaims = userHistory.filter(claim =>
    new Date(claim.submittedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  )

  if (recentClaims.length > 3) riskScore += 20

  // Check claim amount vs policy coverage
  if (claimData.amount > claimData.policyCoverage * 0.8) riskScore += 30

  // Check for suspicious patterns
  if (claimData.description.toLowerCase().includes('rain') &&
      claimData.weatherCondition !== 'rain') {
    riskScore += 50
  }

  return {
    isFraudulent: riskScore > 50,
    riskScore,
    reasons: riskScore > 0 ? ['High claim frequency', 'Large claim amount'] : []
  }
}

module.exports = { detectFraud }