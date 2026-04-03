/**
 * scripts/simulateRain.js
 * -----------------------
 * Test script to simulate parametric trigger events for development.
 * Run: node scripts/simulateRain.js [event] [city]
 *
 * Trigger thresholds (must match triggerService.js):
 *   rain_moderate:  >= 30mm/3hr
 *   rain_heavy:     >= 50mm/3hr
 *   heat_extreme:   >= 42°C
 *   aqi_severe:     >= 200
 *   cyclone:        OpenWeather ID 901
 *
 * Usage:
 *   node scripts/simulateRain.js rain_heavy Chennai
 *   node scripts/simulateRain.js heat Delhi
 *   node scripts/simulateRain.js aqi Delhi
 */

const axios = require('axios')

const API_BASE = process.env.API_URL || 'http://localhost:5001/api'

// FIX: all amounts now above their respective trigger thresholds
const SIMULATED_EVENTS = {
  rain_moderate: {
    weather: [{ id: 500, main: 'Rain', description: 'moderate rain' }],
    main:    { temp: 28, humidity: 92 },
    rain:    { '1h': 12.0, '3h': 36.0 },   // FIX: was 7.5 — below 30mm threshold
    label:   'Moderate Rain (36mm/3hr ≥ 30mm)'
  },
  rain_heavy: {
    weather: [{ id: 502, main: 'Rain', description: 'heavy intensity rain' }],
    main:    { temp: 26, humidity: 97 },
    rain:    { '1h': 25.0, '3h': 75.0 },   // FIX: was 15.0 — below 50mm threshold
    label:   'Heavy Rain (75mm/3hr ≥ 50mm)'
  },
  heat: {
    weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
    main:    { temp: 45.0, humidity: 18 },  // FIX: was missing, 45°C > 42°C threshold
    rain:    {},
    label:   'Extreme Heat (45°C ≥ 42°C)'
  },
  aqi: {
    weather: [{ id: 711, main: 'Smoke', description: 'smoke' }],
    main:    { temp: 32, humidity: 55 },
    rain:    {},
    // AQI is fetched separately — this just confirms location for test
    mockAqi: 215,                            // FIX: 215 ≥ 200 threshold
    label:   'Severe AQI (AQI 215 ≥ 200)'
  },
  cyclone: {
    weather: [{ id: 901, main: 'Squall', description: 'tropical storm' }],
    main:    { temp: 29, humidity: 98 },
    rain:    { '1h': 30.0, '3h': 90.0 },
    label:   'Cyclone / Tropical Storm Alert'
  },
  thunderstorm: {
    weather: [{ id: 211, main: 'Thunderstorm', description: 'thunderstorm' }],
    main:    { temp: 27, humidity: 95 },
    rain:    { '1h': 18.0, '3h': 54.0 },   // Above heavy threshold
    label:   'Thunderstorm (54mm/3hr ≥ 50mm)'
  }
}

const runSimulation = (eventType = 'rain_heavy', city = 'Chennai') => {
  const event = SIMULATED_EVENTS[eventType]
  if (!event) {
    console.error(`Unknown event type: ${eventType}`)
    console.log('Available events:', Object.keys(SIMULATED_EVENTS).join(', '))
    process.exit(1)
  }

  console.log('\n=== GigShield Parametric Trigger Simulator ===')
  console.log(`Event:    ${event.label}`)
  console.log(`City:     ${city}`)
  console.log(`Time:     ${new Date().toISOString()}`)
  console.log('\nSimulated weather payload:')
  console.log(JSON.stringify({ ...event, name: city }, null, 2))

  if (event.rain?.['3h']) {
    const threshold = event.weather[0].main === 'Rain' ? 50 : 0
    console.log(`\nRainfall: ${event.rain['3h']}mm/3hr (threshold: ${threshold}mm) → ${event.rain['3h'] >= threshold ? 'TRIGGER FIRES ✓' : 'below threshold'}`)
  }
  if (event.main?.temp >= 42) {
    console.log(`Heat:     ${event.main.temp}°C (threshold: 42°C) → TRIGGER FIRES ✓`)
  }
  if (event.mockAqi >= 200) {
    console.log(`AQI:      ${event.mockAqi} (threshold: 200) → TRIGGER FIRES ✓`)
  }

  console.log('\nTo test the full auto-claim flow:')
  console.log('1. Start the backend: cd backend && npm run dev')
  console.log('2. Create a worker account with location =', city)
  console.log('3. Create an active policy')
  console.log('4. POST /api/admin/simulate-trigger (admin only) — see adminRoutes.js')
  console.log('5. Check /api/claims to see the auto-generated claim\n')
}

const eventType = process.argv[2] || 'rain_heavy'
const city      = process.argv[3] || 'Chennai'
runSimulation(eventType, city)

module.exports = { SIMULATED_EVENTS, runSimulation }
