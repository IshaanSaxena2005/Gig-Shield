// Automated claim triggering based on weather conditions
const checkWeatherTriggers = async (policies, weatherData) => {
  const triggeredClaims = []

  for (const policy of policies) {
    if (weatherData.weather[0].main.toLowerCase() === 'rain' &&
        weatherData.rain && weatherData.rain['1h'] > 10) {
      // Heavy rain trigger
      triggeredClaims.push({
        policyId: policy._id,
        userId: policy.user,
        amount: policy.coverage * 0.1, // 10% of coverage
        reason: 'Heavy rain damage'
      })
    }
  }

  return triggeredClaims
}

module.exports = { checkWeatherTriggers }