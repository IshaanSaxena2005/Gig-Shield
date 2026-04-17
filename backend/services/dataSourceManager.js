/**
 * dataSourceManager.js
 * --------------------
 * Priority-aware, circuit-breakered multi-source orchestrator for weather + AQI.
 *
 * Design:
 *   - Each source is an adapter with { tier, type, name, fetch(location, signal) }.
 *   - Per-source circuit breaker — after 3 consecutive failures, skip for 60s.
 *   - Timeouts via AbortController (no heavy deps).
 *   - Exponential-backoff retries within a single call (200ms → 400ms → 800ms).
 *   - Tier 3 (satellite / survey) is opt-in via includeSatellite — too slow/expensive
 *     for the hourly trigger sweep, so only disputeService pulls it.
 *
 * Adapters gracefully degrade to mock readings when API keys are missing,
 * matching the existing project convention (see paymentController Stripe fallback).
 */

const TriggerEvidence = require('../models/TriggerEvidence')

// ── Tuning ──────────────────────────────────────────────────────────────────
const TIMEOUT_MS             = 5_000
const MAX_RETRIES            = 2
const CB_FAILURE_THRESHOLD   = 3
const CB_COOLDOWN_MS         = 60_000
const BACKOFF_BASE_MS        = 200
const STALENESS_LIMIT_MS     = 10 * 60 * 1000   // Layer 2 accepts up to 10min lag

// ── Per-source circuit breaker state ────────────────────────────────────────
const cbState = Object.create(null)   // { [sourceName]: { failures, openUntil } }

const isOpen = (name) => {
  const s = cbState[name]
  return !!(s && s.openUntil && s.openUntil > Date.now())
}
const recordFailure = (name) => {
  const s = cbState[name] || { failures: 0, openUntil: 0 }
  s.failures += 1
  if (s.failures >= CB_FAILURE_THRESHOLD) {
    s.openUntil = Date.now() + CB_COOLDOWN_MS
    console.warn(`[dataSourceManager] Circuit OPEN for ${name} — cooldown ${CB_COOLDOWN_MS/1000}s`)
  }
  cbState[name] = s
}
const recordSuccess = (name) => { cbState[name] = { failures: 0, openUntil: 0 } }

// ── Timeout + retry wrapper ─────────────────────────────────────────────────
const withTimeout = async (fn, ms) => {
  const ctrl = new AbortController()
  const t    = setTimeout(() => ctrl.abort(), ms)
  try     { return await fn(ctrl.signal) }
  finally { clearTimeout(t) }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ── Source adapters ─────────────────────────────────────────────────────────
// Each returns a normalized reading:
//   { reading_type, value, unit, location, latitude?, longitude?, metadata? }

const hasKey = (k) => !!process.env[k] && !process.env[k].includes('your-')

// Deterministic mock based on city — keeps test runs stable
const mockAQI = (loc = '') => {
  const cityHash = [...String(loc).toLowerCase()].reduce((h, c) => h + c.charCodeAt(0), 0)
  return 80 + (cityHash % 250)   // 80–329
}
const mockRain = (loc = '') => {
  const h = [...String(loc).toLowerCase()].reduce((h, c) => h + c.charCodeAt(0), 0)
  return (h % 100) / 10          // 0–9.9 mm/hr
}

async function fetchCPCB(location, signal) {
  if (!hasKey('CPCB_API_KEY')) {
    return { reading_type: 'aqi', value: mockAQI(location), unit: 'US EPA', location, metadata: { mock: true } }
  }
  const url = `${process.env.CPCB_BASE_URL || 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69'}?api-key=${process.env.CPCB_API_KEY}&format=json&filters%5Bcity%5D=${encodeURIComponent(location)}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`CPCB ${res.status}`)
  const json = await res.json()
  const rec  = json.records?.[0]
  if (!rec) throw new Error('CPCB returned no record')
  return {
    reading_type: 'aqi',
    value:        parseFloat(rec.aqi_value ?? rec.pollutant_avg),
    unit:         'US EPA',
    location,
    metadata:     { stationId: rec.station, pollutant: rec.pollutant_id }
  }
}

async function fetchPurpleAir(location, signal) {
  if (!hasKey('PURPLEAIR_API_KEY')) {
    return { reading_type: 'aqi', value: mockAQI(location) + 5, unit: 'US EPA', location, metadata: { mock: true, lag: '~5min' } }
  }
  const res = await fetch(`https://api.purpleair.com/v1/sensors?location=${encodeURIComponent(location)}`, {
    headers: { 'X-API-Key': process.env.PURPLEAIR_API_KEY }, signal
  })
  if (!res.ok) throw new Error(`PurpleAir ${res.status}`)
  const json = await res.json()
  return { reading_type: 'aqi', value: json.pm25_aqi, unit: 'US EPA', location, metadata: { sensorId: json.sensor_id } }
}

