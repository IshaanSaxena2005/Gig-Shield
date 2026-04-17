/**
 * Reserve.js
 * ----------
 * Financial reserves ledger for solvency tracking.
 *
 * Rows are LEDGER ENTRIES — positive or negative amounts per reserve_type.
 * Current pool size for a given type = SUM(amount) WHERE reserve_type = ?.
 *
 * Reserve types:
 *   - liquidity              — cash available to pay claims; admin tops up
 *   - claims_pending         — outstanding approved claims not yet disbursed
 *   - operational            — platform operating costs (ops reserve)
 *   - reinsurance            — recoverable from reinsurer for large events
 *
 * Idempotency: UNIQUE(reserve_type, reference) — same external operation
 * (e.g. `alloc-claim-42`) cannot create two rows. The `reference` column
 * is indexed so `createReserve` can upsert safely.
 */

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const Reserve = sequelize.define('Reserve', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true
  },
  reserve_type: {
    type:      DataTypes.ENUM('liquidity', 'claims_pending', 'operational', 'reinsurance'),
    allowNull: false
  },
  // Signed — positive = deposit, negative = deduction. Pool = SUM(amount).
  amount: {
    type:      DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  currency: {
    type:         DataTypes.STRING(3),
    allowNull:    false,
    defaultValue: 'INR'
  },
  // Link to the claim this allocation/release belongs to. Not a hard FK
  // (claims can be purged; we still want the ledger entry to survive).
  allocated_to_claim_id: {
    type:      DataTypes.INTEGER,
    allowNull: true
  },
  // Idempotency key — e.g. `alloc-claim-42`, `release-claim-42`,
  // `admin-topup-2026-04-16`. UNIQUE together with reserve_type.
  reference: {
    type:      DataTypes.STRING(128),
    allowNull: true
  },
  expires_at: {
    type:      DataTypes.DATE,
    allowNull: true
  },
  // Free-form context: { adminId, note, externalTxnId, reinsurerContractId, ... }
  metadata: {
    type:         DataTypes.JSON,
    allowNull:    true,
    defaultValue: {}
  }
}, {
  tableName:  'reserves',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  'updated_at',
  indexes: [
    // Idempotency — same external op can't double-write
    { unique: true, fields: ['reserve_type', 'reference'], name: 'reserves_type_reference_unique' },
    // Pool-sum queries: SUM(amount) WHERE reserve_type = ?
    { fields: ['reserve_type'] },
    // Release-lookup: find claim's pending allocation
    { fields: ['allocated_to_claim_id'] }
  ]
})

module.exports = Reserve
module.exports.RESERVE_TYPES = Object.freeze(['liquidity', 'claims_pending', 'operational', 'reinsurance'])
