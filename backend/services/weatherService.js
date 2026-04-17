/**
 * weatherService.js
 * -----------------
 * Central weather service for GigShield AI.
 *
 * Features:
 *   - OpenWeatherMap API integration (weather + AQI)
 *   - 5-minute cache per location/coordinate
 *   - Retry with exponential backoff (3 attempts: 500ms, 1s, 2s)
 *   - Circuit breaker (opens after 3 failures, 60s cooldown, half-open recovery)
 *   - 5-second request timeout
 *   - Parametric trigger detection
 *   - Dynamic hours-lost calculation (intensity × duration × time-of-day)
 */

const axios = require('axios')

// ── Configuration ────────────────────────────────────────────────────────────
const CACHE_TTL     = 5 * 60 * 1000   // 5 minutes
const API_TIMEOUT   = 5000            // 5s per request
const MAX_RETRIES   = 3
const BACKOFF_BASE  = 500             // 500ms, 1s, 2s

// ── Trigger thresholds ───────────────────────────────────────────────────────
const THRESHOLDS = {
  heavy_rain:    { field: 'rain_mm_3hr', min: 50 },   // mm / 3hr
  moderate_rain: { field: 'rain_mm_3hr', min: 30 },
  extreme_heat:  { field: 'temp',        min: 42 },   // °C
  severe_aqi:    { field: 'aqi',         min: 200 },  // CPCB scale
  cyclone:       { field: 'weatherId',   range: [900, 902] }
}

// ── Hours-lost caps per trigger type ─────────────────────────────────────────
const HOURS_LOST_CAPS = {
  heavy_rain:    6,
  moderate_rain: 4,
  extreme_heat:  5,
  severe_aqi:    6,
  cyclone:       10
}

// ── OpenWeather AQI (1-5) → CPCB AQI (0-500) ─────────────────────────────────
const OW_TO_CPCB = { 1: 25, 2: 75, 3: 150, 4: 250, 5: 350 }

// ── Caches ───────────────────────────────────────────────────────────────────
const weatherCache = new Map()
const aqiCache     = new Map()

