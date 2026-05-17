/**
 * API Keys Routes
 * 
 * Endpoints for managing API keys.
 * Requires JWT authentication (not API key auth, to prevent circular dependency).
 */
const express = require('express')
const router = express.Router()
const { getApiKeyRepository } = require('../repositories/ApiKeyRepository')
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
 * GET /api/keys
 * List all API keys for the authenticated user's organization
 */
router.get('/', async (req, res) => {
  try {
    const apiKeyRepo = getApiKeyRepository()
    const keys = await apiKeyRepo.findByOrganization(req.organizationId)
    res.json({
      keys: keys.map(k => k.toJSON()),
      total: keys.length
    })
  } catch (error) {
    logger.error('Failed to list API keys', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to list API keys' 
    })
  }
})
/**
 * POST /api/keys
 * Create a new API key
 */
router.post('/',
  [
    body('name').trim().isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters'),
    body('permissions').optional().isArray()
      .withMessage('Permissions must be an array'),
    body('permissions.*').optional().isIn(['analyse', 'history', 'webhooks'])
      .withMessage('Invalid permission'),
    body('rateLimit').optional().isInt({ min: 1, max: 10000 })
      .withMessage('Rate limit must be 1-10000 requests per minute'),
    body('expiresAt').optional().isISO8601()
      .withMessage('Expiration must be ISO 8601 date'),
    body('environment').optional().isIn(['live', 'test'])
      .withMessage('Environment must be "live" or "test"'),
    validate
  ],
  async (req, res) => {
    try {
      const { name, permissions, rateLimit, expiresAt, environment, metadata } = req.body
      // Check if expiration is in the future
      if (expiresAt && new Date(expiresAt) <= new Date()) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Expiration date must be in the future'
        })
      }
      const apiKeyRepo = getApiKeyRepository()
      const { apiKey, fullKey } = await apiKeyRepo.create({
        organizationId: req.organizationId,
        name,
        permissions: permissions || ['analyse'],
        rateLimit: rateLimit || 100,
        expiresAt: expiresAt || null,
        environment: environment || 'live',
        createdBy: req.user.id,
        metadata: metadata || {}
      })
      logger.info('API key created', {
        keyId: apiKey.id,
        organizationId: req.organizationId,
        createdBy: req.user.id,
        name
      })
      // Return full key only once
      res.status(201).json({
        apiKey: apiKey.toJSON(),
        key: fullKey,
        warning: 'Save this key securely. It will not be shown again.'
      })
    } catch (error) {
      logger.error('Failed to create API key', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to create API key' 
      })
    }
  }
)
/**
 * GET /api/keys/:id
 * Get a specific API key
 */
router.get('/:id',
  [
    param('id').isUUID().withMessage('Invalid key ID'),
    validate
  ],
  async (req, res) => {
    try {
      const apiKeyRepo = getApiKeyRepository()
      const apiKey = await apiKeyRepo.findById(req.params.id)
      if (!apiKey) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'API key not found' 
        })
      }
      // Check ownership
      if (apiKey.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      res.json({ apiKey: apiKey.toJSON() })
    } catch (error) {
      logger.error('Failed to get API key', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to get API key' 
      })
    }
  }
)
/**
 * PATCH /api/keys/:id
 * Update an API key
 */
router.patch('/:id',
  [
    param('id').isUUID().withMessage('Invalid key ID'),
    body('name').optional().trim().isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters'),
    body('permissions').optional().isArray()
      .withMessage('Permissions must be an array'),
    body('permissions.*').optional().isIn(['analyse', 'history', 'webhooks'])
      .withMessage('Invalid permission'),
    body('rateLimit').optional().isInt({ min: 1, max: 10000 })
      .withMessage('Rate limit must be 1-10000 requests per minute'),
    body('isActive').optional().isBoolean()
      .withMessage('isActive must be boolean'),
    body('expiresAt').optional().isISO8601()
      .withMessage('Expiration must be ISO 8601 date'),
    validate
  ],
  async (req, res) => {
    try {
      const apiKeyRepo = getApiKeyRepository()
      const apiKey = await apiKeyRepo.findById(req.params.id)
      if (!apiKey) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'API key not found' 
        })
      }
      // Check ownership
      if (apiKey.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      const updates = {}
      const allowedFields = ['name', 'permissions', 'rateLimit', 'isActive', 'expiresAt', 'metadata']
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field]
        }
      })
      const updated = await apiKeyRepo.update(req.params.id, updates)
      logger.info('API key updated', {
        keyId: apiKey.id,
        organizationId: req.organizationId,
        updatedBy: req.user.id,
        updates: Object.keys(updates)
      })
      res.json({ apiKey: updated.toJSON() })
    } catch (error) {
      logger.error('Failed to update API key', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to update API key' 
      })
    }
  }
)
/**
 * DELETE /api/keys/:id
 * Delete (deactivate) an API key
 */
router.delete('/:id',
  [
    param('id').isUUID().withMessage('Invalid key ID'),
    validate
  ],
  async (req, res) => {
    try {
      const apiKeyRepo = getApiKeyRepository()
      const apiKey = await apiKeyRepo.findById(req.params.id)
      if (!apiKey) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'API key not found' 
        })
      }
      // Check ownership
      if (apiKey.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      await apiKeyRepo.delete(req.params.id)
      logger.info('API key deleted', {
        keyId: apiKey.id,
        organizationId: req.organizationId,
        deletedBy: req.user.id
      })
      res.json({ 
        message: 'API key deactivated successfully',
        keyId: req.params.id
      })
    } catch (error) {
      logger.error('Failed to delete API key', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to delete API key' 
      })
    }
  }
)
/**
 * GET /api/keys/stats
 * Get usage statistics for all API keys
 */
router.get('/stats/usage', async (req, res) => {
  try {
    const apiKeyRepo = getApiKeyRepository()
    const stats = await apiKeyRepo.getUsageStats(req.organizationId)
    res.json({ stats })
  } catch (error) {
    logger.error('Failed to get API key stats', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to get API key statistics' 
    })
  }
})
module.exports = router
// Made with Bob