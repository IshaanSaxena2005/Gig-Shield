const test = require('node:test')
const assert = require('node:assert/strict')

const { buildPolicyQuote, PLAN_CONFIG } = require('../utils/premiumCalculator')

// ── PLAN_CONFIG (single source of truth) ────────────────────────────────────

test('PLAN_CONFIG exposes basic / standard / pro', () => {
  assert.deepEqual(Object.keys(PLAN_CONFIG).sort(), ['basic', 'pro', 'standard'])
})

test('PLAN_CONFIG.basic values', () => {
  assert.equal(PLAN_CONFIG.basic.coverage,                2500)
  assert.equal(PLAN_CONFIG.basic.workerPercentage,        0.02)
  assert.equal(PLAN_CONFIG.basic.workerPercentageDisplay, '2')
})

test('PLAN_CONFIG.standard values', () => {
  assert.equal(PLAN_CONFIG.standard.coverage,                3500)
  assert.equal(PLAN_CONFIG.standard.workerPercentage,        0.035)
  assert.equal(PLAN_CONFIG.standard.workerPercentageDisplay, '3.5')
})

test('PLAN_CONFIG.pro values', () => {
  assert.equal(PLAN_CONFIG.pro.coverage,                5000)
  assert.equal(PLAN_CONFIG.pro.workerPercentage,        0.05)
  assert.equal(PLAN_CONFIG.pro.workerPercentageDisplay, '5')
})

test('buildPolicyQuote coverage values match PLAN_CONFIG', () => {
  // Guards against the two sources drifting
  for (const planKey of Object.keys(PLAN_CONFIG)) {
    const quote = buildPolicyQuote({ weekly_earnings: 10000 }, planKey)
    assert.equal(quote.coverage_amount, PLAN_CONFIG[planKey].coverage,
      `${planKey} coverage drift`)
  }
})

test('buildPolicyQuote worker_percentage string matches PLAN_CONFIG', () => {
  for (const planKey of Object.keys(PLAN_CONFIG)) {
    const quote = buildPolicyQuote({}, planKey)
    assert.equal(quote.breakdown.worker_percentage,
      PLAN_CONFIG[planKey].workerPercentageDisplay + '%',
      `${planKey} display drift`)
  }
})

// ── Shape ───────────────────────────────────────────────────────────────────

test('buildPolicyQuote returns the expected top-level shape', () => {
  const quote = buildPolicyQuote({ weekly_earnings: 10000 }, 'standard')

  assert.equal(typeof quote.premium_amount,  'number')
  assert.equal(typeof quote.coverage_amount, 'number')
  assert.equal(typeof quote.plan,            'string')
  assert.equal(typeof quote.breakdown,       'object')
  assert.equal(quote.currency,               'INR')
})

test('breakdown object has all expected keys', () => {
  const { breakdown } = buildPolicyQuote({ weekly_earnings: 10000 }, 'standard')
  assert.equal(typeof breakdown.pure_premium,         'number')
  assert.equal(typeof breakdown.loading,              'number')
  assert.equal(typeof breakdown.total_actuarial,      'number')
  assert.equal(typeof breakdown.worker_pays,          'number')
  assert.equal(typeof breakdown.platform_contributes, 'number')
  assert.equal(typeof breakdown.worker_percentage,    'string')
})

// ── Coverage by plan ────────────────────────────────────────────────────────

test('basic plan → coverage 2500', () => {
  const quote = buildPolicyQuote({ weekly_earnings: 10000 }, 'basic')
  assert.equal(quote.coverage_amount, 2500)
  assert.equal(quote.plan, 'basic')
})

test('standard plan → coverage 3500', () => {
  const quote = buildPolicyQuote({ weekly_earnings: 10000 }, 'standard')
  assert.equal(quote.coverage_amount, 3500)
})

test('pro plan → coverage 5000', () => {
  const quote = buildPolicyQuote({ weekly_earnings: 10000 }, 'pro')
  assert.equal(quote.coverage_amount, 5000)
})

test('unknown plan → throws Error', () => {
  assert.throws(
    () => buildPolicyQuote({ weekly_earnings: 10000 }, 'platinum'),
    /Invalid plan: platinum/
  )
})

test('missing plan → throws Error', () => {
  assert.throws(
    () => buildPolicyQuote({ weekly_earnings: 10000 }),
    /Invalid plan: undefined/
  )
})

