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
    latitude: 13.0827,
    longitude: 80.2707,
    weatherConditions: {
      primaryHazard: 'NE Monsoon rainfall + Cyclones',
      avgRainDaysPerMonth: 3.8,
      avgHeatDaysPerMonth: 1.2,
      avgAqiSevereDaysPerMonth: 2.1,
      avgCycloneAlertDaysPerMonth: 0.4,
      peakRiskMonths: ['Oct', 'Nov', 'Dec'],
      notes: 'Coastal city — highest flood risk in India for delivery workers'
    },
    subZones: [
      { zone: 't. nagar',      pincode: '600017', riskLevel: 'high',   floodProne: true,  industrialAQI: false },
      { zone: 'mylapore',      pincode: '600004', riskLevel: 'high',   floodProne: true,  industrialAQI: false },
      { zone: 'velachery',     pincode: '600042', riskLevel: 'high',   floodProne: true,  industrialAQI: false },
      { zone: 'adyar',         pincode: '600020', riskLevel: 'medium', floodProne: false, industrialAQI: false },
      { zone: 'anna nagar',    pincode: '600040', riskLevel: 'medium', floodProne: false, industrialAQI: false },
      { zone: 'ambattur',      pincode: '600053', riskLevel: 'high',   floodProne: true,  industrialAQI: true  },
      { zone: 'sholinganallur',pincode: '600119', riskLevel: 'medium', floodProne: false, industrialAQI: false }
    ]
  },
  {
    location: 'Mumbai',
    riskLevel: 'high',
    latitude: 19.0760,
    longitude: 72.8777,
    weatherConditions: {
      primaryHazard: 'SW Monsoon + Urban flooding',
      avgRainDaysPerMonth: 4.2,
      avgHeatDaysPerMonth: 0.8,
      avgAqiSevereDaysPerMonth: 1.8,
      avgCycloneAlertDaysPerMonth: 0.3,
      peakRiskMonths: ['Jun', 'Jul', 'Aug'],
      notes: 'Highest rainfall volume in India — delivery halts common during July'
    },
    subZones: [
      { zone: 'dharavi',       pincode: '400017', riskLevel: 'high',   floodProne: true,  industrialAQI: true  },
      { zone: 'kurla',         pincode: '400070', riskLevel: 'high',   floodProne: true,  industrialAQI: false },
      { zone: 'andheri',       pincode: '400053', riskLevel: 'medium', floodProne: false, industrialAQI: false },
      { zone: 'bandra',        pincode: '400050', riskLevel: 'medium', floodProne: false, industrialAQI: false },
      { zone: 'dadar',         pincode: '400014', riskLevel: 'high',   floodProne: true,  industrialAQI: false },
      { zone: 'sion',          pincode: '400022', riskLevel: 'high',   floodProne: true,  industrialAQI: false },
      { zone: 'powai',         pincode: '400076', riskLevel: 'low',    floodProne: false, industrialAQI: false }
    ]
  },
  {
    location: 'Delhi',
    riskLevel: 'high',
    latitude: 28.7041,
    longitude: 77.1025,
    weatherConditions: {
      primaryHazard: 'Extreme heat + Severe AQI (winter smog)',
      avgRainDaysPerMonth: 1.6,
      avgHeatDaysPerMonth: 3.4,
      avgAqiSevereDaysPerMonth: 5.2,
      avgCycloneAlertDaysPerMonth: 0.0,
      peakRiskMonths: ['May', 'Jun', 'Nov', 'Dec'],
      notes: 'Dual risk: summer heatwaves + winter AQI crisis. Unique among major cities.'
    },
    subZones: [
      { zone: 'anand vihar',   pincode: '110092', riskLevel: 'high',   floodProne: false, industrialAQI: true  },
      { zone: 'okhla',         pincode: '110025', riskLevel: 'high',   floodProne: false, industrialAQI: true  },
      { zone: 'dwarka',        pincode: '110075', riskLevel: 'medium', floodProne: false, industrialAQI: false },
      { zone: 'rohini',        pincode: '110085', riskLevel: 'medium', floodProne: false, industrialAQI: true  },
      { zone: 'connaught place',pincode:'110001', riskLevel: 'medium', floodProne: false, industrialAQI: false },
      { zone: 'yamuna bank',   pincode: '110096', riskLevel: 'high',   floodProne: true,  industrialAQI: true  }
    ]
  },
  {
    location: 'Bengaluru',
    riskLevel: 'medium',
    latitude: 12.9716,
    longitude: 77.5946,
    weatherConditions: {
      primaryHazard: 'Moderate rainfall',
      avgRainDaysPerMonth: 2.4,
      avgHeatDaysPerMonth: 0.4,
      avgAqiSevereDaysPerMonth: 1.2,
      avgCycloneAlertDaysPerMonth: 0.0,
      peakRiskMonths: ['Sep', 'Oct'],
      notes: 'Relatively lower risk. Urban flooding isolated to specific areas.'
    },
    subZones: [
      { zone: 'bellandur',     pincode: '560103', riskLevel: 'high',   floodProne: true,  industrialAQI: false },
      { zone: 'marathahalli',  pincode: '560037', riskLevel: 'high',   floodProne: true,  industrialAQI: false },
      { zone: 'whitefield',    pincode: '560066', riskLevel: 'medium', floodProne: false, industrialAQI: false },
      { zone: 'koramangala',   pincode: '560034', riskLevel: 'low',    floodProne: false, industrialAQI: false },
      { zone: 'electronic city',pincode:'560100', riskLevel: 'low',    floodProne: false, industrialAQI: false }
    ]
  },
  {
    location: 'Hyderabad',
    riskLevel: 'medium',
    latitude: 17.3850,
    longitude: 78.4867,
    weatherConditions: {
      primaryHazard: 'Moderate rain + Heat',
      avgRainDaysPerMonth: 2.1,
      avgHeatDaysPerMonth: 1.8,
      avgAqiSevereDaysPerMonth: 1.4,
      avgCycloneAlertDaysPerMonth: 0.1,
      peakRiskMonths: ['Jun', 'Jul', 'May'],
      notes: 'Moderate risk profile. Occasional severe flooding in low-lying areas.'
    },
    subZones: [
      { zone: 'lb nagar',      pincode: '500074', riskLevel: 'high',   floodProne: true,  industrialAQI: false },
      { zone: 'kukatpally',    pincode: '500072', riskLevel: 'medium', floodProne: false, industrialAQI: true  },
      { zone: 'gachibowli',    pincode: '500032', riskLevel: 'low',    floodProne: false, industrialAQI: false },
      { zone: 'hitech city',   pincode: '500081', riskLevel: 'low',    floodProne: false, industrialAQI: false }
    ]
  },
  {
    location: 'Pune',
    riskLevel: 'low',
    latitude: 18.5204,
    longitude: 73.8567,
    weatherConditions: {
      primaryHazard: 'Mild seasonal rain',
      avgRainDaysPerMonth: 1.8,
      avgHeatDaysPerMonth: 0.6,
      avgAqiSevereDaysPerMonth: 0.9,
      avgCycloneAlertDaysPerMonth: 0.0,
      peakRiskMonths: ['Jul', 'Aug'],
      notes: 'Lowest risk of major metros. Cooler climate reduces heat events.'
    },
    subZones: [
      { zone: 'katraj',        pincode: '411046', riskLevel: 'medium', floodProne: true,  industrialAQI: false },
      { zone: 'hadapsar',      pincode: '411028', riskLevel: 'medium', floodProne: false, industrialAQI: true  },
      { zone: 'kothrud',       pincode: '411038', riskLevel: 'low',    floodProne: false, industrialAQI: false },
      { zone: 'hinjewadi',     pincode: '411057', riskLevel: 'low',    floodProne: false, industrialAQI: false }
    ]
  },
  {
    location: 'Kolkata',
    riskLevel: 'high',
    latitude: 22.5726,
    longitude: 88.3639,
    weatherConditions: {
      primaryHazard: 'Monsoon flooding + Cyclones (Bay of Bengal)',
      avgRainDaysPerMonth: 3.6,
      avgHeatDaysPerMonth: 1.4,
      avgAqiSevereDaysPerMonth: 2.8,
      avgCycloneAlertDaysPerMonth: 0.5,
      peakRiskMonths: ['Jun', 'Jul', 'Oct'],
      notes: 'Cyclone exposure similar to Chennai. Monsoon flooding frequent.'
    },
    subZones: [
      { zone: 'howrah',        pincode: '711101', riskLevel: 'high',   floodProne: true,  industrialAQI: true  },
      { zone: 'salt lake',     pincode: '700091', riskLevel: 'medium', floodProne: false, industrialAQI: false },
      { zone: 'dum dum',       pincode: '700028', riskLevel: 'high',   floodProne: true,  industrialAQI: false },
      { zone: 'jadavpur',      pincode: '700032', riskLevel: 'medium', floodProne: false, industrialAQI: false },
      { zone: 'behala',        pincode: '700034', riskLevel: 'high',   floodProne: true,  industrialAQI: false }
    ]
  },
  {
    location: 'Ahmedabad',
    riskLevel: 'medium',
    latitude: 23.0225,
    longitude: 72.5714,
    weatherConditions: {
      primaryHazard: 'Extreme heat + Moderate AQI',
      avgRainDaysPerMonth: 1.4,
      avgHeatDaysPerMonth: 4.2,
      avgAqiSevereDaysPerMonth: 2.1,
      avgCycloneAlertDaysPerMonth: 0.1,
      peakRiskMonths: ['Apr', 'May', 'Jun'],
      notes: 'Hottest major city. Heat-driven losses dominate risk profile.'
    },
    subZones: [
      { zone: 'naroda',        pincode: '382330', riskLevel: 'high',   floodProne: false, industrialAQI: true  },
      { zone: 'vatva',         pincode: '382440', riskLevel: 'high',   floodProne: false, industrialAQI: true  },
      { zone: 'navrangpura',   pincode: '380009', riskLevel: 'low',    floodProne: false, industrialAQI: false },
      { zone: 'sg highway',    pincode: '380054', riskLevel: 'low',    floodProne: false, industrialAQI: false }
    ]
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
