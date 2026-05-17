/**
 * Consent Routes
 * 
 * Endpoints for managing user consent.
 * Requires JWT authentication.
 */
const express = require('express')
const router = express.Router()
const { getConsentRepository } = require('../repositories/ConsentRepository')
const logger = require('../utils/logger')
const { body, param, validationResult } = require('express-validator')
/**
 * Validation middleware
 */
function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'validation_error', 
      details: errors.array() 
    })
  }
  next()
}
/**
 * GET /api/consent
 * Get all consents for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const consentRepo = getConsentRepository()
    const consents = await consentRepo.findByUser(req.user.id)
    res.json({
      consents: consents.map(c => c.toJSON()),
      total: consents.length
    })
  } catch (error) {
    logger.error('Failed to list consents', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to list consents' 
    })
  }
})
/**
 * GET /api/consent/check/:type
 * Check if user has granted consent for a specific type
 */
router.get('/check/:type',
  [
    param('type').isString().withMessage('Consent type required'),
    validate
  ],
  async (req, res) => {
    try {
      const consentRepo = getConsentRepository()
      const hasConsent = await consentRepo.hasConsent(req.user.id, req.params.type)
      res.json({ 
        consentType: req.params.type,
        granted: hasConsent 
      })
    } catch (error) {
      logger.error('Failed to check consent', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to check consent' 
      })
    }
  }
)
/**
 * POST /api/consent/grant
 * Grant consent for a specific type
 */
router.post('/grant',
  [
    body('consentType').isString().withMessage('Consent type required'),
    body('purpose').isString().withMessage('Purpose required'),
    body('version').optional().isString().withMessage('Version must be string'),
    validate
  ],
  async (req, res) => {
    try {
      const { consentType, purpose, version } = req.body
      const ipAddress = req.ip || req.connection.remoteAddress
      const userAgent = req.headers['user-agent']
      const consentRepo = getConsentRepository()
      const consent = await consentRepo.grantConsent(
        req.user.id,
        consentType,
        purpose,
        ipAddress,
        userAgent,
        req.organizationId
      )
      if (version) {
        consent.version = version
      }
      logger.info('Consent granted', {
        userId: req.user.id,
        consentType,
        consentId: consent.id
      })
      res.json({ 
        consent: consent.toJSON(),
        message: 'Consent granted successfully'
      })
    } catch (error) {
      logger.error('Failed to grant consent', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to grant consent' 
      })
    }
  }
)
/**
 * POST /api/consent/revoke
 * Revoke consent for a specific type
 */
router.post('/revoke',
  [
    body('consentType').isString().withMessage('Consent type required'),
    validate
  ],
  async (req, res) => {
    try {
      const { consentType } = req.body
      const consentRepo = getConsentRepository()
      const consent = await consentRepo.revokeConsent(req.user.id, consentType)
      if (!consent) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Consent not found'
        })
      }
      logger.info('Consent revoked', {
        userId: req.user.id,
        consentType,
        consentId: consent.id
      })
      res.json({ 
        consent: consent.toJSON(),
        message: 'Consent revoked successfully'
      })
    } catch (error) {
      logger.error('Failed to revoke consent', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to revoke consent' 
      })
    }
  }
)
/**
 * GET /api/consent/audit
 * Get consent audit trail for the authenticated user
 */
router.get('/audit', async (req, res) => {
  try {
    const consentRepo = getConsentRepository()
    const auditTrail = await consentRepo.getAuditTrail(req.user.id)
    res.json({ 
      auditTrail,
      total: auditTrail.length
    })
  } catch (error) {
    logger.error('Failed to get consent audit trail', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to get consent audit trail' 
    })
  }
})
/**
 * GET /api/consent/types
 * Get available consent types
 */
router.get('/types', (req, res) => {
  const types = [
    {
      type: 'data_processing',
      name: 'Data Processing',
      description: 'Allow BobSec to process your data for scam analysis',
      required: true,
      category: 'essential'
    },
    {
      type: 'analytics',
      name: 'Analytics',
      description: 'Help us improve BobSec by sharing anonymous usage data',
      required: false,
      category: 'functional'
    },
    {
      type: 'marketing',
      name: 'Marketing Communications',
      description: 'Receive updates about new features and security tips',
      required: false,
      category: 'marketing'
    },
    {
      type: 'third_party_sharing',
      name: 'Third-Party Sharing',
      description: 'Share anonymized threat intelligence with partner organizations',
      required: false,
      category: 'functional'
    }
  ]
  res.json({ types })
})
/**
 * GET /api/consent/stats (Admin only)
 * Get consent statistics for the organization
 */
router.get('/stats', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Admin access required'
      })
    }
    const consentRepo = getConsentRepository()
    const stats = await consentRepo.getStats(req.organizationId)
    res.json({ stats })
  } catch (error) {
    logger.error('Failed to get consent stats', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to get consent statistics' 
    })
  }
})
module.exports = router
// Made with Bob