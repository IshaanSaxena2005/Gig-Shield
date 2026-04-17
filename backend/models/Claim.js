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
    references: { model: User, key: 'id' }
  },
  policyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Policy, key: 'id' }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // ── Lifecycle status ──────────────────────────────────────────────────────
  // Where the claim is in the review/verification pipeline.
  //   pending                        — manual claim awaiting admin review
  //   pending_verification           — auto-created by parametric trigger; worker must self-cert
  //   approved                       — passed review/verification, cleared for payout
  //   rejected                       — denied by admin
  //   flagged                        — fraud score tripped, in audit queue
  //   disputed                       — worker disputed ("I worked"); awaiting admin resolution
  //   halted_insufficient_reserves   — payout blocked by reserveService.checkBeforePayout;
  //                                    admin top-up + reactivation required
  //   under_review                   — disputeService found source conflict;
  //                                    awaiting manual admin resolution
  status: {
    type: DataTypes.ENUM(
      'pending',
      'pending_verification',
      'approved',
      'rejected',
      'flagged',
      'disputed',
      'halted_insufficient_reserves',
      'under_review'
    ),
    defaultValue: 'pending'
  },
  // ── Money status ──────────────────────────────────────────────────────────
  // Where the money is, independent of lifecycle. A claim can be status='approved'
  // and payout_status='failed' (disbursement bounced — needs retry); or
  // status='rejected' and payout_status='clawed_back' (fraud caught post-payout).
  //
  //   not_applicable        — no payout relevant (pending, disputed, rejected-before-payout)
  //   queued                — approved; disbursement job will pick it up
  //   disbursed             — money sent successfully
  //   failed                — disbursement attempted but failed (retryable)
  //   clawed_back           — payout reversed after the fact (post-audit fraud)
  payout_status: {
    type: DataTypes.ENUM(
      'not_applicable',
      'queued',
      'disbursed',
      'failed',
      'clawed_back'
    ),
    allowNull:    false,
    defaultValue: 'not_applicable'
  },
  // When the payout state last changed — useful for "stuck in queued" alerts
  payoutUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Stores which parametric trigger fired (rain/heat/aqi/cyclone/curfew)
  triggerType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Raw trigger value recorded at time of claim (e.g. "72mm", "AQI 214")
  triggerValue: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Distinguishes auto-claims (from triggerService) from manual submissions
  isAutoClaim: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // When the worker confirmed or disputed the auto-claim
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Free-text reason stored when a worker disputes (POST /claims/:id/dispute)
  disputeReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Admin review notes — stored when an admin approves/rejects/flags a claim
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
})

Claim.belongsTo(User,   { foreignKey: 'userId',   as: 'user' })
Claim.belongsTo(Policy, { foreignKey: 'policyId', as: 'policy' })
User.hasMany(Claim,     { foreignKey: 'userId',   as: 'claims' })
Policy.hasMany(Claim,   { foreignKey: 'policyId', as: 'claims' })

// ── Payout status derivation ────────────────────────────────────────────────
// Logic lives in utils/claimPayoutStatus.js — PURE, DB-free, fully testable.
// Attached here as a static + instance method for convenient call sites.
const { derivePayoutStatus } = require('../utils/claimPayoutStatus')

Claim.derivePayoutStatus = derivePayoutStatus

/**
 * Instance helper: compute the correct payout_status for this claim
 * based on its current state. PURE — does not save.
 */
Claim.prototype.nextPayoutStatus = function () {
  return derivePayoutStatus(this.toJSON())
}

module.exports = Claim
