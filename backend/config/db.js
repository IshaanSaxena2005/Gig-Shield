const { Sequelize, DataTypes } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
})

const ensureColumn = async (queryInterface, tableName, columnName, definition) => {
  const table = await queryInterface.describeTable(tableName)
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition)
    console.log(`Added missing column ${tableName}.${columnName}`)
  }
}

const syncSqliteSchema = async () => {
  const queryInterface = sequelize.getQueryInterface()

  await ensureColumn(queryInterface, 'Policies', 'location', {
    type: DataTypes.STRING,
    allowNull: true
  })
  await ensureColumn(queryInterface, 'Policies', 'occupation', {
    type: DataTypes.STRING,
    allowNull: true
  })
  await ensureColumn(queryInterface, 'Policies', 'riskLevel', {
    type: DataTypes.STRING,
    allowNull: true
  })
  await ensureColumn(queryInterface, 'Policies', 'recommendedCoverageHours', {
    type: DataTypes.INTEGER,
    allowNull: true
  })
  await ensureColumn(queryInterface, 'Policies', 'pricingBreakdown', {
    type: DataTypes.JSON,
    allowNull: true
  })
  await ensureColumn(queryInterface, 'Policies', 'eligibleTriggers', {
    type: DataTypes.JSON,
    allowNull: true
  })
  await ensureColumn(queryInterface, 'Policies', 'paymentStatus', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending'
  })
  await ensureColumn(queryInterface, 'Policies', 'lastPaymentAt', {
    type: DataTypes.DATE,
    allowNull: true
  })

  await ensureColumn(queryInterface, 'Claims', 'source', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'manual'
  })
  await ensureColumn(queryInterface, 'Claims', 'triggerType', {
    type: DataTypes.STRING,
    allowNull: true
  })
  await ensureColumn(queryInterface, 'Claims', 'notes', {
    type: DataTypes.TEXT,
    allowNull: true
  })

  await ensureColumn(queryInterface, 'Users', 'averageDailyIncome', {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  })
}

const connectDB = async () => {
  try {
    await sequelize.authenticate()
    console.log('SQLite Connected successfully')

    await sequelize.sync()
    await syncSqliteSchema()
    console.log('Database synchronized')
  } catch (error) {
    console.error('Unable to connect to the database:', error)
    process.exit(1)
  }
}

module.exports = { sequelize, connectDB }
