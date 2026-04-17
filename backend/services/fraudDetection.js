/**
 * fraudDetection.js
 * -----------------
 * Multi-signal fraud detection engine.
 * 9 independent signals scored and aggregated. Flags when combined score > 50.
 *
 * Signals:
 *  1. High claim frequency (>3 in 30 days)
 *  2. Large claim amount (>80% of coverage)
 *  3. Weather description mismatch
 *  4. New account scrutiny (account < 7 days old)
 *  5. Per-trigger-type frequency cap (>2 same trigger in 7 days)
 *  6. Time-of-day anomaly (claims filed 1-5 AM)
 *  7. Location mismatch (claim city ≠ user registered city)
 *  8. Max-amount pattern (3+ claims all near coverage cap)
 *  9. Rapid successive claims (<2 hours apart)
 */

const detectFraud = (claimData, userHistory) => {
  let riskScore = 0
  const reasons = []
  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000

  // ── Signal 1: Claim frequency (30-day window) ──────────────────────────────
  const recentClaims = userHistory.filter(claim =>
    new Date(claim.submittedAt) > new Date(now - 30 * DAY_MS)
  )
  if (recentClaims.length > 3) {
    riskScore += 20
    reasons.push(`High claim frequency: ${recentClaims.length} claims in the last 30 days`)
  }

  // ── Signal 2: Large claim amount ───────────────────────────────────────────
  if (claimData.amount > claimData.policyCoverage * 0.8) {
    riskScore += 30
    reasons.push(`Large claim amount: ₹${claimData.amount} is over 80% of policy coverage`)
  }

  // ── Signal 3: Weather description mismatch ─────────────────────────────────
  if (
    claimData.description &&
    claimData.description.toLowerCase().includes('rain') &&
    claimData.weatherCondition !== 'rain'
  ) {
    riskScore += 50
    reasons.push('Weather mismatch: claim mentions rain but weather data does not confirm it')
  }

  // ── Signal 4: New account scrutiny ─────────────────────────────────────────
  // Accounts less than 7 days old filing claims are suspicious
  if (claimData.accountCreatedAt) {
    const accountAgeMs = now - new Date(claimData.accountCreatedAt).getTime()
    if (accountAgeMs < 7 * DAY_MS) {
      const ageDays = Math.floor(accountAgeMs / DAY_MS)
      riskScore += 15
      reasons.push(`New account: account is only ${ageDays} day(s) old`)
    }
  }

  // ── Signal 5: Per-trigger-type frequency cap ───────────────────────────────
  // More than 2 claims of the same trigger type in 7 days is unusual
  if (claimData.triggerType) {
    const sameTrigger7d = userHistory.filter(claim =>
      claim.triggerType === claimData.triggerType &&
      new Date(claim.submittedAt) > new Date(now - 7 * DAY_MS)
    )
    if (sameTrigger7d.length >= 2) {
      riskScore += 18
      reasons.push(`Trigger repetition: ${sameTrigger7d.length + 1} "${claimData.triggerType}" claims in 7 days`)
    }
  }

  // ── Signal 6: Time-of-day anomaly ──────────────────────────────────────────
  // Manual claims filed between 1-5 AM are suspicious (auto-claims excluded)
  if (!claimData.isAutoClaim) {
    const claimHour = claimData.submittedAt
      ? new Date(claimData.submittedAt).getHours()
      : new Date().getHours()
    if (claimHour >= 1 && claimHour <= 5) {
      riskScore += 12
      reasons.push(`Unusual filing time: claim submitted at ${claimHour}:00 (1-5 AM window)`)
    }
  }

  // ── Signal 7: Location mismatch ────────────────────────────────────────────
  // Claim location doesn't match user's registered city
  if (claimData.claimLocation && claimData.userLocation) {
    const normClaim = claimData.claimLocation.toLowerCase().split(',')[0].trim()
    const normUser  = claimData.userLocation.toLowerCase().split(',')[0].trim()
    if (normClaim && normUser && normClaim !== normUser) {
      riskScore += 25
      reasons.push(`Location mismatch: claim from "${claimData.claimLocation}" but user registered in "${claimData.userLocation}"`)
    }
  }

  // ── Signal 8: Max-amount pattern ───────────────────────────────────────────
  // 3+ past claims that are all >70% of coverage suggests gaming
  if (claimData.policyCoverage > 0 && recentClaims.length >= 3) {
    const highClaims = recentClaims.filter(c =>
      parseFloat(c.amount) > claimData.policyCoverage * 0.7
    )
    if (highClaims.length >= 3) {
      riskScore += 20
      reasons.push(`Max-amount pattern: ${highClaims.length} of last ${recentClaims.length} claims are >70% of coverage`)
    }
  }

  // ── Signal 9: Rapid successive claims ──────────────────────────────────────
  // Two claims within 2 hours of each other
  if (recentClaims.length > 0) {
    const sortedByTime = [...recentClaims].sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    )
    const lastClaimTime = new Date(sortedByTime[0].submittedAt).getTime()
    const timeSinceLast = now - lastClaimTime
    if (timeSinceLast < 2 * 60 * 60 * 1000) { // 2 hours
      const minutesAgo = Math.round(timeSinceLast / 60000)
      riskScore += 15
      reasons.push(`Rapid claim: last claim was only ${minutesAgo} minutes ago`)
    }
  }

  return {
    isFraudulent: riskScore > 50,
    riskScore,
    reasons,
    signalsChecked: 9
  }
}

module.exports = { detectFraud }