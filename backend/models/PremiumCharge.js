/**
 * PremiumCharge.js
 * ----------------
 * Transaction log for every premium deduction attempt.
 *
 * One row per daily collection attempt per user. Unlike UserBalance (which
 * is a materialized cache), PremiumCharge is the authoritative ledger —
 * the source of truth for what was charged, when, by which method, and
 * whether it succeeded.
 *
 * Query patterns:
 *   - Today's collections:  WHERE charge_date = ? AND status = 'success'
 *   - Failed retries:       WHERE status = 'failed' AND retry_count < 3
 *   - Lifetime paid by user: SUM(amount) WHERE user_id = ? AND status = 'success'
 */

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const PremiumCharge = sequelize.define('PremiumCharge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: 'Users', key: 'id' },
    onDelete:   'CASCADE'
  },
  policy_id: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: 'Policies', key: 'id' },
    onDelete:   'CASCADE'
  },
  amount: {
    type:      DataTypes.DECIMAL(10, 2),
    allowNull: false
    // Daily premium slice: policy.premium / 7
  },
  charge_date: {
    type:      DataTypes.DATEONLY,
    allowNull: false
    // The calendar day this charge covers. Used with a unique index to
    // prevent double-collection on the same day.
  },
  status: {
    type:         DataTypes.ENUM('pending', 'success', 'failed'),
    allowNull:    false,
    defaultValue: 'pending'
  },
  payment_method: {
    type:         DataTypes.ENUM('platform_earnings', 'upi', 'wallet'),
    allowNull:    false,
    defaultValue: 'platform_earnings'
  },
  reference: {
    type:      DataTypes.STRING(128),
    allowNull: true
    // External transaction id from the platform / Razorpay
  },
  error_message: {
    type:      DataTypes.TEXT,
    allowNull: true
  },
  retry_count: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0
  },
  processed_at: {
    type:      DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName:  'premium_charges',
  timestamps: false,
  indexes: [
    // Most common queries: by-user, by-status, by-date
    { fields: ['user_id', 'charge_date'] },
    { fields: ['status'] },
    // Prevents accidental double-collection on the same day for the same user+policy
    { fields: ['user_id', 'policy_id', 'charge_date'], unique: true, name: 'premium_charges_unique_daily' }
  ]
})

// ── Associations ─────────────────────────────────────────────────────────────
const User   = require('./User')
const Policy = require('./Policy')
PremiumCharge.belongsTo(User,   { foreignKey: 'user_id',   as: 'user' })
PremiumCharge.belongsTo(Policy, { foreignKey: 'policy_id', as: 'policy' })
User.hasMany(PremiumCharge,     { foreignKey: 'user_id',   as: 'premiumCharges' })
Policy.hasMany(PremiumCharge,   { foreignKey: 'policy_id', as: 'premiumCharges' })

module.exports = PremiumCharge