// ── Worker percentage strings ───────────────────────────────────────────────

test('worker_percentage string matches the plan tier', () => {
  assert.equal(buildPolicyQuote({}, 'basic').breakdown.worker_percentage,    '2%')
  assert.equal(buildPolicyQuote({}, 'standard').breakdown.worker_percentage, '3.5%')
  assert.equal(buildPolicyQuote({}, 'pro').breakdown.worker_percentage,      '5%')
})

test('unknown plan string passed to worker_percentage context → throws', () => {
  assert.throws(() => buildPolicyQuote({}, 'platinum'), /Invalid plan/)
})

// ── Actuarial math ──────────────────────────────────────────────────────────
// Pure = 1% of coverage. Loading = 48% of pure. Total = pure + loading.

test('standard plan actuarial breakdown is pure × 1.48', () => {
  const { breakdown } = buildPolicyQuote({ weekly_earnings: 10000 }, 'standard')
  // coverage 3500 → pure 35 → loading 16.8 → total 51.8 → rounded 52
  assert.equal(breakdown.pure_premium,    35)
  assert.equal(breakdown.loading,         17)   // round(16.8)
  assert.equal(breakdown.total_actuarial, 52)   // round(51.8)
})

test('pro plan actuarial breakdown', () => {
  const { breakdown } = buildPolicyQuote({ weekly_earnings: 10000 }, 'pro')
  // coverage 5000 → pure 50 → loading 24 → total 74
  assert.equal(breakdown.pure_premium,    50)
  assert.equal(breakdown.loading,         24)
  assert.equal(breakdown.total_actuarial, 74)
})

// ── Worker contribution capping ─────────────────────────────────────────────
// worker_pays = min(weekly_earnings × tier_pct, total_actuarial_premium).

test('high earnings → worker pays the actuarial cap (not the full %)', () => {
  // standard tier on 10000/week: 3.5% = 350, but actuarial cap is 52
  const { breakdown } = buildPolicyQuote({ weekly_earnings: 10000 }, 'standard')
  assert.equal(breakdown.worker_pays, 52)
  assert.equal(breakdown.platform_contributes, 0)  // platform pays nothing when worker hits cap
})

test('low earnings → worker pays the percentage, platform covers the gap', () => {
  // basic tier on 1000/week: 2% = 20, actuarial total = 37, gap = 17
  const { breakdown } = buildPolicyQuote({ weekly_earnings: 1000 }, 'basic')
  assert.equal(breakdown.worker_pays,          20)
  assert.equal(breakdown.platform_contributes, 17)
})

test('worker_pays + platform_contributes ≈ total_actuarial', () => {
  // Allow 1₹ slack for rounding noise.
  const { breakdown } = buildPolicyQuote({ weekly_earnings: 5000 }, 'pro')
  const sum = breakdown.worker_pays + breakdown.platform_contributes
  assert.ok(Math.abs(sum - breakdown.total_actuarial) <= 1,
    `worker (${breakdown.worker_pays}) + platform (${breakdown.platform_contributes}) should ≈ total ${breakdown.total_actuarial}`)
})

// ── Defaults ────────────────────────────────────────────────────────────────

test('missing weekly_earnings defaults to 10000', () => {
  // With default 10000 standard tier, worker_pays should hit the actuarial cap of 52
  const a = buildPolicyQuote({},                          'standard').breakdown.worker_pays
  const b = buildPolicyQuote({ weekly_earnings: 10000 },  'standard').breakdown.worker_pays
  assert.equal(a, b)
})

// ── premium_amount mirrors worker_pays ──────────────────────────────────────

test('top-level premium_amount equals breakdown.worker_pays', () => {
  for (const plan of ['basic', 'standard', 'pro']) {
    const quote = buildPolicyQuote({ weekly_earnings: 5000 }, plan)
    assert.equal(quote.premium_amount, quote.breakdown.worker_pays,
      `premium_amount mismatch on ${plan}`)
  }
})

// ── Determinism ─────────────────────────────────────────────────────────────

test('same input → same output (deterministic)', () => {
  const a = buildPolicyQuote({ weekly_earnings: 7500 }, 'standard')
  const b = buildPolicyQuote({ weekly_earnings: 7500 }, 'standard')
  assert.deepEqual(a, b)
})
