const express = require('express')
const router = express.Router()

// Demo-only version of pipeline versions routes
// Full implementation is in git history; this keeps server startup stable

const logger = require('../utils/logger')

const demoResponse = (req, res) => {
  logger.info('Pipeline versions route accessed in demo mode', {
    method: req.method,
    path: req.path
  })
  
  res.status(200).json({
    message: 'Pipeline versions routes disabled in demo mode',
    note: 'Full pipeline versioning will be available in production',
    demoMode: true
  })
}

// All pipeline version routes return demo response
router.get('/', demoResponse)
router.get('/:id', demoResponse)
router.post('/', demoResponse)
router.patch('/:id', demoResponse)
router.delete('/:id', demoResponse)
router.post('/:id/activate', demoResponse)
router.post('/:id/rollback', demoResponse)

module.exports = router

// Made with Bob
// Note: This is a simplified demo version. Full implementation available in git history.