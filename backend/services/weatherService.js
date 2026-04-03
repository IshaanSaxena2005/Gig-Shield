const axios = require('axios')

// FIX: cache results per location for 5 minutes
// prevents hammering the API when processing many policies at once
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const getWeatherData = async (location) => {
  try {
    // Return cached result if still fresh
    const cached = cache.get(location)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
      console.error('OPENWEATHER_API_KEY is not set')
      return null
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
    )

    // Store in cache
    cache.set(location, {
      data: response.data,
      timestamp: Date.now()
    })

    return response.data
  } catch (error) {
    console.error(`Weather API error for location "${location}":`, error.message)
    return null
  }
}

module.exports = { getWeatherData }