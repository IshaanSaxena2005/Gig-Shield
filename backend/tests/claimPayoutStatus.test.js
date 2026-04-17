const test = require('node:test')
const assert = require('node:assert/strict')

const {
  derivePayoutStatus,
  VALID_STATUSES,
  VALID_PAYOUT_STATUSES
} = require('../utils/claimPayoutStatus')

// ── Sanity: exported constants ───────────────────────────────────────────────

test('VALID_STATUSES contains the full lifecycle set', () => {
  assert.deepEqual(VALID_STATUSES, [
    'pending',
    'pending_verification',
    'approved',
    'rejected',
    'flagged',
    'disputed'
  ])
})

test('VALID_PAYOUT_STATUSES contains the full money-state set', () => {
  assert.deepEqual(VALID_PAYOUT_STATUSES, [
    'not_applicable',
    'queued',
    'disbursed',
    'failed',
    'clawed_back'
  ])
})

// ── Forward transitions (approval path) ──────────────────────────────────────

test('approved + not_applicable → queued (primary happy path)', () => {
  assert.equal(
    derivePayoutStatus({ status: 'approved', payout_status: 'not_applicable' }),
    'queued'
  )
})

test('approved + queued → queued (idempotent re-approval)', () => {
  assert.equal(
    derivePayoutStatus({ status: 'approved', payout_status: 'queued' }),
    'queued'
  )
})

test('approved + failed → queued (retry a bounced disbursement)', () => {
  // Admin re-approves after a UPI failure — should re-enter the queue
  assert.equal(
    derivePayoutStatus({ status: 'approved', payout_status: 'failed' }),
    'queued'
  )
})

// ── Non-money states (pending / intermediate) ────────────────────────────────

test('pending → not_applicable', () => {
  assert.equal(
    derivePayoutStatus({ status: 'pending', payout_status: 'not_applicable' }),
    'not_applicable'
  )
})

test('pending_verification → not_applicable (auto-claim awaiting self-cert)', () => {
  assert.equal(
    derivePayoutStatus({ status: 'pending_verification', payout_status: 'not_applicable' }),
    'not_applicable'
  )
})

test('flagged → not_applicable (money on hold pending fraud audit)', () => {
  assert.equal(
    derivePayoutStatus({ status: 'flagged', payout_status: 'not_applicable' }),
    'not_applicable'
  )
})

test('disputed → not_applicable (money never moved)', () => {
  assert.equal(
    derivePayoutStatus({ status: 'disputed', payout_status: 'not_applicable' }),
    'not_applicable'
  )
})

// ── Rejection transitions ────────────────────────────────────────────────────

test('rejected + not_applicable → not_applicable', () => {
  assert.equal(
    derivePayoutStatus({ status: 'rejected', payout_status: 'not_applicable' }),
    'not_applicable'
  )
})

test('rejected + queued → not_applicable (pull out of the queue)', () => {
  assert.equal(
    derivePayoutStatus({ status: 'rejected', payout_status: 'queued' }),
    'not_applicable'
  )
})

test('rejected + disbursed → clawed_back (post-payout fraud)', () => {
  // Critical case: admin discovers fraud after money was sent.
  // The sticky 'disbursed' rule must NOT override this clawback.
  assert.equal(
    derivePayoutStatus({ status: 'rejected', payout_status: 'disbursed' }),
    'clawed_back'
  )
})

test('rejected + failed → not_applicable (bounced payout, now cancelled)', () => {
  assert.equal(
    derivePayoutStatus({ status: 'rejected', payout_status: 'failed' }),
    'not_applicable'
  )
})

// ── Sticky terminal states ──────────────────────────────────────────────────

test('clawed_back is sticky across any lifecycle status', () => {
  for (const status of VALID_STATUSES) {
    assert.equal(
      derivePayoutStatus({ status, payout_status: 'clawed_back' }),
      'clawed_back',
      `clawed_back should stick under status='${status}'`
    )
  }
})

test('disbursed is sticky — except under rejection (which clawbacks)', () => {
  // Stays disbursed under every status that isn't a rejection
  const nonRejected = VALID_STATUSES.filter(s => s !== 'rejected')
  for (const status of nonRejected) {
    assert.equal(
      derivePayoutStatus({ status, payout_status: 'disbursed' }),
      'disbursed',
      `disbursed should stick under status='${status}'`
    )
  }
  // But rejection turns disbursed into a clawback
  assert.equal(
    derivePayoutStatus({ status: 'rejected', payout_status: 'disbursed' }),
    'clawed_back'
  )
})

// ── Robustness to missing/null inputs ───────────────────────────────────────

test('missing status defaults to not_applicable', () => {
  assert.equal(
    derivePayoutStatus({ payout_status: 'not_applicable' }),
    'not_applicable'
  )
})

test('missing payout_status + status=approved still returns queued', () => {
  assert.equal(derivePayoutStatus({ status: 'approved' }), 'queued')
})

test('empty object returns not_applicable (safe default)', () => {
  assert.equal(derivePayoutStatus({}), 'not_applicable')
})

test('undefined input does not throw — returns not_applicable', () => {
  assert.equal(derivePayoutStatus(), 'not_applicable')
})

// ── Output domain ───────────────────────────────────────────────────────────

test('output is always a member of VALID_PAYOUT_STATUSES', () => {
  for (const status of VALID_STATUSES) {
    for (const payout_status of VALID_PAYOUT_STATUSES) {
      const result = derivePayoutStatus({ status, payout_status })
      assert.ok(
        VALID_PAYOUT_STATUSES.includes(result),
        `derivePayoutStatus({status:${status}, payout_status:${payout_status}}) returned invalid "${result}"`
      )
    }
  }
})

test('derivation is deterministic (same input → same output)', () => {
  const input = { status: 'approved', payout_status: 'not_applicable' }
  const a = derivePayoutStatus(input)
  const b = derivePayoutStatus(input)
  const c = derivePayoutStatus({ ...input })
  assert.equal(a, b)
  assert.equal(b, c)
})

test('function is pure — does not mutate its input', () => {
  const input = { status: 'approved', payout_status: 'not_applicable' }
  const snapshot = { ...input }
  derivePayoutStatus(input)
  assert.deepEqual(input, snapshot, 'input object must not be mutated')
})
