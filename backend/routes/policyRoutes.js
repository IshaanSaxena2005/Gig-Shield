const express = require('express')
const { getPolicies, createPolicy } = require('../controllers/policyController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', protect, getPolicies)
router.post('/', protect, createPolicy)

module.exports = router