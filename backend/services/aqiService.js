/**
 * aqiService.js
 * -------------
 * Fetches AQI (Air Quality Index) data for a given city.
 * Uses OpenWeatherMap Air Pollution API (free tier, same API key).
 *
 * OpenWeather AQI scale: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=VeryPoor
 * CPCB India AQI scale:  0-50 Good, 51-100 Satisfactory, 101-200 Moderate,
 *                        201-300 Poor, 301-400 VeryPoor, 401-500 Severe
 *
 * We map OpenWeather's 1-5 scale to approximate CPCB values for trigger checks.
 */

const axios = require('axios')

const cache = new Map()
const CACHE_TTL = 30 * 60 * 1000 // 30 min — AQI changes slowly

// Map OpenWeather AQI index → approximate CPCB AQI value
const OW_TO_CPCB = { 1: 25, 2: 75, 3: 150, 4: 250, 5: 350 }

const getAQIData = async (location) => {
  try {
    const cached = cache.get(location)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) return null

    // Step 1: get lat/lon for the location
    const geoRes = await axios.get(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`
    )
    if (!geoRes.data?.length) return null

    const { lat, lon } = geoRes.data[0]

    // Step 2: get AQI using coordinates
    const aqiRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
    )

    const owAqi = aqiRes.data?.list?.[0]?.main?.aqi
    if (!owAqi) return null

    const cpcbAqi = OW_TO_CPCB[owAqi] ?? null

    cache.set(location, { data: cpcbAqi, timestamp: Date.now() })
    return cpcbAqi

  } catch (error) {
    console.error(`[aqiService] Error fetching AQI for "${location}":`, error.message)
    return null
  }
}

module.exports = { getAQIData }
