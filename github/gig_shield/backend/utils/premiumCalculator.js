// Premium calculation based on risk factors
const calculatePremium = (basePremium, riskFactors) => {
  let multiplier = 1

  // Location risk
  if (riskFactors.location === 'high') multiplier += 0.3
  else if (riskFactors.location === 'medium') multiplier += 0.15

  // Weather risk
  if (riskFactors.weatherRisk > 0.7) multiplier += 0.2
  else if (riskFactors.weatherRisk > 0.4) multiplier += 0.1

  // Occupation risk
  if (riskFactors.occupation === 'delivery') multiplier += 0.1
  else if (riskFactors.occupation === 'construction') multiplier += 0.2

  return Math.round(basePremium * multiplier * 100) / 100
}

module.exports = { calculatePremium }