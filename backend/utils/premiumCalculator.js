/**
 * premiumCalculator.js
 * --------------------
 * Actuarial weekly premium engine for GigShield parametric income protection.
 *
 * Method: Pure Risk Premium = Sum of (Frequency × Severity) per disruption type
 * Loading factors applied over pure premium to reach gross weekly price.
 *
 * All amounts in Indian Rupees (₹). Weekly pricing to match Zomato/Swiggy pay cycles.
 */

// ── Disruption frequency data (days/month) from 5-year IMD + CPCB historical records ──
// Keyed by city. Values represent avg disruption-days per month per trigger type.
const CITY_FREQUENCY = {
  Chennai:   { rain: 3.8, heat: 1.2, aqi: 2.1, cyclone: 0.4, curfew: 0.2 },
  Mumbai:    { rain: 4.2, heat: 0.8, aqi: 1.8, cyclone: 0.3, curfew: 0.2 },
  Delhi:     { rain: 1.6, heat: 3.4, aqi: 5.2, cyclone: 0.0, curfew: 0.3 },
  Bengaluru: { rain: 2.4, heat: 0.4, aqi: 1.2, cyclone: 0.0, curfew: 0.1 },
  Hyderabad: { rain: 2.1, heat: 1.8, aqi: 1.4, cyclone: 0.1, curfew: 0.1 },
  Pune:      { rain: 1.8, heat: 0.6, aqi: 0.9, cyclone: 0.0, curfew: 0.1 },
  default:   { rain: 2.0, heat: 1.0, aqi: 1.5, cyclone: 0.1, curfew: 0.2 }
}

// ── Average income loss per disruption event (₹) ──
// Severity = avg daily earnings × fraction of day lost
// Based on Zomato/Swiggy partner earnings survey data 2023-25
const SEVERITY = {
  rain:    720,   // heavy rain → full day loss for food delivery
  heat:    540,   // extreme heat → partial day (afternoon peak hours lost)
  aqi:     410,   // severe AQI → partial work (reduced orders + health concern)
  cyclone: 980,   // cyclone/state alert → full day + next morning
  curfew:  850    // curfew → full day loss
}

// ── Loading factors applied over pure risk premium ──
const LOADINGS = {
  expense:      0.18,   // ops, tech, customer support
  reinsurance:  0.08,   // catastrophe reinsurance cession
  profit:       0.12,   // shareholder return + capital buffer
  fraudReserve: 0.05,   // fraud-related claim leakage reserve
  catReserve:   0.03,   // extra catastrophe buffer (e.g. Fani-level cyclone)
  regulatory:   0.02    // IRDAI surcharge + compliance costs
}

// ── Plan coverage tiers (weekly cap in ₹) ──
const PLAN_COVERAGE = {
  Basic:    2500,
  Standard: 3500,
  Pro:      5000
}

// ── Plan trigger inclusions ──
const PLAN_TRIGGERS = {
  Basic:    ['rain', 'aqi'],
  Standard: ['rain', 'aqi', 'heat', 'cyclone'],
  Pro:      ['rain', 'aqi', 'heat', 'cyclone', 'curfew']
}

/**
 * calculatePureRiskPremium
 * Returns the weekly pure risk premium (expected loss) for a given city + plan.
 * @param {string} city       - Worker's city
 * @param {string} planType   - 'Basic' | 'Standard' | 'Pro'
 * @returns {number}          - Weekly pure premium in ₹
 */
const calculatePureRiskPremium = (city, planType) => {
  const freq = CITY_FREQUENCY[city] || CITY_FREQUENCY.default
  const triggers = PLAN_TRIGGERS[planType] || PLAN_TRIGGERS.Standard

  // Monthly expected loss = sum of (frequency × severity) for each covered trigger
  let monthlyExpectedLoss = 0
  for (const trigger of triggers) {
    monthlyExpectedLoss += (freq[trigger] || 0) * SEVERITY[trigger]
  }

  // Convert monthly → weekly (÷ 4.33 weeks/month)
  const weeklyExpectedLoss = monthlyExpectedLoss / 4.33
  return Math.round(weeklyExpectedLoss * 100) / 100
}