// ── Circuit breaker ──────────────────────────────────────────────────────────
const circuitBreaker = {
  failures:    0,
  maxFailures: 3,
  cooldownMs:  60 * 1000,
  openedAt:    null,

  recordFailure() {
    this.failures++
    if (this.failures >= this.maxFailures && !this.openedAt) {
      this.openedAt = Date.now()
      console.warn(`[weatherService] Circuit OPEN — pausing API calls for ${this.cooldownMs / 1000}s`)
    }
  },

  recordSuccess() {
    if (this.failures > 0 || this.openedAt) {
      this.failures = 0
      this.openedAt = null
      console.log('[weatherService] Circuit CLOSED — API calls resumed')
    }
  },

  isOpen() {
    if (!this.openedAt) return false
    if (Date.now() - this.openedAt > this.cooldownMs) {
      // Half-open: allow one probe attempt
      this.failures = this.maxFailures - 1
      this.openedAt = null
      console.log('[weatherService] Circuit HALF-OPEN — probing...')
      return false
    }
    return true
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────
const normaliseLocation = (loc) => (loc || '').toLowerCase().split(',')[0].trim()

const buildCacheKey = ({ lat, lon, location }) => {
  if (lat != null && lon != null) {
    return `coord:${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`
  }
  return `city:${normaliseLocation(location)}`
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Retry wrapper with exponential backoff.
 * Retries on network errors and 5xx responses; fails fast on 4xx.
 */
const fetchWithRetry = async (url, attempt = 1) => {
  try {
    const response = await axios.get(url, { timeout: API_TIMEOUT })
    return response
  } catch (error) {
    const status = error.response?.status
    // Don't retry on 4xx client errors (bad API key, invalid location, etc.)
    if (status && status >= 400 && status < 500) {
      throw error
    }
    if (attempt < MAX_RETRIES) {
      const backoff = BACKOFF_BASE * Math.pow(2, attempt - 1) // 500ms, 1s, 2s
      console.warn(`[weatherService] Attempt ${attempt} failed (${error.message}). Retrying in ${backoff}ms...`)
      await sleep(backoff)
      return fetchWithRetry(url, attempt + 1)
    }
    throw error
  }
}

// ── Core API wrappers ────────────────────────────────────────────────────────

/**
 * Fetch raw OpenWeather current weather.
 * Uses coordinates if provided (hyper-local accuracy), otherwise city name.
 */
const getWeatherData = async (location, coords) => {
  const lat = coords?.lat ?? null
  const lon = coords?.lon ?? null
  const key = buildCacheKey({ lat, lon, location })

  // Cache hit
  const cached = weatherCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // Circuit breaker open — return stale cache or null
  if (circuitBreaker.isOpen()) {
    return cached?.data || null
  }

  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    console.error('[weatherService] OPENWEATHER_API_KEY is not set')
    return null
  }

  const url = (lat != null && lon != null)
    ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`

  try {
    const response = await fetchWithRetry(url)
    circuitBreaker.recordSuccess()
    weatherCache.set(key, { data: response.data, timestamp: Date.now() })
    return response.data
  } catch (error) {
    circuitBreaker.recordFailure()
    console.error(`[weatherService] Weather fetch failed for "${key}":`, error.message)
    // Return stale cache if available (soft-fail over hard-fail)
    return cached?.data || null
  }
}

/**
 * Fetch AQI on the CPCB 0-500 scale.
 */
const getAQIData = async (location, coords) => {
  const hasCoords = coords?.lat != null && coords?.lon != null
  const key = hasCoords
    ? `coord:${Number(coords.lat).toFixed(2)},${Number(coords.lon).toFixed(2)}`
    : normaliseLocation(location)

  const cached = aqiCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  if (circuitBreaker.isOpen()) {
    return cached?.data ?? null
  }

  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) return null

  try {
    let lat, lon
    if (hasCoords) {
      lat = coords.lat
      lon = coords.lon
    } else {
      // Geocode city → lat/lon
      const geoRes = await fetchWithRetry(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`
      )
      if (!geoRes.data?.length) return null
      lat = geoRes.data[0].lat
      lon = geoRes.data[0].lon
    }

    const aqiRes = await fetchWithRetry(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
    )

    const owAqi = aqiRes.data?.list?.[0]?.main?.aqi
    if (!owAqi) return null

    const cpcbAqi = OW_TO_CPCB[owAqi] ?? null
    circuitBreaker.recordSuccess()
    aqiCache.set(key, { data: cpcbAqi, timestamp: Date.now() })
    return cpcbAqi
  } catch (error) {
    circuitBreaker.recordFailure()
    console.error(`[weatherService] AQI fetch failed for "${key}":`, error.message)
    return cached?.data ?? null
  }
}

// ── Trigger detection ────────────────────────────────────────────────────────

/**
 * Normalise raw OpenWeather response into a flat trigger-check object.
 */
const normaliseWeather = (weatherData, aqiValue) => {
  if (!weatherData) return null
  const rain1h = weatherData.rain?.['1h'] ?? 0
  const rain3h = weatherData.rain?.['3h'] ?? (rain1h * 3)
  return {
    temp:          weatherData.main?.temp ?? 0,
    humidity:      weatherData.main?.humidity ?? 0,
    rain_mm_1hr:   rain1h,
    rain_mm_3hr:   rain3h,
    weatherId:     weatherData.weather?.[0]?.id ?? 0,
    weatherMain:   weatherData.weather?.[0]?.main ?? '',
    aqi:           aqiValue ?? 0
  }
}

/**
 * Check which parametric triggers fired for a given weather/AQI snapshot.
 * Returns array of { triggerType, triggerValue, rawValue }.
 */
