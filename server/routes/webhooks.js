/**
 * Webhooks Routes
 * 
 * Endpoints for managing webhooks.
 * Requires JWT authentication.
 */
const express = require('express')
const router = express.Router()
const { getWebhookRepository } = require('../repositories/WebhookRepository')
const { getWebhookService } = require('../services/WebhookService')
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
 * GET /api/webhooks
 * List all webhooks for the authenticated user's organization
 */
router.get('/', async (req, res) => {
  try {
    const webhookRepo = getWebhookRepository()
    const webhooks = await webhookRepo.findByOrganization(req.organizationId)
    res.json({
      webhooks: webhooks.map(w => w.toJSON()),
      total: webhooks.length
    })
  } catch (error) {
    logger.error('Failed to list webhooks', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to list webhooks' 
    })
  }
})
/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post('/',
  [
    body('url').isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Valid HTTPS URL required'),
    body('events').isArray({ min: 1 })
      .withMessage('At least one event required'),
    body('events.*').isString()
      .withMessage('Events must be strings'),
    body('headers').optional().isObject()
      .withMessage('Headers must be an object'),
    body('retryPolicy').optional().isObject()
      .withMessage('Retry policy must be an object'),
    body('retryPolicy.maxRetries').optional().isInt({ min: 0, max: 10 })
      .withMessage('Max retries must be 0-10'),
    validate
  ],
  async (req, res) => {
    try {
      const { url, events, headers, retryPolicy, metadata } = req.body
      // Validate URL is HTTPS in production
      if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Webhook URL must use HTTPS in production'
        })
      }
      // Get available events
      const webhookService = getWebhookService()
      const availableEvents = webhookService.getAvailableEvents().map(e => e.name)
      // Validate events
      const invalidEvents = events.filter(e => !availableEvents.includes(e))
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Invalid events',
          invalidEvents,
          availableEvents
        })
      }
      const webhookRepo = getWebhookRepository()
      const webhook = await webhookRepo.create({
        organizationId: req.organizationId,
        url,
        events,
        headers: headers || {},
        retryPolicy: retryPolicy || undefined,
        createdBy: req.user.id,
        metadata: metadata || {}
      })
      logger.info('Webhook created', {
        webhookId: webhook.id,
        organizationId: req.organizationId,
        createdBy: req.user.id,
        url,
        events
      })
      res.status(201).json({
        webhook: webhook.toJSON(),
        secret: webhook.secret,
        warning: 'Save the secret securely. Use it to verify webhook signatures.'
      })
    } catch (error) {
      logger.error('Failed to create webhook', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to create webhook' 
      })
    }
  }
)
/**
 * GET /api/webhooks/:id
 * Get a specific webhook
 */
router.get('/:id',
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
    validate
  ],
  async (req, res) => {
    try {
      const webhookRepo = getWebhookRepository()
      const webhook = await webhookRepo.findById(req.params.id)
      if (!webhook) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Webhook not found' 
        })
      }
      // Check ownership
      if (webhook.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      res.json({ webhook: webhook.toJSON() })
    } catch (error) {
      logger.error('Failed to get webhook', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to get webhook' 
      })
    }
  }
)
/**
 * PATCH /api/webhooks/:id
 * Update a webhook
 */
router.patch('/:id',
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
    body('url').optional().isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Valid HTTPS URL required'),
    body('events').optional().isArray({ min: 1 })
      .withMessage('At least one event required'),
    body('events.*').optional().isString()
      .withMessage('Events must be strings'),
    body('isActive').optional().isBoolean()
      .withMessage('isActive must be boolean'),
    body('headers').optional().isObject()
      .withMessage('Headers must be an object'),
    body('retryPolicy').optional().isObject()
      .withMessage('Retry policy must be an object'),
    validate
  ],
  async (req, res) => {
    try {
      const webhookRepo = getWebhookRepository()
      const webhook = await webhookRepo.findById(req.params.id)
      if (!webhook) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Webhook not found' 
        })
      }
      // Check ownership
      if (webhook.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      // Validate events if provided
      if (req.body.events) {
        const webhookService = getWebhookService()
        const availableEvents = webhookService.getAvailableEvents().map(e => e.name)
        const invalidEvents = req.body.events.filter(e => !availableEvents.includes(e))
        if (invalidEvents.length > 0) {
          return res.status(400).json({
            error: 'validation_error',
            message: 'Invalid events',
            invalidEvents,
            availableEvents
          })
        }
      }
      const updates = {}
      const allowedFields = ['url', 'events', 'isActive', 'headers', 'retryPolicy', 'metadata']
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field]
        }
      })
      const updated = await webhookRepo.update(req.params.id, updates)
      logger.info('Webhook updated', {
        webhookId: webhook.id,
        organizationId: req.organizationId,
        updatedBy: req.user.id,
        updates: Object.keys(updates)
      })
      res.json({ webhook: updated.toJSON() })
    } catch (error) {
      logger.error('Failed to update webhook', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to update webhook' 
      })
    }
  }
)
/**
 * DELETE /api/webhooks/:id
 * Delete (deactivate) a webhook
 */
