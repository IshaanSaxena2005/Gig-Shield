/**
 * JobAudit.js
 * -----------
 * Audit trail for background job executions.
 *
 * Each row records one invocation of a background job (parametric claim check,
 * policy auto-renewal, etc.) with its outcome, timings, retry state, and any
 * error details. Jobs that exhaust their retries are marked as 'dead_letter'
 * so an admin can inspect and re-run them manually.
 *
 * Query patterns:
 *   - Recent failures:     WHERE status IN ('failed','dead_letter') ORDER BY started_at DESC
 *   - Job health:          GROUP BY job_name, status over last 24h
 *   - Stuck jobs:          WHERE completed_at IS NULL AND started_at < NOW() - INTERVAL 10 MIN
 */

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const JobAudit = sequelize.define('JobAudit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  job_name: {
    type: DataTypes.STRING(64),
    allowNull: false
    // e.g. 'parametric_claim_check', 'policy_auto_renewal'
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
    // null while running or crashed without finalising
  },
  status: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'running'
    // 'running' | 'success' | 'failed' | 'retried' | 'dead_letter'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  affected_records: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
    // count of claims/policies/etc. created or updated during this run
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
    // free-form context: e.g. { policiesChecked: 42, elapsedMs: 1850 }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'job_audits',
  timestamps: false,  // we manage started_at / completed_at explicitly
  indexes: [
    { fields: ['job_name', 'started_at'] },
    { fields: ['status'] }
  ]
})

module.exports = JobAudit
