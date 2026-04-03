const test = require('node:test')
const assert = require('node:assert/strict')

const { evaluateDisruptionSignals } = require('../services/disruptionSignals')

test('evaluateDisruptionSignals emits severe weather and civic signals for high-risk conditions', () => {
  const signals = evaluateDisruptionSignals({
    location: 'Delhi',
    riskZone: {
      riskLevel: 'high',
      weatherConditions: {
        civicRestriction: true,
        airQualityIndex: 220
      }
    },
    weatherData: {
      weather: [{ main: 'Thunderstorm' }],
      main: { temp: 42, humidity: 93 },
      rain: { '1h': 22 }
    }
  })

  const signalTypes = signals.map((signal) => signal.type)

  assert.ok(signalTypes.includes('thunderstorm'))
  assert.ok(signalTypes.includes('flood-risk'))
  assert.ok(signalTypes.includes('extreme-heat'))
  assert.ok(signalTypes.includes('civic-restriction'))
  assert.ok(signalTypes.includes('air-quality'))
})
