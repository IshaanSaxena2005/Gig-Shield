#!/usr/bin/env node
/**
 * testReserveHealth.js — CLI for exercising the reserve-health system.
 *
 * Usage:
 *   node backend/scripts/testReserveHealth.js seed <amount>
 *   node backend/scripts/testReserveHealth.js health
 *   node backend/scripts/testReserveHealth.js allocate <claimId> <amount>
 *   node backend/scripts/testReserveHealth.js decrease <amount> <reason...>
 *   node backend/scripts/testReserveHealth.js reset
 *   node backend/scripts/testReserveHealth.js interactive
 */

const path     = require('path')
const readline = require('readline')
const dotenv   = require('dotenv')
const { Op }   = require('sequelize')

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const { connectDB, sequelize } = require('../config/db')

require('../models/User')
require('../models/Policy')
require('../models/Claim')
require('../models/RiskZone')
require('../models/JobAudit')
require('../models/Notification')
require('../models/UserBalance')
require('../models/PremiumCharge')
const Reserve = require('../models/Reserve')

const reserveService = require('../services/reserveService')
const { THRESHOLDS } = reserveService

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const parsePositiveNumber = (raw, label = 'amount') => {
  const n = parseFloat(raw)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${label} must be a positive number (got "${raw}")`)
  }
  return n
}

const parsePositiveInt = (raw, label = 'value') => {
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0 || String(n) !== String(raw).trim()) {
    throw new Error(`${label} must be a positive integer (got "${raw}")`)
  }
  return n
}

const classify = (ratio) => {
  if (!Number.isFinite(ratio))                      return 'HEALTHY'
  if (ratio < THRESHOLDS.CRITICAL_RATIO)             return 'CRITICAL'
  if (ratio < THRESHOLDS.LOW_ALERT_RATIO)            return 'WARNING'
  return 'HEALTHY'
}

const policyAllowed = (ratio) =>
  !Number.isFinite(ratio) || ratio >= THRESHOLDS.CRITICAL_RATIO

const askOnce = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question(question, (ans) => { rl.close(); resolve(ans.trim()) })
})

// ── Commands ────────────────────────────────────────────────────────────────

async function seed(amountRaw) {
  const amount = parsePositiveNumber(amountRaw, 'amount')
  await reserveService.createReserve('liquidity', amount, {
    reference: `test-seed-${Date.now()}`,
    metadata:  { source: 'testReserveHealth.seed', timestamp: Date.now() }
  })
  console.log(`✅ Seeded ${fmt(amount)} liquidity reserve`)
}

async function health() {
  const snap = await reserveService.getSolvencySnapshot()
  const ratioStr = Number.isFinite(snap.ratio) ? snap.ratio.toFixed(3) : '∞'
  const status   = classify(snap.ratio)
  const allowed  = policyAllowed(snap.ratio) ? 'Yes' : 'No'

  console.log('── Reserve Health ───────────────────────────')
  console.log(`Solvency Ratio:        ${ratioStr}`)
  console.log(`Total Liquidity:       ${fmt(snap.liquidity)}`)
  console.log(`Total Claims Pending:  ${fmt(snap.claimsPending)}`)
  console.log(`Reinsurance:           ${fmt(snap.reinsurance)}`)
  console.log(`Status:                ${status}`)
  console.log(`Policy creation:       ${allowed}`)
  console.log('─────────────────────────────────────────────')
}

async function allocate(claimIdRaw, amountRaw) {
  if (!claimIdRaw) throw new Error('claimId is required')
  if (!amountRaw)  throw new Error('amount is required')
  const claimId = parsePositiveInt(claimIdRaw, 'claimId')
  const amount  = parsePositiveNumber(amountRaw, 'amount')
  await reserveService.allocateToClaim(claimId, amount)
  console.log(`✅ Allocated ${fmt(amount)} to claim ${claimId}`)
}

async function decrease(amountRaw, ...reasonParts) {
  const amount = parsePositiveNumber(amountRaw, 'amount')
  const reason = reasonParts.join(' ').trim()
  if (!reason) throw new Error('reason is required')

  await reserveService.createReserve('liquidity', -amount, {
    reference: `test-decrease-${Date.now()}`,
    metadata:  { source: 'testReserveHealth.decrease', reason, timestamp: Date.now() }
  })
  console.log(`⚠️  Decreased ${fmt(amount)} — Reason: ${reason}`)
}

async function reset() {
  const ans = (await askOnce('Are you sure? (yes/no) ')).toLowerCase()
  if (ans !== 'yes' && ans !== 'y') {
    console.log('Cancelled')
    return
  }
  const count = await Reserve.destroy({
    where: { reference: { [Op.like]: '%test%' } }
  })
  console.log(`✅ Removed ${count} test reserve entries`)
}

// ── Interactive loop ────────────────────────────────────────────────────────

async function interactive() {
  const rl  = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())))

  const MENU = '\n' +
    '1. Seed\n' +
    '2. Health\n' +
    '3. Allocate\n' +
    '4. Decrease\n' +
    '5. Reset\n' +
    '6. Exit\n'

  while (true) {
    console.log(MENU)
    const choice = await ask('> ')

    try {
      if (choice === '1' || choice.toLowerCase() === 'seed') {
        const a = await ask('Amount: ')
        await seed(a)
      } else if (choice === '2' || choice.toLowerCase() === 'health') {
        await health()
      } else if (choice === '3' || choice.toLowerCase() === 'allocate') {
        const c = await ask('Claim ID: ')
        const a = await ask('Amount: ')
        await allocate(c, a)
      } else if (choice === '4' || choice.toLowerCase() === 'decrease') {
        const a = await ask('Amount: ')
        const r = await ask('Reason: ')
        await decrease(a, r)
      } else if (choice === '5' || choice.toLowerCase() === 'reset') {
        const conf = (await ask('Are you sure? (yes/no) ')).toLowerCase()
        if (conf === 'yes' || conf === 'y') {
          const count = await Reserve.destroy({ where: { reference: { [Op.like]: '%test%' } } })
          console.log(`✅ Removed ${count} test reserve entries`)
        } else {
          console.log('Cancelled')
        }
      } else if (choice === '6' || choice.toLowerCase() === 'exit' || choice.toLowerCase() === 'quit') {
        break
      } else {
        console.log('Invalid choice')
      }
    } catch (err) {
      console.error(`❌ ${err.message}`)
    }
  }
  rl.close()
}

// ── Dispatcher ──────────────────────────────────────────────────────────────

const USAGE =
  'Usage:\n' +
  '  node backend/scripts/testReserveHealth.js seed <amount>\n' +
  '  node backend/scripts/testReserveHealth.js health\n' +
  '  node backend/scripts/testReserveHealth.js allocate <claimId> <amount>\n' +
  '  node backend/scripts/testReserveHealth.js decrease <amount> <reason...>\n' +
  '  node backend/scripts/testReserveHealth.js reset\n' +
  '  node backend/scripts/testReserveHealth.js interactive'

async function main() {
  const [cmd, ...args] = process.argv.slice(2)
  if (!cmd) {
    console.error(USAGE)
    process.exitCode = 1
    return
  }

  await connectDB()

  try {
    switch (cmd) {
      case 'seed':        await seed(args[0]);                  break
      case 'health':      await health();                       break
      case 'allocate':    await allocate(args[0], args[1]);     break
      case 'decrease':    await decrease(args[0], ...args.slice(1)); break
      case 'reset':       await reset();                        break
      case 'interactive': await interactive();                  break
      default:
        console.error(`Unknown command: ${cmd}`)
        console.error(USAGE)
        process.exitCode = 1
    }
  } catch (err) {
    console.error(`❌ ${err.message}`)
    if (process.env.DEBUG) console.error(err.stack)
    process.exitCode = 1
  } finally {
    await sequelize.close().catch(() => {})
  }
}

main()