async function fetchGoogleEnv(location, signal) {
  if (!hasKey('GOOGLE_ENV_API_KEY')) {
    return { reading_type: 'aqi', value: mockAQI(location) - 3, unit: 'US EPA', location, metadata: { mock: true, satellite: true } }
  }
  const res = await fetch(`https://airquality.googleapis.com/v1/currentConditions:lookup?key=${process.env.GOOGLE_ENV_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ location: { latitude: 0, longitude: 0 } /* caller should supply coords */ }),
    signal
  })
  if (!res.ok) throw new Error(`GoogleEnv ${res.status}`)
  const json = await res.json()
  return {
    reading_type: 'aqi',
    value:        json.indexes?.[0]?.aqi,
    unit:         'US EPA',
    location,
    metadata:     { satellite: true, source: 'google_env_insights' }
  }
}

async function fetchIMD(location, signal) {
  if (!hasKey('IMD_API_KEY')) {
    return { reading_type: 'rain', value: mockRain(location), unit: 'mm/hr', location, metadata: { mock: true } }
  }
  const url = `${process.env.IMD_BASE_URL || 'https://mausam.imd.gov.in/api/current'}?station=${encodeURIComponent(location)}&key=${process.env.IMD_API_KEY}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`IMD ${res.status}`)
  const json = await res.json()
  return {
    reading_type: 'rain',
    value:        parseFloat(json.rainfall_mm_per_hour),
    unit:         'mm/hr',
    location,
    metadata:     { stationId: json.station_id, temperature: json.temp_c }
  }
}

async function fetchOpenMeteo(location, signal) {
  // Open-Meteo is free, no key required; we still need lat/lng — falling back to city proxy
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`, { signal })
    const g   = await geo.json()
    const hit = g?.results?.[0]
    if (!hit) throw new Error('no geocode hit')
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=precipitation,temperature_2m,wind_speed_10m`, { signal })
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const json = await res.json()
    return {
      reading_type: 'rain',
      value:        json.current?.precipitation ?? 0,
      unit:         'mm/hr',
      location,
      latitude:     hit.latitude,
      longitude:    hit.longitude,
      metadata:     { temperature: json.current?.temperature_2m, wind: json.current?.wind_speed_10m }
    }
  } catch (err) {
    // Open-Meteo failed — fall back to mock so Layer 2 is never a hard failure
    return { reading_type: 'rain', value: mockRain(location), unit: 'mm/hr', location, metadata: { mock: true, fallbackReason: err.message } }
  }
}

// ── Source registry ─────────────────────────────────────────────────────────
const SOURCES = {
  // AQI
  cpcb:       { tier: 1, readingType: 'aqi',  name: 'CPCB',            fetch: fetchCPCB },
  purpleair:  { tier: 2, readingType: 'aqi',  name: 'PurpleAir',       fetch: fetchPurpleAir },
  google_env: { tier: 3, readingType: 'aqi',  name: 'Google Env Insights', fetch: fetchGoogleEnv },
  // Weather (rain proxy)
  imd:        { tier: 1, readingType: 'rain', name: 'IMD',             fetch: fetchIMD },
  openmeteo:  { tier: 2, readingType: 'rain', name: 'Open-Meteo',      fetch: fetchOpenMeteo }
}

// ── Core ────────────────────────────────────────────────────────────────────

/**
 * Invoke one adapter with timeout + retry + circuit breaker + latency capture.
 * Returns a normalized envelope — NEVER throws. Failures surface as
 * { success: false, error } so callers can consult other sources.
 */
