// Simulate rain data for testing automated claims
const simulateRain = (location, intensity = 'moderate') => {
  const rainAmounts = {
    light: 2.5,
    moderate: 7.5,
    heavy: 15.0
  }

  const amount = rainAmounts[intensity] || 7.5

  console.log(`Simulating ${intensity} rain in ${location}: ${amount}mm`)

  // In a real implementation, this would update weather data
  // and trigger claim processing

  return {
    location,
    rainfall: amount,
    timestamp: new Date().toISOString()
  }
}

// Example usage
if (require.main === module) {
  simulateRain('New York', 'heavy')
}

module.exports = { simulateRain }