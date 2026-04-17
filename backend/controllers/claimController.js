const Claim  = require('../models/Claim')
const Policy = require('../models/Policy')
const User   = require('../models/User')
const { getFraudAssessment } = require('../services/mlService')
const { detectFraud } = require('../services/fraudDetection')
const { getWeatherData } = require('../services/weatherService')
const { createNotification } = require('../services/notificationService')
const { recomputeForUser: recomputeBalance } = require('../services/userBalanceService')
const fraudEngine = require('../services/fraudEngine')
const deviceFingerprintService = require('../services/deviceFingerprintService')
const { Op }   = require('sequelize')

exports.getClaims = async (req, res) => {
  try {
    const claims = await Claim.findAll({
      where:   { userId: req.user.id },
      include: [{ model: Policy, as: 'policy' }],
      order:   [['submittedAt', 'DESC']]
    })
    res.json(claims)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getClaimById = async (req, res) => {
  try {
    const claim = await Claim.findByPk(req.params.id, {
      include: [
        { model: Policy,                       as: 'policy' },
        { model: require('../models/User'),     as: 'user', attributes: ['name', 'email'] }
      ]
    })
    if (!claim) return res.status(404).json({ message: 'Claim not found' })
    if (claim.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' })
    }
    res.json(claim)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.createClaim = async (req, res) => {
  try {
    const {
      policyId, amount, description, triggerType, claimLocation,
      // Optional signals for the behavior-scoring fraudEngine
      deviceId, sensor, latitude, longitude
    } = req.body

    if (!policyId || !amount || !description) {
      return res.status(400).json({ message: 'policyId, amount and description are required' })
    }
    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' })
    }

    const policy = await Policy.findByPk(policyId)
    if (!policy) return res.status(404).json({ message: 'Policy not found' })
    if (policy.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    if (policy.status !== 'active') {
      return res.status(400).json({ message: 'Claims can only be submitted against an active policy' })
    }

    const now = Date.now()
    const DAY_MS = 24 * 60 * 60 * 1000

    // Gather claim history for multi-signal fraud detection
    const userHistory = await Claim.findAll({
      where: {
        userId:      req.user.id,
        submittedAt: { [Op.gte]: new Date(now - 30 * DAY_MS) }
      },
      order: [['submittedAt', 'DESC']]
    })

    // Count same trigger type in last 7 days
    const triggerTypeSame7Days = triggerType
      ? userHistory.filter(c =>
          c.triggerType === triggerType &&
          new Date(c.submittedAt) > new Date(now - 7 * DAY_MS)
        ).length
      : 0

    // Get current weather for mismatch check
    const weatherData = await getWeatherData(req.user.location)
    const weatherCondition = weatherData?.weather?.[0]?.main?.toLowerCase() || null

    // Account age
    const accountAgeDays = Math.floor(
      (now - new Date(req.user.createdAt).getTime()) / DAY_MS
    )

    // Average claim amount over last 30 days — feeds fraudEngine.amount_anomaly
    const userAvgClaimAmount = userHistory.length
      ? userHistory.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0) / userHistory.length
      : 0

    // Real multi-account lookup: for every device this user has used, fetch
    // every user_id that's touched the same device. Any device with >1 user
    // fires fraudEngine.multi_account.
    const [userDevices, deviceFingerprint] = await Promise.all([
      deviceFingerprintService.buildUserDevicesContext(req.user.id),
      deviceFingerprintService.getHighestRiskFingerprint(req.user.id)
    ])

    // Home coordinates from the User profile (captured at register or profile
    // update via browser Geolocation). null → location_mismatch flag stays silent.
    const userHomeCoords = (req.user.latitude != null && req.user.longitude != null)
      ? { lat: parseFloat(req.user.latitude), lng: parseFloat(req.user.longitude) }
      : null

    // ── Run all three fraud engines in parallel ─────────────────────────────
    //   1. mlService        — statistical/ML scoring
    //   2. fraudDetection   — deterministic rule set
    //   3. fraudEngine      — behaviour scoring (device + sensor + velocity)
    const [mlFraudCheck, ruleFraudCheck, behaviorVerdict] = await Promise.all([
      getFraudAssessment({
        amount:           Number(amount),
        policyCoverage:   parseFloat(policy.coverage),
        claimCount30Days: userHistory.length,
        accountAgeDays,
        triggerTypeSame7Days,
        claimHour:        new Date().getHours()
      }),
      Promise.resolve(detectFraud(
        {
          amount:            Number(amount),
          policyCoverage:    parseFloat(policy.coverage),
          description,
          triggerType:       triggerType || null,
          weatherCondition,
          accountCreatedAt:  req.user.createdAt,
          submittedAt:       new Date(),
          isAutoClaim:       false,
          claimLocation:     claimLocation || null,
          userLocation:      req.user.location || null
        },
        userHistory
      )),
      Promise.resolve(fraudEngine.evaluateClaim(
        {
          userId:      req.user.id,
          amount:      Number(amount),
          triggerType: triggerType || null,
          latitude,
          longitude,
          submittedAt: new Date()
        },
        {
          userClaims30d:        userHistory,
          userDevices,
          activeSensorSnapshot: sensor || null,
          userHomeCoords,
          userAvgClaimAmount,
          deviceId:             deviceId || null,
          deviceFingerprint,              // cached Incognia/IPQS/mock score
          claimLat:             latitude,
          claimLng:             longitude
        }
      ))
    ])

    // Combine verdicts:
    //   BLOCKED (behavior score ≥ 70)  → auto-reject at creation time
    //   otherwise flag if ANY engine flags it
    const isBlocked = behaviorVerdict.status === 'BLOCKED'
    const isFraudulent =
      isBlocked ||
      behaviorVerdict.status === 'REVIEW' ||
      mlFraudCheck.isFraudulent ||
      ruleFraudCheck.isFraudulent

    const combinedReasons = [
      ...new Set([
        ...(mlFraudCheck.reasons   || []),
        ...(ruleFraudCheck.reasons || []),
        ...behaviorVerdict.details.map(d => d.detail)
      ])
    ]
    const combinedScore = Math.max(
      mlFraudCheck.riskScore || 0,
      ruleFraudCheck.riskScore || 0,
      behaviorVerdict.fraudScore || 0
    )

    const nextStatus = isBlocked ? 'rejected' : (isFraudulent ? 'flagged' : 'pending')
    const blockNote  = isBlocked
      ? `\n[${new Date().toISOString()}] Auto-rejected by fraudEngine (score=${behaviorVerdict.fraudScore}, flags=[${behaviorVerdict.flags.join(', ')}])`
      : ''

    const claim = await Claim.create({
      userId:      req.user.id,
      policyId,
      amount:      Number(amount),
      description,
      triggerType: triggerType || null,
      status:      nextStatus,
      notes:       blockNote ? blockNote.trim() : null
    })

    res.status(201).json({
      claim,
      fraudAlert: isFraudulent ? {
        reasons:        combinedReasons,
        riskScore:      combinedScore,
        signalsChecked: (ruleFraudCheck.signalsChecked || 0) + (mlFraudCheck.signalsChecked || 0),
        behavior: {
          fraudScore: behaviorVerdict.fraudScore,
          flags:      behaviorVerdict.flags,
          status:     behaviorVerdict.status
        }
      } : null,
      autoRejected: isBlocked
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updateClaim = async (req, res) => {
  try {
    const claim = await Claim.findByPk(req.params.id)
    if (!claim)              return res.status(404).json({ message: 'Claim not found' })
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' })

    const { status, notes } = req.body
    const validStatuses = ['pending', 'approved', 'rejected', 'flagged']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${validStatuses.join(', ')}` })
    }

    const updates = { notes, processedAt: new Date() }
    if (status) updates.status = status

    // Derive the new money state from the pending lifecycle + current payout state.
    // Uses the pure Claim.derivePayoutStatus — single source of truth.
    if (status) {
      const nextPayout = Claim.derivePayoutStatus({
        status,
        payout_status: claim.payout_status
      })
      if (nextPayout !== claim.payout_status) {
        updates.payout_status   = nextPayout
        updates.payoutUpdatedAt = new Date()
      }
    }

    await claim.update(updates)

    const updated = await Claim.findByPk(req.params.id, {
      include: [
        { model: Policy,                       as: 'policy' },
        { model: require('../models/User'),     as: 'user', attributes: ['name', 'email'] }
      ]
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getAllClaims = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1)
    const limit  = Math.min(100, parseInt(req.query.limit) || 20)
    const offset = (page - 1) * limit

    const { count, rows } = await Claim.findAndCountAll({
      include: [
        { model: Policy,                       as: 'policy' },
        { model: require('../models/User'),     as: 'user', attributes: ['name', 'email'] }
      ],
      order:  [['submittedAt', 'DESC']],
      limit,
      offset
    })

    res.json({
      claims:     rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getFlaggedClaims = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1)
    const limit  = Math.min(100, parseInt(req.query.limit) || 20)
    const offset = (page - 1) * limit

    const { count, rows } = await Claim.findAndCountAll({
      where: { status: 'flagged' },
      include: [
        { model: Policy,                       as: 'policy' },
        { model: require('../models/User'),     as: 'user', attributes: ['name', 'email'] }
      ],
      order:  [['submittedAt', 'DESC']],
      limit,
      offset
    })

    res.json({
      claims:     rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── Self-certification (worker confirms or disputes an auto-claim) ──────────

/**
 * POST /api/claims/:id/confirm
 * Worker confirms they couldn't work — flips status to 'approved' and queues payout.
 */
exports.confirmClaim = async (req, res) => {
  try {
    const claimId = parseInt(req.params.id)
    if (!Number.isFinite(claimId) || claimId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid claim id' })
    }

    const claim = await Claim.findByPk(claimId)
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' })
    }
    if (claim.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }
    if (claim.status !== 'pending_verification') {
      return res.status(409).json({
        success: false,
        message: `Claim is not awaiting verification (current status: ${claim.status})`
      })
    }

    const now = new Date()
    const nextPayout = Claim.derivePayoutStatus({
      status:        'approved',
      payout_status: claim.payout_status
    })
    await claim.update({
      status:           'approved',
      payout_status:    nextPayout,
      payoutUpdatedAt:  now,
      verifiedAt:       now,
      processedAt:      now
    })

    // Notify worker that their confirmation was recorded and payout is queued.
    // A separate 'payout_sent' notification fires later when disbursement completes.
    try {
      await createNotification({
        userId:  req.user.id,
        type:    'claim_confirmed',
        title:   'Claim confirmed — payout queued',
        message: `Your ₹${claim.amount} payout is queued for disbursement and will reach your account within 24h.`,
        data:    {
          claimId:       claim.id,
          payoutAmount:  Number(claim.amount),
          payout_status: nextPayout
        }
      })
    } catch (err) {
      console.error(`[claimController] Failed to create claim_confirmed notification:`, err.message)
    }

    // Refresh materialized balance cache so worker dashboard shows the new
    // pending_payout_amount immediately. Failure is non-fatal — the next
    // recompute (or recomputeAll cron) will heal it.
    try {
      await recomputeBalance(req.user.id)
    } catch (err) {
      console.error(`[claimController] Balance recompute failed for user ${req.user.id}:`, err.message)
    }

    res.json({
      success:       true,
      message:       'Claim confirmed',
      payout_status: nextPayout,
      amount:        Number(claim.amount)
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * POST /api/claims/:id/dispute
 * Worker disputes ("I did work"). Status → 'disputed', reason recorded.
 * Admin will review in the audit panel.
 */
exports.disputeClaim = async (req, res) => {
  try {
    const claimId = parseInt(req.params.id)
    if (!Number.isFinite(claimId) || claimId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid claim id' })
    }

    const { reason } = req.body || {}
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'A reason is required' })
    }
    if (reason.length > 2000) {
      return res.status(400).json({ success: false, message: 'Reason is too long (max 2000 chars)' })
    }

    const claim = await Claim.findByPk(claimId)
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' })
    }
    if (claim.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }
    if (claim.status !== 'pending_verification') {
      return res.status(409).json({
        success: false,
        message: `Claim cannot be disputed (current status: ${claim.status})`
      })
    }

    await claim.update({
      status:        'disputed',
      disputeReason: reason.trim(),
      verifiedAt:    new Date()
    })

    // Confirm back to the worker that the dispute was recorded.
    // Silence here is a UX bug — they just took an action and deserve feedback.
    try {
      await createNotification({
        userId:  req.user.id,
        type:    'claim_disputed',
        title:   'Dispute recorded',
        message: `Thanks — we've recorded that you worked despite the weather. No payout will be issued for this event.`,
        data: {
          claimId:       claim.id,
          disputeReason: reason.trim().slice(0, 500),
          triggerType:   claim.triggerType,
          triggerValue:  claim.triggerValue
        }
      })
    } catch (err) {
      console.error(`[claimController] Failed to create claim_disputed notification:`, err.message)
    }

    // Refresh materialized balance — disputed_amount goes up, pending stays put
    try {
      await recomputeBalance(req.user.id)
    } catch (err) {
      console.error(`[claimController] Balance recompute failed for user ${req.user.id}:`, err.message)
    }

    res.json({
      success:    true,
      message:    'Dispute recorded. No payout will be issued for this event.',
      dispute_id: claim.id
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
