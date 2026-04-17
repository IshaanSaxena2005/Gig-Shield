/**
 * UserBalance.js
 * --------------
 * Per-user materialized cache of payout/premium history.
 *
 * One row per user (unique on user_id). Read in O(1) from the worker
 * dashboard instead of scanning all their Claims on every page load.
 *
 * Source of truth is still the Claim table — UserBalance is a derived view.
 * Recomputed by services/userBalanceService.recomputeForUser() whenever a
 * relevant claim event fires (confirm, dispute, disburse, clawback).
 *
 * Why materialize instead of computing on the fly:
 *   - Dashboard reads happen on every page view; updates on rare events
 *   - Aggregating across years of claims gets slow without an index
 *   - Lets us track "balance at point in time" if we add audit history later
 *
 * Why this is safe vs. drift:
 *   - Single recompute function (services/userBalanceService.recomputeForUser)
 *   - Always rebuilds from Claim — never updates fields directly
 *   - If anything ever looks off, run recompute() and you're back in sync
 */

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const UserBalance = sequelize.define('UserBalance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    unique:     true,    // one row per user
    references: { model: 'Users', key: 'id' },
    onDelete:   'CASCADE'
  },

  // Money in / out (cumulative)
  total_payouts_received: {
    type:         DataTypes.DECIMAL(12, 2),
    allowNull:    false,
    defaultValue: 0
  },
  total_premiums_paid: {
    type:         DataTypes.DECIMAL(12, 2),
    allowNull:    false,
    defaultValue: 0
  },

  // In-flight / informational
  pending_payout_amount: {
    type:         DataTypes.DECIMAL(12, 2),
    allowNull:    false,
    defaultValue: 0
    // Sum of claim amounts where payout_status='queued' or 'failed'
  },
  disputed_amount: {
    type:         DataTypes.DECIMAL(12, 2),
    allowNull:    false,
    defaultValue: 0
    // Sum of disputed claims — never paid; tracked for transparency
  },
  clawback_amount: {
    type:         DataTypes.DECIMAL(12, 2),
    allowNull:    false,
    defaultValue: 0
    // Sum of payouts reversed after the fact; for audit/regulatory reporting
  },

  // Claim counters
  claims_count: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0
  },
  approved_claims_count: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0
  },

  // Time markers
  last_payout_at: {
    type:      DataTypes.DATE,
    allowNull: true
  },
  last_premium_at: {
    type:      DataTypes.DATE,
    allowNull: true
  },
  updated_at: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW
  },
  created_at: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName:  'user_balances',
  timestamps: false,  // we manage created_at / updated_at explicitly
  indexes: [
    { fields: ['user_id'], unique: true }
  ]
})

// ── Associations ─────────────────────────────────────────────────────────────
const User = require('./User')
UserBalance.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
User.hasOne(UserBalance,    { foreignKey: 'user_id', as: 'balance' })

module.exports = UserBalance
