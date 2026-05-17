/**
 * ScamNet API Routes
 * 
 * Endpoints for contributing to and querying the shared scam intelligence layer
 */

const express = require('express')
const router = express.Router()
const { authenticateApiKey } = require('../middleware/apiKeyAuth')
const { enforceTenantIsolation } = require('../middleware/tenantIsolation')
const { validateRequest } = require('../middleware/validation')
const scamNetService = require('../services/ScamNetService')
const { PlatformContext } = require('../models/PlatformContext')
const logger = require('../utils/logger')

// Apply authentication and tenant isolation
router.use(authenticateApiKey)
router.use(enforceTenantIsolation)

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/scamnet/contribute
// Contribute intelligence to ScamNet
// ══════════════════════════════════════════════════════════════════════════════

router.post('/contribute', validateRequest({
  body: {
    risk_score: { type: 'number', required: true, min: 0, max: 100 },
    risk_level: { type: 'string', required: true, enum: ['HIGH', 'MEDIUM', 'LOW', 'SAFE', 'UNKNOWN'] },
    category: { type: 'string', required: true },
    entities: { type: 'object', required: true },
    confidence: { type: 'number', required: true, min: 0, max: 100 }
  }
}), async (req, res) => {
  try {
    const intelligence = req.body
    const context = PlatformContext.fromRequest(req)
    
    // Contribute to ScamNet
    const result = await scamNetService.contribute(intelligence, context)
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.errors
      })
    }
    
    logger.info('ScamNet: Intelligence contributed', {
      contributionId: result.contribution_id,
      sector: context.sector,
      indicatorsStored: result.indicators_stored
    })
    
    return res.json({
      success: true,
      contribution_id: result.contribution_id,
      indicators_stored: result.indicators_stored,
      reputation_updated: result.reputation_updated,
      message: 'Intelligence contribution accepted. Thank you for making the ecosystem safer.'
    })
    
  } catch (error) {
    logger.error('ScamNet: Contribution failed', { error: error.message })
    return res.status(500).json({
      success: false,
      error: 'Failed to contribute intelligence'
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/scamnet/query
// Query ScamNet for intelligence about entities
// ══════════════════════════════════════════════════════════════════════════════

router.post('/query', validateRequest({
  body: {
    entities: { type: 'object', required: true }
  }
}), async (req, res) => {
  try {
    const { entities } = req.body
    const context = PlatformContext.fromRequest(req)
    
    // Query ScamNet
    const result = await scamNetService.query(entities, context)
    
    if (!result.success) {
      return res.status(403).json({
        success: false,
        error: result.error
      })
    }
    
    logger.info('ScamNet: Query executed', {
      sector: context.sector,
      resultsFound: Object.values(result.results).reduce((sum, arr) => sum + arr.length, 0)
    })
    
    return res.json({
      success: true,
      results: result.results,
      metadata: result.metadata
    })
    
  } catch (error) {
    logger.error('ScamNet: Query failed', { error: error.message })
    return res.status(500).json({
      success: false,
      error: 'Failed to query intelligence'
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/scamnet/stats
// Get ScamNet statistics
// ══════════════════════════════════════════════════════════════════════════════

router.get('/stats', async (req, res) => {
  try {
    const stats = scamNetService.getStats()
    
    return res.json({
      success: true,
      stats
    })
    
  } catch (error) {
    logger.error('ScamNet: Stats retrieval failed', { error: error.message })
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/scamnet/top-indicators/:type
// Get top indicators by report count
// ══════════════════════════════════════════════════════════════════════════════

router.get('/top-indicators/:type', validateRequest({
  params: {
    type: { type: 'string', enum: ['phone_numbers', 'urls', 'upi_ids', 'patterns'] }
  },
  query: {
    limit: { type: 'number', default: 10, min: 1, max: 100 }
  }
}), async (req, res) => {
  try {
    const { type } = req.params
    const { limit } = req.query
    
    const indicators = scamNetService.getTopIndicators(type, limit)
    
    return res.json({
      success: true,
      type,
      indicators
    })
    
  } catch (error) {
    logger.error('ScamNet: Top indicators retrieval failed', { error: error.message })
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve top indicators'
    })
  }
})

module.exports = router

// Made with Bob
