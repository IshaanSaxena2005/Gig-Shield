const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')
const User = require('./User')
const Policy = require('./Policy')

const Claim = sequelize.define('Claim', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  policyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Policy,
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
})

// Define associations
Claim.belongsTo(User, { foreignKey: 'userId', as: 'user' })
Claim.belongsTo(Policy, { foreignKey: 'policyId', as: 'policy' })
User.hasMany(Claim, { foreignKey: 'userId', as: 'claims' })
Policy.hasMany(Claim, { foreignKey: 'policyId', as: 'claims' })

module.exports = Claim