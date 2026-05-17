// server/routes/loadTests.js
const express = require('express')
const router = express.Router()

// Demo-only stub for load testing routes
// Full implementation is preserved in git history for production

const logger = require('../utils/logger')

const demoResponse = (req, res) => {
  logger.info('Load test route accessed in demo mode', {
    method: req.method,
    path: req.path
  })
  
  res.status(200).json({
    message: 'Load test routes disabled in demo mode',
    note: 'Load testing features available in production',
    demoMode: true
  })
}

// All load test routes return demo response
router.post('/', demoResponse)
router.get('/', demoResponse)
router.get('/:id', demoResponse)
router.delete('/:id', demoResponse)

module.exports = router

// Made with Bob
// Note: This is a simplified demo version. Full implementation available in git history.