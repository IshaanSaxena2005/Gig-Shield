/**
 * seedRiskZones.js
 * ----------------
 * Populates the RiskZone table with Indian cities.
 * Run once: node backend/seedRiskZones.js
 */

const { connectDB, sequelize } = require('./config/db')
const RiskZone = require('./models/RiskZone')
const dotenv   = require('dotenv')
dotenv.config({ path: '../.env' })

const RISK_ZONES = [
  { location: 'Chennai',   riskLevel: 'high',   weatherConditions: { monsoon: 'NE Oct-Jan', avgRainDays: 3.8, heatDays: 1.2, aqiDays: 2.1, cycloneRisk: 'high'   } },
  { location: 'Mumbai',    riskLevel: 'high',   weatherConditions: { monsoon: 'SW Jun-Sep', avgRainDays: 4.2, heatDays: 0.8, aqiDays: 1.8, cycloneRisk: 'medium' } },
  { location: 'Delhi',     riskLevel: 'high',   weatherConditions: { monsoon: 'SW Jul-Sep', avgRainDays: 1.6, heatDays: 3.4, aqiDays: 5.2, cycloneRisk: 'low'    } },
  { location: 'Hyderabad', riskLevel: 'medium', weatherConditions: { monsoon: 'SW Jun-Sep', avgRainDays: 2.1, heatDays: 1.8, aqiDays: 1.4, cycloneRisk: 'low'    } },
  { location: 'Bengaluru', riskLevel: 'medium', weatherConditions: { monsoon: 'SW Jun-Sep', avgRainDays: 2.4, heatDays: 0.4, aqiDays: 1.2, cycloneRisk: 'none'   } },
  { location: 'Kolkata',   riskLevel: 'high',   weatherConditions: { monsoon: 'SW Jun-Sep', avgRainDays: 3.5, heatDays: 1.0, aqiDays: 2.8, cycloneRisk: 'high'   } },
  { location: 'Pune',      riskLevel: 'low',    weatherConditions: { monsoon: 'SW Jun-Sep', avgRainDays: 1.8, heatDays: 0.6, aqiDays: 0.9, cycloneRisk: 'none'   } },
  { location: 'Ahmedabad', riskLevel: 'medium', weatherConditions: { monsoon: 'SW Jul-Sep', avgRainDays: 1.4, heatDays: 4.2, aqiDays: 2.1, cycloneRisk: 'low'    } },
  { location: 'Jaipur',    riskLevel: 'medium', weatherConditions: { monsoon: 'SW Jul-Sep', avgRainDays: 1.2, heatDays: 3.8, aqiDays: 2.4, cycloneRisk: 'none'   } },
  { location: 'Surat',     riskLevel: 'medium', weatherConditions: { monsoon: 'SW Jun-Sep', avgRainDays: 2.0, heatDays: 1.5, aqiDays: 1.6, cycloneRisk: 'medium' } },
]

const seed = async () => {
  await connectDB()
  let created = 0
  let skipped = 0
  for (const zone of RISK_ZONES) {
    const [, wasCreated] = await RiskZone.upsert(zone)
    wasCreated ? created++ : skipped++
  }
  console.log(`✅ Seeded ${created} new risk zones, updated ${skipped} existing.`)
  await sequelize.close()
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