/**
 * calculateWeeklyPremium
 * Full gross weekly premium with all loading factors applied.
 * @param {object} options
 * @param {string} options.city       - Worker's city
 * @param {string} options.planType   - 'Basic' | 'Standard' | 'Pro'
 * @returns {object}                  - { grossPremium, pureRiskPremium, breakdown, coverageCap }
 */
const calculateWeeklyPremium = ({ city = 'default', planType = 'Standard' } = {}) => {
  const pureRiskPremium = calculatePureRiskPremium(city, planType)

  // Total loading factor
  const totalLoadingFactor = Object.values(LOADINGS).reduce((sum, l) => sum + l, 0)

  // Gross = pure / (1 - total_loading) — standard actuarial net-to-gross conversion
  const grossRaw = pureRiskPremium / (1 - totalLoadingFactor)

  // Round to nearest ₹9 (e.g. ₹99, ₹149, ₹229) for clean pricing
  const grossPremium = Math.ceil(grossRaw / 10) * 10 - 1

  const breakdown = {
    pureRiskPremium: Math.round(pureRiskPremium * 100) / 100,
    expenseLoading:      Math.round(grossRaw * LOADINGS.expense * 100) / 100,
    reinsuranceLoading:  Math.round(grossRaw * LOADINGS.reinsurance * 100) / 100,
    profitLoading:       Math.round(grossRaw * LOADINGS.profit * 100) / 100,
    fraudReserve:        Math.round(grossRaw * LOADINGS.fraudReserve * 100) / 100,
    catReserve:          Math.round(grossRaw * LOADINGS.catReserve * 100) / 100,
    regulatoryLoading:   Math.round(grossRaw * LOADINGS.regulatory * 100) / 100,
    grossBeforeRounding: Math.round(grossRaw * 100) / 100,
    grossPremium
  }

  return {
    grossPremium,
    pureRiskPremium,
    breakdown,
    coverageCap: PLAN_COVERAGE[planType] || PLAN_COVERAGE.Standard,
    planType,
    city,
    targetLossRatio: `${Math.round((pureRiskPremium / grossPremium) * 100)}%`
  }
}

/**
 * calculatePayout
 * Determines payout for a triggered event based on the worker's earnings profile.
 * @param {object} params
 * @param {number} params.avgDailyEarnings  - Worker's average daily earnings (₹)
 * @param {number} params.workHoursPerDay   - Worker's typical hours per day
 * @param {number} params.hoursLost         - Estimated hours disrupted (from trigger data)
 * @param {number} params.coverageCap       - Weekly coverage cap for the plan
 * @returns {number}                        - Payout in ₹
 */
const calculatePayout = ({ avgDailyEarnings = 700, workHoursPerDay = 6, hoursLost = 6, coverageCap = 3500 }) => {
  const hourlyRate = avgDailyEarnings / workHoursPerDay
  const rawPayout = hourlyRate * hoursLost
  // Cap at coverage limit and round to nearest ₹50
  const cappedPayout = Math.min(rawPayout, coverageCap)
  return Math.round(cappedPayout / 50) * 50
}

// Legacy export for backward compatibility (keeps existing policyController working)
const calculatePremium = (basePremium, riskFactors) => {
  // Map legacy riskFactors → new system
  const cityMap = { high: 'Chennai', medium: 'Mumbai', low: 'Bengaluru' }
  const city = cityMap[riskFactors.location] || 'default'
  const planType = riskFactors.occupation === 'delivery' ? 'Standard' : 'Basic'
  const result = calculateWeeklyPremium({ city, planType })
  return result.grossPremium
}

module.exports = {
  calculatePremium,          // legacy compat
  calculateWeeklyPremium,    // new actuarial calculation
  calculatePayout,           // payout sizing
  PLAN_COVERAGE,
  PLAN_TRIGGERS,
  CITY_FREQUENCY,
  SEVERITY
}
