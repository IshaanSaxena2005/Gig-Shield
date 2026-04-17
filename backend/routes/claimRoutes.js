const express = require('express')
const {
  getClaims,
  getClaimById,
  createClaim,
  updateClaim,
  getAllClaims,
  getFlaggedClaims,
  confirmClaim,
  disputeClaim
} = require('../controllers/claimController')
const { raiseDispute, getTrustReport } = require('../controllers/disputeController')
const { protect, admin } = require('../middleware/authMiddleware')
const { claimsLimiter } = require('../middleware/security')

const router = express.Router()

router.get('/',                protect,        getClaims)
router.get('/all',             protect, admin, getAllClaims)
router.get('/flagged',         protect, admin, getFlaggedClaims)
router.get('/:id',             protect,        getClaimById)
router.post('/',               protect, claimsLimiter, createClaim)  // 10 submissions/15min
router.put('/:id',             protect, admin, updateClaim)

// Self-certification endpoints (worker confirms or disputes auto-claims)
router.post('/:id/confirm',    protect, claimsLimiter, confirmClaim)
router.post('/:id/dispute',    protect, claimsLimiter, disputeClaim)

// Data-quality dispute (multi-source recheck) + trust report
router.post('/:id/verify-dispute', protect, claimsLimiter, raiseDispute)
router.get('/:id/trust',           protect,                getTrustReport)

module.exports = router
