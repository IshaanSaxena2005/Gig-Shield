const BASE_WEEKLY_PREMIUM = 49

const locationAdjustments = {
  low: -2,
  medium: 4,
  high: 10
}

const occupationAdjustments = {
  zomato: 3,
  swiggy: 3,
  zepto: 4,
  amazon: 2,
  flipkart: 2,
  other: 1
}

const triggerCatalog = [
  { type: 'heavy-rain', label: 'Heavy rain shutdown', autoPayout: true },
  { type: 'thunderstorm', label: 'Thunderstorm disruption', autoPayout: true },
  { type: 'flood-risk', label: 'Flood and waterlogging', autoPayout: true },
  { type: 'extreme-heat', label: 'Extreme heat pause', autoPayout: true },
  { type: 'civic-restriction', label: 'Mock civic restriction', autoPayout: false }
]

const roundMoney = (value) => Math.round(value * 100) / 100

const getCoverageAdjustment = (coverage) => {
  if (coverage >= 12000) return 14
  if (coverage >= 8000) return 9
  if (coverage >= 5000) return 5
  return 2
}

const getWeatherAdjustment = (weatherData, aiRiskScore = null) => {
  if (!weatherData?.weather?.[0] || !weatherData?.main) {
    const fallbackScore = aiRiskScore ?? 0.4
    return {
      adjustment: fallbackScore > 0.75 ? 7 : fallbackScore > 0.45 ? 4 : 3,
      weatherRiskScore: fallbackScore,
      explanation: aiRiskScore ? 'AI estimated weather disruption risk' : 'Fallback weather assumption'
    }
  }

  const weatherMain = weatherData.weather[0].main.toLowerCase()
  const temperature = Number(weatherData.main.temp || 0)
  const rainfall = Number(weatherData.rain?.['1h'] || 0)

  if (weatherMain === 'thunderstorm') {
    return { adjustment: 8, weatherRiskScore: 0.92, explanation: 'Thunderstorm conditions detected' }
  }

  if (rainfall >= 15) {
    return { adjustment: 7, weatherRiskScore: 0.85, explanation: 'Heavy rainfall in your zone' }
  }

  if (temperature >= 40) {
    return { adjustment: 6, weatherRiskScore: 0.78, explanation: 'Extreme heat risk window' }
  }

  if (weatherMain === 'rain') {
    return { adjustment: 4, weatherRiskScore: 0.62, explanation: 'Rainy operating conditions' }
  }

  return { adjustment: 1, weatherRiskScore: 0.25, explanation: 'Stable weather conditions' }
}

const buildPricingBreakdown = ({ locationAdjustment, weatherAdjustment, occupationAdjustment, coverageAdjustment }) => ([
  { label: 'Base weekly premium', amount: BASE_WEEKLY_PREMIUM },
  { label: 'Hyper-local zone adjustment', amount: locationAdjustment },
  { label: 'Live weather adjustment', amount: weatherAdjustment.adjustment },
  { label: 'Platform exposure factor', amount: occupationAdjustment },
  { label: 'Coverage adjustment', amount: coverageAdjustment }
]).map((item) => ({
  ...item,
  amount: roundMoney(item.amount)
}))

const buildProtectionWindows = ({ riskLevel, weatherRiskScore }) => {
  const baseHours = riskLevel === 'high' ? 36 : riskLevel === 'medium' ? 24 : 16
  return weatherRiskScore > 0.7 ? baseHours + 8 : baseHours
}

const buildPolicyQuote = ({ coverage, occupation, location, riskZone, weatherData, aiRiskScore }) => {
  const normalizedRiskLevel = (riskZone?.riskLevel || 'medium').toLowerCase()
  const normalizedOccupation = (occupation || 'other').toLowerCase()

  const locationAdjustment = locationAdjustments[normalizedRiskLevel] ?? locationAdjustments.medium
  const occupationAdjustment = occupationAdjustments[normalizedOccupation] ?? occupationAdjustments.other
  const coverageAdjustment = getCoverageAdjustment(Number(coverage || 0))
  const weatherAdjustment = getWeatherAdjustment(weatherData, aiRiskScore)

  const rawPremium = BASE_WEEKLY_PREMIUM + locationAdjustment + occupationAdjustment + coverageAdjustment + weatherAdjustment.adjustment
  const weeklyPremium = Math.max(29, roundMoney(rawPremium))
  const recommendedCoverageHours = buildProtectionWindows({
    riskLevel: normalizedRiskLevel,
    weatherRiskScore: weatherAdjustment.weatherRiskScore
  })

  const pricingBreakdown = buildPricingBreakdown({
    locationAdjustment,
    weatherAdjustment,
    occupationAdjustment,
    coverageAdjustment
  })

  return {
    premium: weeklyPremium,
    riskLevel: normalizedRiskLevel,
    weatherRiskScore: weatherAdjustment.weatherRiskScore,
    location: location || riskZone?.location || '',
    occupation,
    recommendedCoverageHours,
    pricingBreakdown,
    eligibleTriggers: triggerCatalog,
    quoteSummary: {
      headline: `${normalizedRiskLevel} risk zone with ${weatherAdjustment.explanation.toLowerCase()}`,
      note: `Weekly premium adjusts in real time using zone history, weather intensity, platform exposure, and selected coverage.`
    }
  }
}

module.exports = {
  buildPolicyQuote
}