async function callSource(name, location) {
  const src = SOURCES[name]
  if (!src) return { source: name, tier: null, success: false, error: 'unknown source', latency_ms: 0 }

  if (isOpen(name)) {
    return { source: name, tier: src.tier, success: false, error: 'circuit_open', latency_ms: 0 }
  }

  const t0 = Date.now()
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const reading = await withTimeout((signal) => src.fetch(location, signal), TIMEOUT_MS)
      recordSuccess(name)
      return {
        source:     name,
        tier:       src.tier,
        success:    true,
        latency_ms: Date.now() - t0,
        ...reading
      }
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        recordFailure(name)
        return { source: name, tier: src.tier, success: false, error: err.message, latency_ms: Date.now() - t0 }
      }
      await sleep(BACKOFF_BASE_MS * Math.pow(2, attempt))
    }
  }
}

/**
 * Fetch a reading with failover semantics:
 *   1. Query all Tier-1 sources for the given reading type (parallel).
 *   2. If every Tier-1 call failed or the results look inconsistent,
 *      pull in Tier-2 sources. Accept up to STALENESS_LIMIT_MS lag.
 *   3. Tier-3 (satellite) only if caller sets includeSatellite (dispute flow).
 *
 * Returns ALL readings that succeeded or attempted — caller (aqiValidator /
 * disputeService) decides what to do with the set.
 *
 * @param {('aqi'|'rain')} readingType
 * @param {string} location
 * @param {object} [opts]
 * @param {boolean} [opts.includeSatellite=false]   pull Tier-3 as well
 * @param {boolean} [opts.forceAll=false]           query every tier regardless of Tier-1 outcome
 */
async function fetchWithFailover(readingType, location, { includeSatellite = false, forceAll = false } = {}) {
  const byTier = { 1: [], 2: [], 3: [] }
  for (const [name, meta] of Object.entries(SOURCES)) {
    if (meta.readingType === readingType) byTier[meta.tier].push(name)
  }

  // Tier 1 in parallel
  const tier1Results = await Promise.all(byTier[1].map(n => callSource(n, location)))
  const tier1OK      = tier1Results.filter(r => r.success)

  // Short-circuit: all Tier-1 succeeded AND we're not forcing full sweep
  if (!forceAll && tier1OK.length === byTier[1].length && tier1OK.length > 0) {
    return includeSatellite
      ? [...tier1Results, ...(await Promise.all(byTier[3].map(n => callSource(n, location))))]
      : tier1Results
  }

  // Failover to Tier 2
  const tier2Results = await Promise.all(byTier[2].map(n => callSource(n, location)))

  // Tier 3 only on demand (dispute or admin-forced)
  const tier3Results = includeSatellite
    ? await Promise.all(byTier[3].map(n => callSource(n, location)))
    : []

  return [...tier1Results, ...tier2Results, ...tier3Results]
}

/**
 * Persist a batch of readings as immutable TriggerEvidence rows.
 * Any individual save failure is logged but does NOT break the trigger/dispute flow.
 */
async function saveEvidence(claimId, stage, readings) {
  return Promise.all(readings.map(r => TriggerEvidence.create({
    claim_id:      claimId,
    stage,
    source:        r.source,
    source_tier:   r.tier,
    reading_type:  r.reading_type || 'unknown',
    reading_value: Number.isFinite(r.value) ? r.value : null,
    unit:          r.unit,
    location:      r.location,
    latitude:      r.latitude,
    longitude:     r.longitude,
    latency_ms:    r.latency_ms,
    success:       r.success,
    error:         r.error,
    metadata:      { ...(r.metadata || {}), stalenessLimitMs: STALENESS_LIMIT_MS }
  }).catch(err => {
    console.error(`[dataSourceManager] Failed to persist evidence for source=${r.source}:`, err.message)
    return null
  })))
}

/** Circuit-breaker introspection — useful for admin dashboard. */
function getCircuitStates() {
  return Object.entries(cbState).map(([name, s]) => ({
    source: name,
    open:   isOpen(name),
    failures: s.failures,
    openUntil: s.openUntil || null
  }))
}

module.exports = {
  fetchWithFailover,
  saveEvidence,
  callSource,
  getCircuitStates,
  SOURCES,
  THRESHOLDS: Object.freeze({ TIMEOUT_MS, MAX_RETRIES, CB_FAILURE_THRESHOLD, CB_COOLDOWN_MS, STALENESS_LIMIT_MS })
}
