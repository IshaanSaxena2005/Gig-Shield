/**
 * seeds/seedRiskZones.js
 * ----------------------
 * Populates the RiskZone table with Indian city risk data.
 * Run once after first DB setup:
 *   node backend/seeds/seedRiskZones.js
 */

require('dotenv').config({ path: '../../.env' })
const { connectDB } = require('../config/db')
const RiskZone = require('../models/RiskZone')

const RISK_ZONES = [
  {
    location: 'Chennai',
    riskLevel: 'high',
    weatherConditions: {
      primaryHazard: 'NE Monsoon rainfall + Cyclones',
      avgRainDaysPerMonth: 3.8,
      avgHeatDaysPerMonth: 1.2,
      avgAqiSevereDaysPerMonth: 2.1,
      avgCycloneAlertDaysPerMonth: 0.4,
      peakRiskMonths: ['Oct', 'Nov', 'Dec'],
      notes: 'Coastal city — highest flood risk in India for delivery workers'
    }
  },
  {
    location: 'Mumbai',
    riskLevel: 'high',
    weatherConditions: {
      primaryHazard: 'SW Monsoon + Urban flooding',
      avgRainDaysPerMonth: 4.2,
      avgHeatDaysPerMonth: 0.8,
      avgAqiSevereDaysPerMonth: 1.8,
      avgCycloneAlertDaysPerMonth: 0.3,
      peakRiskMonths: ['Jun', 'Jul', 'Aug'],
      notes: 'Highest rainfall volume in India — delivery halts common during July'
    }
  },
  {
    location: 'Delhi',
    riskLevel: 'high',
    weatherConditions: {
      primaryHazard: 'Extreme heat + Severe AQI (winter smog)',
      avgRainDaysPerMonth: 1.6,
      avgHeatDaysPerMonth: 3.4,
      avgAqiSevereDaysPerMonth: 5.2,
      avgCycloneAlertDaysPerMonth: 0.0,
      peakRiskMonths: ['May', 'Jun', 'Nov', 'Dec'],
      notes: 'Dual risk: summer heatwaves + winter AQI crisis. Unique among major cities.'
    }
  },
  {
    location: 'Bengaluru',
    riskLevel: 'medium',
    weatherConditions: {
      primaryHazard: 'Moderate rainfall',
      avgRainDaysPerMonth: 2.4,
      avgHeatDaysPerMonth: 0.4,
      avgAqiSevereDaysPerMonth: 1.2,
      avgCycloneAlertDaysPerMonth: 0.0,
      peakRiskMonths: ['Sep', 'Oct'],
      notes: 'Relatively lower risk. Urban flooding isolated to specific areas.'
    }
  },
  {
    location: 'Hyderabad',
    riskLevel: 'medium',
    weatherConditions: {
      primaryHazard: 'Moderate rain + Heat',
      avgRainDaysPerMonth: 2.1,
      avgHeatDaysPerMonth: 1.8,
      avgAqiSevereDaysPerMonth: 1.4,
      avgCycloneAlertDaysPerMonth: 0.1,
      peakRiskMonths: ['Jun', 'Jul', 'May'],
      notes: 'Moderate risk profile. Occasional severe flooding in low-lying areas.'
    }
  },
  {
    location: 'Pune',
    riskLevel: 'low',
    weatherConditions: {
      primaryHazard: 'Mild seasonal rain',
      avgRainDaysPerMonth: 1.8,
      avgHeatDaysPerMonth: 0.6,
      avgAqiSevereDaysPerMonth: 0.9,
      avgCycloneAlertDaysPerMonth: 0.0,
      peakRiskMonths: ['Jul', 'Aug'],
      notes: 'Lowest risk of major metros. Cooler climate reduces heat events.'
    }
  },
  {
    location: 'Kolkata',
    riskLevel: 'high',
    weatherConditions: {
      primaryHazard: 'Monsoon flooding + Cyclones (Bay of Bengal)',
      avgRainDaysPerMonth: 3.6,
      avgHeatDaysPerMonth: 1.4,
      avgAqiSevereDaysPerMonth: 2.8,
      avgCycloneAlertDaysPerMonth: 0.5,
      peakRiskMonths: ['Jun', 'Jul', 'Oct'],
      notes: 'Cyclone exposure similar to Chennai. Monsoon flooding frequent.'
    }
  }
]

const seed = async () => {
  await connectDB()
  let created = 0, updated = 0

  for (const zone of RISK_ZONES) {
    const [, isNew] = await RiskZone.upsert(zone)
    isNew ? created++ : updated++
    console.log(`${isNew ? '✅ Created' : '🔄 Updated'}: ${zone.location} (${zone.riskLevel})`)
  }

  console.log(`\nSeed complete: ${created} created, ${updated} updated`)
  process.exit(0)
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1) })
