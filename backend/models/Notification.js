/**
 * Notification.js
 * ---------------
 * Per-user in-app notifications.
 *
 * Used for:
 *   - weather_trigger_confirmation — prompt worker to self-certify an auto-claim
 *   - claim_confirmed                — acknowledge worker's confirmation; payout queued
 *   - claim_disputed                 — acknowledge worker's dispute; no payout
 *   - payout_sent                    — disbursement completed; money is in the worker's account
 *   - audit_selected                 — claim has been routed to the admin audit queue
 *   - clawback_initiated             — prior payout is being reversed
 *   - policy_renewal                 — upcoming renewal / expiry reminder
 *   - payment_failed                 — daily premium deduction failed (platform + UPI both down,
 *                                      or policy suspended after max retries)
 *   - policy_reactivated             — admin un-suspended a previously frozen policy
 *   - reserve_low                    — [admin] solvency ratio < 0.8 (warning)
 *   - reserve_critical               — [admin] solvency ratio < 0.6; new policy sales auto-halted
 *
 * Auto-expiry: rows older than expires_at (default 30 days from creation)
 * should be deleted by a periodic cleanup job. Sequelize doesn't expire rows
 * itself — see services/notificationCleanupService.js (or add to jobScheduler).
 *
 * Query patterns:
 *   - Unread count:      WHERE user_id = ? AND is_read = false
 *   - Pending by type:   WHERE user_id = ? AND type = ? AND is_read = false
 *   - Cleanup:           WHERE expires_at < NOW()
 */

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users', // Sequelize's default pluralised table name for the User model
      key:   'id'
    },
    onDelete: 'CASCADE'
  },
  type: {
    type: DataTypes.STRING(48),
    allowNull: false
    // weather_trigger_confirmation | claim_confirmed | claim_disputed
    // payout_sent | audit_selected | clawback_initiated | policy_renewal
    // payment_failed | policy_reactivated | reserve_low | reserve_critical
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true
    // free-form context — e.g. { claimId: 42, payoutAmount: 850, triggerType: 'heavy_rain' }
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => new Date(Date.now() + THIRTY_DAYS_MS)
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'notifications',
  timestamps: false,  // we manage created_at / read_at explicitly
  indexes: [
    // Most common query: unread notifications for a user
    { fields: ['user_id', 'is_read'] },
    // "Pending self-certification" query: user + type + unread
    { fields: ['user_id', 'type', 'is_read'] },
    // Cleanup job scans by expires_at
    { fields: ['expires_at'] }
  ]
})

// Hook: auto-set read_at when is_read flips from false to true
Notification.beforeUpdate((notification) => {
  if (notification.changed('is_read') && notification.is_read && !notification.read_at) {
    notification.read_at = new Date()
  }
})

// ── Associations ─────────────────────────────────────────────────────────────
const User = require('./User')
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
User.hasMany(Notification,   { foreignKey: 'user_id', as: 'notifications' })

module.exports = Notification
module.exports.NOTIFICATION_TYPES = Object.freeze([
  'weather_trigger_confirmation',
  'claim_confirmed',
  'claim_disputed',
  'payout_sent',
  'audit_selected',
  'clawback_initiated',
  'policy_renewal',
  'payment_failed',
  'policy_reactivated',
  'reserve_low',
  'reserve_critical'
])
