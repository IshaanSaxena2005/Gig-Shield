const express = require('express')
const {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  getAllPolicies
} = require('../controllers/policyController')
const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', protect, getPolicies)
router.get('/all', protect, admin, getAllPolicies)
router.get('/:id', protect, getPolicyById)
router.post('/', protect, createPolicy)
router.put('/:id', protect, admin, updatePolicy)

module.exports = router