const detectTriggers = (weatherData, aqiValue) => {
  const fired = []
  const normalised = normaliseWeather(weatherData, aqiValue)
  if (!normalised) return fired

  // Cyclone first (most severe)
  if (normalised.weatherId >= THRESHOLDS.cyclone.range[0] &&
      normalised.weatherId <= THRESHOLDS.cyclone.range[1]) {
    fired.push({
      triggerType:  'cyclone',
      triggerValue: `WeatherID ${normalised.weatherId}`,
      rawValue:     normalised.weatherId
    })
  }

  // Rain — pick the strongest tier only
  if (normalised.rain_mm_3hr >= THRESHOLDS.heavy_rain.min) {
    fired.push({
      triggerType:  'heavy_rain',
      triggerValue: `${normalised.rain_mm_3hr.toFixed(1)}mm/3hr`,
      rawValue:     normalised.rain_mm_3hr
    })
  } else if (normalised.rain_mm_3hr >= THRESHOLDS.moderate_rain.min) {
    fired.push({
      triggerType:  'moderate_rain',
      triggerValue: `${normalised.rain_mm_3hr.toFixed(1)}mm/3hr`,
      rawValue:     normalised.rain_mm_3hr
    })
  }

  // Heat
  if (normalised.temp >= THRESHOLDS.extreme_heat.min) {
    fired.push({
      triggerType:  'extreme_heat',
      triggerValue: `${normalised.temp.toFixed(1)}°C`,
      rawValue:     normalised.temp
    })
  }

  // AQI
  if (normalised.aqi >= THRESHOLDS.severe_aqi.min) {
    fired.push({
      triggerType:  'severe_aqi',
      triggerValue: `AQI ${normalised.aqi}`,
      rawValue:     normalised.aqi
    })
  }

  return fired
}

// ── Dynamic hours-lost calculation ───────────────────────────────────────────

/**
 * Calculate hours of income lost for a trigger event.
 * Factors:
 *   - Event intensity (rain mm, temp °C)
 *   - Event duration (minutes)
 *   - Time-of-day modifier (peak delivery hours = worse impact)
 *
 * @param {string} triggerType      'heavy_rain' | 'moderate_rain' | 'extreme_heat' | 'severe_aqi' | 'cyclone'
 * @param {object} weatherData      Normalised snapshot from normaliseWeather()
 * @param {number} durationMinutes  Duration of the disruption
 * @param {number} timeOfDay        Hour (0-23) when event occurred
 * @param {boolean} hasShiftData    Reserved for future shift-aware adjustments
 * @returns {number}  Hours lost (capped at trigger-specific maximum)
 */
const calculateHoursLost = (triggerType, weatherData, durationMinutes, timeOfDay, hasShiftData = false) => {
  const cap = HOURS_LOST_CAPS[triggerType]
  if (!cap) return 0

  // ── Intensity factor ──────────────────────────────────────────────────────
  let intensityFactor = 1.0

  if (triggerType === 'heavy_rain') {
    const rainAmount = weatherData.rain_mm_3hr ?? 0
    if (rainAmount >= 70)      intensityFactor = 1.0
    else if (rainAmount >= 50) intensityFactor = 0.8
    else if (rainAmount >= 30) intensityFactor = 0.5
  }

  if (triggerType === 'moderate_rain') {
    const rainAmount = weatherData.rain_mm_3hr ?? 0
    if (rainAmount >= 40)      intensityFactor = 0.7
    else if (rainAmount >= 30) intensityFactor = 0.5
  }

  if (triggerType === 'extreme_heat') {
    const temp = weatherData.temp ?? 0
    if (temp >= 45)      intensityFactor = 1.0
    else if (temp >= 42) intensityFactor = 0.6
  }

  if (triggerType === 'severe_aqi') {
    const aqi = weatherData.aqi ?? 0
    if (aqi >= 400)      intensityFactor = 1.0
    else if (aqi >= 300) intensityFactor = 0.7
    else if (aqi >= 200) intensityFactor = 0.5
  }

  if (triggerType === 'cyclone') {
    intensityFactor = 1.0 // full disruption
  }

  // ── Raw hours from duration × intensity ──────────────────────────────────
  let hoursLost = (durationMinutes / 60) * intensityFactor

  // ── Time-of-day modifier ──────────────────────────────────────────────────
  // Peak delivery hours (10 AM - 5 PM) = more earnings lost
  // Night hours (10 PM - 6 AM) = less impact (lower delivery volume)
  if (timeOfDay >= 10 && timeOfDay <= 17) {
    hoursLost *= 1.2
  } else if (timeOfDay >= 22 || timeOfDay <= 6) {
    hoursLost *= 0.7
  }

  // ── Cap at trigger-specific maximum ──────────────────────────────────────
  return Math.min(hoursLost, cap)
}

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  getWeatherData,
  getAQIData,
  detectTriggers,
  calculateHoursLost,
  normaliseWeather,
  THRESHOLDS,
  HOURS_LOST_CAPS,
  __test__: {
    circuitBreaker,
    fetchWithRetry,
    clearCaches: () => { weatherCache.clear(); aqiCache.clear() }
  }
}
