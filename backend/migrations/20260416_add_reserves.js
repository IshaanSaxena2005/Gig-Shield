/**
 * 20260416_add_reserves
 * ---------------------
 * Creates the `reserves` table — a signed ledger for solvency tracking.
 *
 * ── Current sync strategy ───────────────────────────────────────────────────
 * App uses `sequelize.sync({ alter: true })` in config/db.js, so this
 * migration is REDUNDANT for local dev — the table auto-creates from
 * models/Reserve.js on every boot. Keep this file for when you move off
 * `sync` for production (alter-in-place is unsafe against real data).
 *
 * See 20260416_add_notifications.js for the sequelize-cli setup steps.
 *
 * ── FK note ─────────────────────────────────────────────────────────────────
 * allocated_to_claim_id is intentionally NOT a hard FK — claims can be
 * purged or archived, but the ledger entry must survive for audit. If you
 * want a soft reference, add `ON DELETE SET NULL`.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('reserves', {
      id: {
        type:          Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey:    true
      },
      reserve_type: {
        type:      Sequelize.ENUM('liquidity', 'claims_pending', 'operational', 'reinsurance'),
        allowNull: false
      },
      amount: {
        type:      Sequelize.DECIMAL(12, 2),
        allowNull: false
        // signed — positive = deposit, negative = deduction
      },
      currency: {
        type:         Sequelize.STRING(3),
        allowNull:    false,
        defaultValue: 'INR'
      },
      allocated_to_claim_id: {
        type:      Sequelize.INTEGER,
        allowNull: true
        // soft reference — see file header
      },
      reference: {
        type:      Sequelize.STRING(128),
        allowNull: true
        // idempotency key — UNIQUE with reserve_type
      },
      expires_at: {
        type:      Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type:         Sequelize.JSON,
        allowNull:    true,
        defaultValue: {}
      },
      created_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.NOW
      }
    })

    // Idempotency — prevents double-write of same external op
    await queryInterface.addIndex('reserves', ['reserve_type', 'reference'], {
      unique: true,
      name:   'reserves_type_reference_unique'
    })
    // Pool-sum queries: SUM(amount) WHERE reserve_type = ?
    await queryInterface.addIndex('reserves', ['reserve_type'], {
      name: 'reserves_reserve_type'
    })
    // Release-lookup: find pending allocation for a claim
    await queryInterface.addIndex('reserves', ['allocated_to_claim_id'], {
      name: 'reserves_allocated_to_claim_id'
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('reserves')
  }
}
