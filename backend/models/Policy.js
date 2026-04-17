const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')
const User = require('./User')

const Policy = sequelize.define('Policy', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  premium: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  coverage: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  // 'paused'    — worker pauses their own policy
  // 'suspended' — system-initiated freeze after 3 consecutive premium failures
  //                (distinct from 'paused' so admin can distinguish causes)
  // 'expired'   — past end date
  // 'cancelled' — worker or admin cancels permanently
  status: {
    type: DataTypes.ENUM('active', 'paused', 'suspended', 'expired', 'cancelled'),
    defaultValue: 'active'
  },

  // ── Premium collection tracking (narrow money-health dimension) ───────────
  // These three fields describe only the premium-deduction pipeline, NOT the
  // broader policy lifecycle in `status` above. They can diverge on purpose:
  //   status='active' + premium_collection_status='failed_retry'
  //     → overall healthy, but one recent daily collection failed and will retry
  //   status='suspended' + premium_collection_status='suspended'
  //     → always in lockstep (service flips both when max retries hit)
  last_premium_collection_date: {
    type:      DataTypes.DATEONLY,
    allowNull: true
    // Date of the most recent SUCCESSFUL daily collection (YYYY-MM-DD).
    // Denormalised cache of MAX(PremiumCharge.charge_date WHERE status='success').
  },
  premium_collection_status: {
    type:         DataTypes.ENUM('active', 'failed_retry', 'suspended'),
    allowNull:    false,
    defaultValue: 'active'
    // 'active'       — most recent collection succeeded (or no collections attempted yet)
    // 'failed_retry' — recent failure(s), awaiting retry; policy still works
    // 'suspended'    — hit max consecutive failures; policy frozen until admin intervenes
  },
  consecutive_failures: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0
    // Resets to 0 on every successful collection. Per-policy counter distinct
    // from PremiumCharge.retry_count (which is per-charge).
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
})

Policy.belongsTo(User, { foreignKey: 'userId', as: 'user' })
User.hasMany(Policy, { foreignKey: 'userId', as: 'policies' })

module.exports = Policy