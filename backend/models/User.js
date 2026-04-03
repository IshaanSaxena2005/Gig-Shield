const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('worker', 'admin'),
    defaultValue: 'worker'
  },
  // FIX: replaced generic 'occupation' string with specific delivery platform ENUM
  platform: {
    type: DataTypes.ENUM('Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other'),
    allowNull: true
  },
  // Kept for backward compat with existing frontend selects
  occupation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // FIX: added — partner ID from the platform (e.g. Z-CHN-48120)
  platformId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // FIX: added — delivery zone within city (e.g. "T. Nagar / Mylapore")
  deliveryZone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // FIX: added — used by payout calculator: payout = hours_lost × (avgDailyEarnings / workHoursPerDay)
  avgDailyEarnings: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 700.00   // conservative default for new workers
  },
  // FIX: added — typical work hours per day, used to compute hourly rate
  workHoursPerDay: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true,
    defaultValue: 6.0
  },
  // Password reset fields
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
})

module.exports = User
