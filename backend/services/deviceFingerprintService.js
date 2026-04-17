/**
 * deviceFingerprintService.js
 * ---------------------------
 * Owns all reads/writes to the DeviceFingerprint table + external
 * fraud-intel calls (Incognia / IPQS) with graceful fallback to mock.
 *
 * Three responsibilities:
 *
 *   1. upsertDevice(userId, ctx)         — called on login/register
 *   2. getUsersForDevice(deviceId)       — cross-user multi-account lookup
 *   3. getFingerprintScore(deviceId, c)  — external fraud-intel call
 *
 * External provider order: Incognia → IPQS → mock. First one with a valid
 * key wins; any failure falls through to the next. Matches existing
 * project pattern (Stripe / CPCB graceful degradation).
 */

const DeviceFingerprint = require('../models/DeviceFingerprint')
const crypto            = require('crypto')

// ── Tuning ──────────────────────────────────────────────────────────────────
const FP_TIMEOUT_MS      = 4_000
const FP_CACHE_TTL_MS    = 24 * 60 * 60 * 1000  // re-score once per day
const HIGH_RISK_CUTOFF   = 60                   // fraudEngine triggers flag at ≥60

const hasKey = (k) => !!process.env[k] && !process.env[k].includes('your-')

// ── Device ID derivation ────────────────────────────────────────────────────

/**
 * If the client didn't supply a deviceId, derive a weak one from IP + UA.
 * Much less reliable than a real FingerprintJS UUID, but still catches the
 * naive "same laptop, two accounts" case.
 */
function deriveDeviceId({ deviceId, userAgent, ip } = {}) {
  if (deviceId && String(deviceId).length >= 8) return String(deviceId).slice(0, 64)
  if (!userAgent && !ip) return null
  return crypto.createHash('sha256')
    .update(`${ip || ''}|${userAgent || ''}`)
    .digest('hex')
    .slice(0, 32)
}

// ── External fraud-intel adapters ───────────────────────────────────────────

const withTimeout = async (fn, ms) => {
  const ctrl = new AbortController()
  const t    = setTimeout(() => ctrl.abort(), ms)
  try     { return await fn(ctrl.signal) }
  finally { clearTimeout(t) }
}

