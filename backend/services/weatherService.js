const axios = require('axios')

const getWeatherData = async (location) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`
    )
    return response.data
  } catch (error) {
    console.error('Weather API error:', error.message)
    return null
  }
}

module.exports = { getWeatherData }