const deriveMockCivicSignals = (location, riskZone, weatherData) => {
  const normalizedLocation = (location || '').toLowerCase()
  const weatherConditions = riskZone?.weatherConditions || {}
  const hour = new Date().getHours()
  const temperature = Number(weatherData?.main?.temp || 0)

  const civicRestriction =
    Boolean(weatherConditions.civicRestriction) ||
    ((normalizedLocation.includes('delhi') || normalizedLocation.includes('mumbai')) && hour >= 22)

  const airQualityStress =
    Number(weatherConditions.airQualityIndex || 0) >= 180 ||
    ((normalizedLocation.includes('delhi') || normalizedLocation.includes('noida')) && temperature >= 34)

  return { civicRestriction, airQualityStress }
}

const percentileBands = {
  low: 35,
  medium: 55,
  high: 80
}

const buildSignal = ({ type, title, severity, autoApprove, payoutPercentile, description, source }) => ({
  type,
  title,
  severity,
  autoApprove,
  payoutPercentile,
  description,
  source
})

const evaluateDisruptionSignals = ({ location, riskZone, weatherData }) => {
  if (!weatherData?.weather?.[0] || !weatherData?.main) {
    return []
  }

  const signals = []
  const weatherMain = weatherData.weather[0].main.toLowerCase()
  const rainfall = Number(weatherData.rain?.['1h'] || 0)
  const temperature = Number(weatherData.main.temp || 0)
  const humidity = Number(weatherData.main.humidity || 0)
  const normalizedRiskLevel = (riskZone?.riskLevel || 'medium').toLowerCase()
  const { civicRestriction, airQualityStress } = deriveMockCivicSignals(location, riskZone, weatherData)

  if (weatherMain === 'rain' && rainfall >= 8) {
    signals.push(buildSignal({
      type: 'heavy-rain',
      title: 'Heavy rain trigger',
      severity: rainfall >= 15 ? 'high' : 'medium',
      autoApprove: true,
      payoutPercentile: rainfall >= 15 ? percentileBands.high : percentileBands.medium,
      description: 'Rainfall intensity crossed the loss-of-income threshold for riders.',
      source: 'OpenWeather'
    }))
  }

  if (weatherMain === 'thunderstorm') {
    signals.push(buildSignal({
      type: 'thunderstorm',
      title: 'Thunderstorm trigger',
      severity: 'high',
      autoApprove: true,
      payoutPercentile: percentileBands.high,
      description: 'Thunderstorm conditions are severe enough to pause delivery operations.',
      source: 'OpenWeather'
    }))
  }

  if ((rainfall >= 18 && normalizedRiskLevel !== 'low') || (humidity >= 90 && normalizedRiskLevel === 'high')) {
    signals.push(buildSignal({
      type: 'flood-risk',
      title: 'Flood and waterlogging trigger',
      severity: 'high',
      autoApprove: true,
      payoutPercentile: 90,
      description: 'Hyper-local flood risk is elevated due to rainfall and zone history.',
      source: 'Weather + Risk Zone'
    }))
  }

  if (temperature >= 40) {
    signals.push(buildSignal({
      type: 'extreme-heat',
      title: 'Extreme heat trigger',
      severity: temperature >= 43 ? 'high' : 'medium',
      autoApprove: true,
      payoutPercentile: temperature >= 43 ? percentileBands.high : percentileBands.medium,
      description: 'Heat stress crossed the safe operating threshold for long-shift workers.',
      source: 'OpenWeather'
    }))
  }

  if (civicRestriction) {
    signals.push(buildSignal({
      type: 'civic-restriction',
      title: 'Civic restriction trigger',
      severity: 'medium',
      autoApprove: false,
      payoutPercentile: 45,
      description: 'Mock civic alerts indicate route restrictions that may pause deliveries.',
      source: 'Mock municipal feed'
    }))
  }

  if (airQualityStress) {
    signals.push(buildSignal({
      type: 'air-quality',
      title: 'Air quality stress trigger',
      severity: 'medium',
      autoApprove: false,
      payoutPercentile: percentileBands.low,
      description: 'Environmental conditions indicate reduced outdoor safety for riders.',
      source: 'Mock air-quality feed'
    }))
  }

  return signals
}

module.exports = {
  evaluateDisruptionSignals
}
