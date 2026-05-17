// server/routes/monitors.js
const express = require('express')
const router = express.Router()
const logger = require('../utils/logger')

// Demo-only stub for synthetic monitors routes.
// Full implementation is in git history for production use.

const demoResponse = (req, res) => {
  logger.info('Monitors route accessed in demo mode', {
    method: req.method,
    path: req.path
  })
  
  res.status(200).json({
    message: 'Monitors routes disabled in demo mode',
    note: 'Full implementation available in production',
    demoMode: true
  })
}

router.get('/', demoResponse)
router.post('/', demoResponse)
router.get('/:id', demoResponse)
router.put('/:id', demoResponse)
router.delete('/:id', demoResponse)

module.exports = router

// Made with Bob
