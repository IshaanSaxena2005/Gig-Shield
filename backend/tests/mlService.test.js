const test = require('node:test')
const assert = require('node:assert/strict')

const { __test__ } = require('../services/mlService')

test('fallbackRiskAssessment stays inside the supported risk band', () => {
  const score = __test__.fallbackRiskAssessment({
    rainfall: 24,
    temperature: 41,
    riskLevel: 'high'
  })

  assert.ok(score >= 0.05)
  assert.ok(score <= 0.98)
})

test('fallbackFraudAssessment flags suspicious high-value repeat claims', () => {
  const assessment = __test__.fallbackFraudAssessment({
    amount: 9000,
    policyCoverage: 10000,
    claimCount30Days: 4
  })

  assert.equal(assessment.isFraudulent, true)
  assert.ok(assessment.riskScore >= 55)
  assert.ok(Array.isArray(assessment.reasons))
  assert.ok(assessment.reasons.length >= 2)
})