async function callIncognia(deviceId, { userAgent, ip } = {}) {
  // Real Incognia: POST https://api.incognia.com/api/v2/signals/device
  //   with Bearer <access-token> acquired from /api/v2/token
  // Simplified: single-shot call pretending the token is pre-fetched.
  const res = await withTimeout((signal) => fetch('https://api.incognia.com/api/v2/signals/device', {
    method:  'POST',
    signal,
    headers: {
      'Authorization': `Bearer ${process.env.INCOGNIA_API_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({ installation_id: deviceId, user_agent: userAgent, ip_address: ip })
  }), FP_TIMEOUT_MS)
  if (!res.ok) throw new Error(`Incognia ${res.status}`)
  const json = await res.json()
  // Incognia returns a risk_assessment of 'low_risk' | 'medium_risk' | 'high_risk' + optional reasons
  const map = { low_risk: 10, medium_risk: 50, high_risk: 85, unknown_risk: 20 }
  const score = map[json.risk_assessment] ?? 30
  return { riskScore: score, provider: 'incognia', reasons: json.evidence || [], raw: json }
}

async function callIPQS(deviceId, { userAgent, ip } = {}) {
  // Real IPQS: GET https://www.ipqualityscore.com/api/json/fraud/<key>/<ip>
  // Note: IPQS is IP-focused, not device-focused — we include UA + deviceId in payload.
  const url = `https://www.ipqualityscore.com/api/json/fraud/${process.env.IPQS_API_KEY}/${encodeURIComponent(ip || '0.0.0.0')}?strictness=1&user_agent=${encodeURIComponent(userAgent || '')}&device_id=${encodeURIComponent(deviceId || '')}`
  const res = await withTimeout((signal) => fetch(url, { signal }), FP_TIMEOUT_MS)
  if (!res.ok) throw new Error(`IPQS ${res.status}`)
  const json = await res.json()
  return {
    riskScore: Math.min(100, Number(json.fraud_score || 0)),
    provider:  'ipqs',
    reasons:   [
      ...(json.proxy    ? ['proxy']    : []),
      ...(json.vpn      ? ['vpn']      : []),
      ...(json.tor      ? ['tor']      : []),
      ...(json.bot_status ? ['bot']    : [])
    ],
    raw: json
  }
}

function mockScore(deviceId) {
  if (!deviceId) return { riskScore: 0, provider: 'none', reasons: ['no_device_id'] }
  // Deterministic hash → consistent scoring in tests
  const hash = [...deviceId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0)
  return { riskScore: hash % 100, provider: 'mock', reasons: ['mock_provider'] }
}

/**
 * Get a fraud-intel risk score for a device. Orders providers by key presence
 * and falls through on failure. Always resolves (never rejects).
 */
async function getFingerprintScore(deviceId, { userAgent, ip } = {}) {
  if (!deviceId) return { riskScore: 0, provider: 'none', reasons: ['no_device_id'] }

  if (hasKey('INCOGNIA_API_KEY')) {
    try { return await callIncognia(deviceId, { userAgent, ip }) }
    catch (err) { console.warn(`[deviceFingerprint] Incognia failed: ${err.message} — falling back`) }
  }
  if (hasKey('IPQS_API_KEY')) {
    try { return await callIPQS(deviceId, { userAgent, ip }) }
    catch (err) { console.warn(`[deviceFingerprint] IPQS failed: ${err.message} — falling back`) }
  }
  return mockScore(deviceId)
}

// ── DB operations ───────────────────────────────────────────────────────────

/**
 * Idempotent: insert on first sight, bump seen_count + last_seen_at otherwise.
 * Kicks off a score refresh if the cached one is stale (fire-and-forget — doesn't block login).
 */
async function upsertDevice(userId, ctx = {}) {
  const deviceId = deriveDeviceId(ctx)
  if (!userId || !deviceId) return null

  const [row, created] = await DeviceFingerprint.findOrCreate({
    where:    { user_id: userId, device_id: deviceId },
    defaults: {
      user_id:          userId,
      device_id:        deviceId,
      user_agent:       ctx.userAgent?.slice(0, 500) || null,
      ip_address:       ctx.ip || null,
      fingerprint_data: ctx.fingerprintData || {},
      first_seen_at:    new Date(),
      last_seen_at:     new Date(),
      seen_count:       1
    }
  })

  if (!created) {
    await row.update({
      last_seen_at: new Date(),
      seen_count:   row.seen_count + 1,
      user_agent:   ctx.userAgent?.slice(0, 500) || row.user_agent,
      ip_address:   ctx.ip || row.ip_address
    })
  }

  // Refresh score if missing or stale (non-blocking)
  const stale = !row.risk_checked_at || (Date.now() - new Date(row.risk_checked_at).getTime() > FP_CACHE_TTL_MS)
  if (stale) {
    refreshRiskScore(row.id, deviceId, ctx).catch(err =>
      console.warn(`[deviceFingerprint] background score refresh failed: ${err.message}`)
    )
  }

  return row
}

async function refreshRiskScore(rowId, deviceId, ctx = {}) {
  const result = await getFingerprintScore(deviceId, ctx)
  await DeviceFingerprint.update({
    risk_score:      result.riskScore,
    risk_provider:   result.provider,
    risk_checked_at: new Date()
  }, { where: { id: rowId } })
  return result
}

/**
 * Returns the list of distinct users who've ever used this device.
 * If length > 1 → multi-account candidate.
 */
async function getUsersForDevice(deviceId) {
  if (!deviceId) return []
  const rows = await DeviceFingerprint.findAll({
    where:      { device_id: deviceId },
    attributes: ['user_id'],
    raw:        true
  })
  return [...new Set(rows.map(r => r.user_id))]
}

/**
 * Assemble the `userDevices` context array fraudEngine expects. For each device
 * this user has used, include the full list of user_ids seen on that device —
 * if any device has >1 user, the `multi_account` flag fires.
 *
 * @param {number} userId
 * @returns {Promise<Array<{ deviceId:string, usedByUserIds:number[], riskScore:number|null }>>}
 */
async function buildUserDevicesContext(userId) {
  const mine = await DeviceFingerprint.findAll({
    where:      { user_id: userId },
    attributes: ['device_id', 'risk_score'],
    raw:        true
  })
  if (mine.length === 0) return []

  const results = await Promise.all(mine.map(async (d) => ({
    deviceId:      d.device_id,
    riskScore:     d.risk_score,
    usedByUserIds: await getUsersForDevice(d.device_id)
  })))
  return results
}

/**
 * Highest-risk fingerprint across this user's devices. Used to seed
 * fraudEngine.context.deviceFingerprint.
 */
async function getHighestRiskFingerprint(userId) {
  const rows = await DeviceFingerprint.findAll({
    where:      { user_id: userId },
    order:      [['risk_score', 'DESC']],
    attributes: ['device_id', 'risk_score', 'risk_provider', 'risk_checked_at'],
    limit:      1,
    raw:        true
  })
  const r = rows[0]
  if (!r || r.risk_score == null) return null
  return {
    deviceId:  r.device_id,
    riskScore: r.risk_score,
    provider:  r.risk_provider,
    checkedAt: r.risk_checked_at
  }
}

module.exports = {
  upsertDevice,
  getFingerprintScore,
  getUsersForDevice,
  buildUserDevicesContext,
  getHighestRiskFingerprint,
  deriveDeviceId,
  CONSTANTS: Object.freeze({ FP_TIMEOUT_MS, FP_CACHE_TTL_MS, HIGH_RISK_CUTOFF })
}
