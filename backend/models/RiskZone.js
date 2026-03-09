const mongoose = require('mongoose')

const riskZoneSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  weatherConditions: [{
    condition: String,
    probability: Number
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('RiskZone', riskZoneSchema)