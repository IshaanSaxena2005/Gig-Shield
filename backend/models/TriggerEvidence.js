/**
 * TriggerEvidence.js
 * ------------------
 * Immutable per-source reading log. One row per (source × fetch) — many rows
 * per claim. Split by `stage`:
 *   - 'trigger'          recorded when the parametric claim fired
 *   - 'dispute_recheck'  recorded when a worker disputes; disputeService re-queries
 *
 * Evidence rows are append-only (NEVER updated) — this is the audit trail
 * the dispute + trust layers rely on.
 */

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const TriggerEvidence = sequelize.define('TriggerEvidence', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true
  },
  claim_id: {
    type:      DataTypes.INTEGER,
    allowNull: true
    // soft reference — claim may be created AFTER evidence is gathered
    // (dataSourceManager can poll even when no claim fires)
  },
  stage: {
    type:         DataTypes.ENUM('trigger', 'dispute_recheck', 'survey', 'poll'),
    allowNull:    false,
    defaultValue: 'trigger'
  },
  source: {
    type:      DataTypes.STRING(32),
    allowNull: false
    // cpcb | purpleair | google_env | imd | openmeteo | rider_survey
  },
  source_tier: {
    type:      DataTypes.INTEGER,
    allowNull: false
    // 1 = primary (CPCB, IMD), 2 = secondary (PurpleAir, Open-Meteo),
    // 3 = tertiary (satellite, human survey)
  },
  reading_type: {
    type:      DataTypes.STRING(16),
    allowNull: false
    // aqi | rain | temperature | wind
  },
  reading_value: {
    type:      DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  unit: {
    type:      DataTypes.STRING(16),
    allowNull: true
  },
  location: {
    type:      DataTypes.STRING(120),
    allowNull: true
  },
  latitude:  { type: DataTypes.DECIMAL(9, 6), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
  fetched_at: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW
  },
  latency_ms: { type: DataTypes.INTEGER, allowNull: true },
  success:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  error:      { type: DataTypes.TEXT,    allowNull: true },
  metadata:   { type: DataTypes.JSON,    allowNull: true, defaultValue: {} }
}, {
  tableName:  'trigger_evidence',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  'updated_at',
  indexes: [
    { fields: ['claim_id'] },
    { fields: ['claim_id', 'stage'] },
    { fields: ['source'] },
    { fields: ['fetched_at'] }
  ]
})

module.exports = TriggerEvidence
