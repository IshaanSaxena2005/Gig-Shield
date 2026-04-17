const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const RiskZone = sequelize.define('RiskZone', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  riskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false
  },
  weatherConditions: {
    type: DataTypes.JSON,
    allowNull: true
  },
  // Hyper-local: sub-zone risk data for intra-city granularity
  // Format: [{ zone: "T. Nagar", pincode: "600017", riskLevel: "high", floodProne: true, industrialAQI: false }]
  subZones: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  // City-level coordinates (centroid)
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
})

module.exports = RiskZone