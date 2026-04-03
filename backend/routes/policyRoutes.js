const express = require('express')
const {
  getPolicies,
  getPolicyById,
  createPolicy,
  getPolicyQuote,
  updatePolicy,
  updatePolicyStatus,
  getAllPolicies
} = require('../controllers/policyController')
const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', protect, getPolicies)
router.post('/quote', protect, getPolicyQuote)
router.get('/all', protect, admin, getAllPolicies)
router.get('/:id', protect, getPolicyById)
router.post('/', protect, createPolicy)
router.patch('/:id/status', protect, updatePolicyStatus) // user can update their own status
router.put('/:id', protect, admin, updatePolicy)         // admin full update

module.exports = router
