/**
 * 20260416_add_notifications
 * --------------------------
 * Creates the `notifications` table used by the self-certification flow.
 *
 * ── Current sync strategy ───────────────────────────────────────────────────
 * The app currently uses `sequelize.sync({ alter: true })` in config/db.js,
 * which auto-creates/alters tables from models on every boot. That means this
 * migration is REDUNDANT for local dev — the table already exists.
 *
 * This file matters once you move off `sync` for production (recommended —
 * `alter: true` is unsafe against real data). To actually run it:
 *
 *   1. npm i -D sequelize-cli
 *   2. Add .sequelizerc pointing to this folder:
 *      module.exports = {
 *        'migrations-path': require('path').resolve('backend', 'migrations'),
 *        'config':          require('path').resolve('backend', 'config', 'sequelize-config.js')
 *      }
 *   3. Add a config/sequelize-config.js exporting dialect/storage per env
 *   4. npm run migrate  →  npx sequelize-cli db:migrate
 *
 * ── FK reference ────────────────────────────────────────────────────────────
 * The model `User` is defined with `sequelize.define('User', ...)` and no
 * `tableName` override. Sequelize's default pluraliser produces `Users`
 * (capital U). Your snippet used `'users'` — that would break on Postgres
 * or case-sensitive MySQL. Using `'Users'` here to match reality. If you
 * change the User model to `tableName: 'users'`, update this reference too.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notifications', {
      id: {
        type:          Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey:    true
      },
      user_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'Users', key: 'id' },
        onDelete:   'CASCADE',
        onUpdate:   'CASCADE'
      },
      type: {
        type:      Sequelize.STRING(48),
        allowNull: false
        // weather_trigger_confirmation | payout_received | policy_renewal
        // audit_pending | clawback_initiated | dispute_resolved
      },
      title: {
        type:      Sequelize.STRING(200),
        allowNull: false
      },
      message: {
        type:      Sequelize.TEXT,
        allowNull: false
      },
      data: {
        type:         Sequelize.JSON,
        allowNull:    true,
        defaultValue: {}
      },
      is_read: {
        type:         Sequelize.BOOLEAN,
        allowNull:    false,
        defaultValue: false
      },
      expires_at: {
        type:      Sequelize.DATE,
        allowNull: false
        // Default handled by the model (now + 30 days). Explicit NOT NULL
        // so cleanup queries can always rely on the field.
      },
      created_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.NOW
      },
      read_at: {
        type:      Sequelize.DATE,
        allowNull: true
      }
    })

    // Indexes — match the three defined on the model for query performance
    await queryInterface.addIndex('notifications', ['user_id', 'is_read'], {
      name: 'notifications_user_id_is_read'
    })
    await queryInterface.addIndex('notifications', ['user_id', 'type', 'is_read'], {
      name: 'notifications_user_id_type_is_read'
    })
    await queryInterface.addIndex('notifications', ['expires_at'], {
      name: 'notifications_expires_at'
    })
  },

  down: async (queryInterface) => {
    // Indexes are dropped automatically when the table is dropped.
    await queryInterface.dropTable('notifications')
  }
}
