/**
 * DeviceFingerprint.js
 * --------------------
 * Tracks which devices have been seen on each user account. The core data
 * feeding the fraudEngine's `multi_account` flag:
 *
 *     "Has device X been used by more than one user?"
 *
 * Written to at login + register via authController hook. One row per
 * (user_id, device_id) — subsequent logins from the same device just bump
 * last_seen_at + seen_count.
 *
 * Cross-user lookup (fraudEngine): SELECT user_id FROM device_fingerprints
 * WHERE device_id = ? — if the result set has >1 distinct user, flag it.
 */

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const DeviceFingerprint = sequelize.define('DeviceFingerprint', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true
  },
  user_id: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete:  'CASCADE'
  },
  // Stable client-supplied identifier (UUID/hash from fingerprintjs, Incognia SDK,
  // or derived from IP+UA as a last resort). Length capped to 64 — fits SHA-256.
  device_id: {
    type:      DataTypes.STRING(64),
    allowNull: false
  },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  ip_address: { type: DataTypes.STRING(45),  allowNull: true },   // 45 = max IPv6 len
  // Raw fingerprint payload (screen res, timezone, languages, platform, etc.)
  fingerprint_data: {
    type:         DataTypes.JSON,
    allowNull:    true,
    defaultValue: {}
  },
  // Cached fraud-intel score from last Incognia/IPQS call. 0–100, higher = riskier.
  risk_score: {
    type:      DataTypes.INTEGER,
    allowNull: true
  },
  // 'incognia' | 'ipqs' | 'mock' | null
  risk_provider: {
    type:      DataTypes.STRING(32),
    allowNull: true
  },
  risk_checked_at: {
    type:      DataTypes.DATE,
    allowNull: true
  },
  first_seen_at: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW
  },
  last_seen_at: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW
  },
  seen_count: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 1
  }
}, {
  tableName:  'device_fingerprints',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  'updated_at',
  indexes: [
    // Idempotency — bump seen_count instead of inserting duplicates
    { unique: true, fields: ['user_id', 'device_id'], name: 'devfp_user_device_unique' },
    // Hot path: find all users who've used a device
    { fields: ['device_id'] },
    { fields: ['user_id'] }
  ]
})

// ── Associations ────────────────────────────────────────────────────────────
const User = require('./User')
DeviceFingerprint.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
User.hasMany(DeviceFingerprint,   { foreignKey: 'user_id', as: 'devices' })

module.exports = DeviceFingerprint
