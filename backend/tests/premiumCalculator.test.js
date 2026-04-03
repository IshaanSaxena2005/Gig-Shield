const test = require('node:test')
const assert = require('node:assert/strict')

const { buildPolicyQuote } = require('../utils/premiumCalculator')

test('buildPolicyQuote returns a stable premium and quote summary', () => {
  const quote = buildPolicyQuote({
    coverage: 8000,
    occupation: 'zepto',
    location: 'Mumbai',
    riskZone: { location: 'Mumbai', riskLevel: 'high' },
    weatherData: {
      weather: [{ main: 'Rain' }],
      main: { temp: 31, humidity: 88 },
      rain: { '1h': 18 }
    },
    aiRiskScore: 0.81
  })

  assert.equal(typeof quote.premium, 'number')
  assert.ok(quote.premium >= 29)
  assert.equal(quote.riskLevel, 'high')
  assert.ok(Array.isArray(quote.pricingBreakdown))
  assert.ok(quote.pricingBreakdown.length >= 4)
  assert.ok(Array.isArray(quote.eligibleTriggers))
  assert.ok(quote.recommendedCoverageHours >= 36)
  assert.equal(typeof quote.quoteSummary.headline, 'string')
})
