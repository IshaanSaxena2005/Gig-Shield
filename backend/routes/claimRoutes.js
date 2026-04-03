const express = require('express')
const {
  getClaims,
  getClaimById,
  createClaim,
  updateClaim,
  getAllClaims,
  getFlaggedClaims
} = require('../controllers/claimController')
const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/',            protect,        getClaims)
router.get('/all',         protect, admin, getAllClaims)
router.get('/flagged',     protect, admin, getFlaggedClaims)  // FIX: new flagged queue
router.get('/:id',         protect,        getClaimById)
router.post('/',           protect,        createClaim)
router.put('/:id',         protect, admin, updateClaim)

module.exports = router