router.delete('/:id',
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
    validate
  ],
  async (req, res) => {
    try {
      const webhookRepo = getWebhookRepository()
      const webhook = await webhookRepo.findById(req.params.id)
      if (!webhook) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Webhook not found' 
        })
      }
      // Check ownership
      if (webhook.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      await webhookRepo.delete(req.params.id)
      logger.info('Webhook deleted', {
        webhookId: webhook.id,
        organizationId: req.organizationId,
        deletedBy: req.user.id
      })
      res.json({ 
        message: 'Webhook deactivated successfully',
        webhookId: req.params.id
      })
    } catch (error) {
      logger.error('Failed to delete webhook', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to delete webhook' 
      })
    }
  }
)
/**
 * POST /api/webhooks/:id/test
 * Test a webhook by sending a test payload
 */
router.post('/:id/test',
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
    validate
  ],
  async (req, res) => {
    try {
      const webhookRepo = getWebhookRepository()
      const webhook = await webhookRepo.findById(req.params.id)
      if (!webhook) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Webhook not found' 
        })
      }
      // Check ownership
      if (webhook.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      const webhookService = getWebhookService()
      const result = await webhookService.testWebhook(req.params.id)
      logger.info('Webhook tested', {
        webhookId: webhook.id,
        organizationId: req.organizationId,
        testedBy: req.user.id,
        success: result.success
      })
      res.json(result)
    } catch (error) {
      logger.error('Failed to test webhook', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to test webhook' 
      })
    }
  }
)
/**
 * POST /api/webhooks/:id/regenerate-secret
 * Regenerate webhook secret
 */
router.post('/:id/regenerate-secret',
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
    validate
  ],
  async (req, res) => {
    try {
      const webhookRepo = getWebhookRepository()
      const webhook = await webhookRepo.findById(req.params.id)
      if (!webhook) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Webhook not found' 
        })
      }
      // Check ownership
      if (webhook.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      const updated = await webhookRepo.regenerateSecret(req.params.id)
      logger.info('Webhook secret regenerated', {
        webhookId: webhook.id,
        organizationId: req.organizationId,
        regeneratedBy: req.user.id
      })
      res.json({
        webhook: updated.toJSON(),
        secret: updated.secret,
        warning: 'Save the new secret securely. The old secret is now invalid.'
      })
    } catch (error) {
      logger.error('Failed to regenerate webhook secret', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to regenerate webhook secret' 
      })
    }
  }
)
/**
 * GET /api/webhooks/stats/delivery
 * Get delivery statistics for all webhooks
 */
router.get('/stats/delivery', async (req, res) => {
  try {
    const webhookRepo = getWebhookRepository()
    const stats = await webhookRepo.getDeliveryStats(req.organizationId)
    res.json({ stats })
  } catch (error) {
    logger.error('Failed to get webhook stats', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to get webhook statistics' 
    })
  }
})
/**
 * GET /api/webhooks/events/available
 * Get list of available webhook events
 */
router.get('/events/available', (req, res) => {
  try {
    const webhookService = getWebhookService()
    const events = webhookService.getAvailableEvents()
    res.json({ events })
  } catch (error) {
    logger.error('Failed to get available events', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to get available events' 
    })
  }
})
module.exports = router
// Made with Bob