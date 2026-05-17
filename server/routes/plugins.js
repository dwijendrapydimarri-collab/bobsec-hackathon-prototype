/**
 * Plugin Routes
 * 
 * Endpoints for managing plugins.
 * Requires JWT authentication.
 */
const express = require('express')
const router = express.Router()
const { getPluginRepository } = require('../repositories/PluginRepository')
const { getPluginManager } = require('../services/PluginManager')
const logger = require('../utils/logger')
const { body, param, query, validationResult } = require('express-validator')
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
 * GET /api/plugins
 * List all plugins for the authenticated user's organization
 */
router.get('/', async (req, res) => {
  try {
    const { type, status, enabled } = req.query
    const pluginRepo = getPluginRepository()
    const options = {}
    if (type) options.type = type
    if (status) options.status = status
    if (enabled !== undefined) options.enabledOnly = enabled === 'true'
    const plugins = await pluginRepo.findByOrganization(req.organizationId, options)
    res.json({
      plugins: plugins.map(p => p.toJSON()),
      total: plugins.length
    })
  } catch (error) {
    logger.error('Failed to list plugins', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to list plugins' 
    })
  }
})
/**
 * POST /api/plugins
 * Install a new plugin
 */
router.post('/',
  [
    body('name').trim().isLength({ min: 3, max: 200 })
      .withMessage('Name must be 3-200 characters'),
    body('slug').trim().matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must be lowercase alphanumeric with hyphens'),
    body('version').matches(/^\d+\.\d+\.\d+$/)
      .withMessage('Version must follow semver (e.g., 1.0.0)'),
    body('type').isIn(['extension', 'agent', 'integration', 'ui'])
      .withMessage('Type must be: extension, agent, integration, or ui'),
    body('description').optional().isString()
      .withMessage('Description must be a string'),
    body('manifest').isObject()
      .withMessage('Manifest must be an object'),
    validate
  ],
  async (req, res) => {
    try {
      const pluginData = {
        organizationId: req.organizationId,
        installedBy: req.user.id,
        ...req.body
      }
      const pluginRepo = getPluginRepository()
      const pluginManager = getPluginManager()
      // Create plugin
      const plugin = await pluginRepo.create(pluginData)
      // Register with plugin manager
      await pluginManager.registerPlugin(plugin)
      logger.info('Plugin installed', {
        pluginId: plugin.id,
        slug: plugin.slug,
        organizationId: req.organizationId,
        installedBy: req.user.id
      })
      res.status(201).json({ plugin: plugin.toJSON() })
    } catch (error) {
      logger.error('Failed to install plugin', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: error.message
      })
    }
  }
)
/**
 * GET /api/plugins/:id
 * Get a specific plugin
 */
router.get('/:id',
  [
    param('id').isUUID().withMessage('Invalid plugin ID'),
    validate
  ],
  async (req, res) => {
    try {
      const pluginRepo = getPluginRepository()
      const plugin = await pluginRepo.findById(req.params.id)
      if (!plugin) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Plugin not found' 
        })
      }
      // Check ownership
      if (plugin.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      res.json({ plugin: plugin.toJSON() })
    } catch (error) {
      logger.error('Failed to get plugin', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to get plugin' 
      })
    }
  }
)
/**
 * PATCH /api/plugins/:id
 * Update a plugin
 */
router.patch('/:id',
  [
    param('id').isUUID().withMessage('Invalid plugin ID'),
    body('name').optional().trim().isLength({ min: 3, max: 200 })
      .withMessage('Name must be 3-200 characters'),
    body('description').optional().isString()
      .withMessage('Description must be a string'),
    body('config').optional().isObject()
      .withMessage('Config must be an object'),
    validate
  ],
  async (req, res) => {
    try {
      const pluginRepo = getPluginRepository()
      const plugin = await pluginRepo.findById(req.params.id)
      if (!plugin) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Plugin not found' 
        })
      }
      // Check ownership
      if (plugin.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      const updated = await pluginRepo.update(req.params.id, req.body)
      logger.info('Plugin updated', {
        pluginId: plugin.id,
        organizationId: req.organizationId,
        updatedBy: req.user.id,
        updates: Object.keys(req.body)
      })
      res.json({ plugin: updated.toJSON() })
    } catch (error) {
      logger.error('Failed to update plugin', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to update plugin' 
      })
    }
  }
)
/**
 * DELETE /api/plugins/:id
 * Uninstall a plugin
 */
router.delete('/:id',
  [
    param('id').isUUID().withMessage('Invalid plugin ID'),
    validate
  ],
  async (req, res) => {
    try {
      const pluginRepo = getPluginRepository()
      const pluginManager = getPluginManager()
      const plugin = await pluginRepo.findById(req.params.id)
      if (!plugin) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Plugin not found' 
        })
      }
      // Check ownership
      if (plugin.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      // Unregister from plugin manager
      await pluginManager.unregisterPlugin(req.params.id)
      // Delete from repository
      await pluginRepo.delete(req.params.id)
      logger.info('Plugin uninstalled', {
        pluginId: plugin.id,
        slug: plugin.slug,
        organizationId: req.organizationId,
        uninstalledBy: req.user.id
      })
      res.json({ 
        message: 'Plugin uninstalled successfully',
        pluginId: req.params.id
      })
    } catch (error) {
      logger.error('Failed to uninstall plugin', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to uninstall plugin' 
      })
    }
  }
)
/**
 * POST /api/plugins/:id/enable
 * Enable a plugin
 */
router.post('/:id/enable',
  [
    param('id').isUUID().withMessage('Invalid plugin ID'),
    validate
  ],
  async (req, res) => {
    try {
      const pluginRepo = getPluginRepository()
      const pluginManager = getPluginManager()
      const plugin = await pluginRepo.findById(req.params.id)
      if (!plugin) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Plugin not found' 
        })
      }
      // Check ownership
      if (plugin.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      // Enable plugin
      await pluginManager.enablePlugin(req.params.id)
      logger.info('Plugin enabled', {
        pluginId: plugin.id,
        slug: plugin.slug,
        organizationId: req.organizationId,
        enabledBy: req.user.id
      })
      res.json({ plugin: plugin.toJSON() })
    } catch (error) {
      logger.error('Failed to enable plugin', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: error.message
      })
    }
  }
)
/**
 * POST /api/plugins/:id/disable
 * Disable a plugin
 */
router.post('/:id/disable',
  [
    param('id').isUUID().withMessage('Invalid plugin ID'),
    validate
  ],
  async (req, res) => {
    try {
      const pluginRepo = getPluginRepository()
      const pluginManager = getPluginManager()
      const plugin = await pluginRepo.findById(req.params.id)
      if (!plugin) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Plugin not found' 
        })
      }
      // Check ownership
      if (plugin.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      // Disable plugin
      await pluginManager.disablePlugin(req.params.id)
      logger.info('Plugin disabled', {
        pluginId: plugin.id,
        slug: plugin.slug,
        organizationId: req.organizationId,
        disabledBy: req.user.id
      })
      res.json({ plugin: plugin.toJSON() })
    } catch (error) {
      logger.error('Failed to disable plugin', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to disable plugin' 
      })
    }
  }
)
/**
 * GET /api/plugins/stats/summary
 * Get plugin statistics for the organization
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const pluginRepo = getPluginRepository()
    const stats = await pluginRepo.getStats(req.organizationId)
    res.json({ stats })
  } catch (error) {
    logger.error('Failed to get plugin stats', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to get plugin statistics' 
    })
  }
})
/**
 * GET /api/plugins/metadata/hooks
 * Get available hooks
 */
router.get('/metadata/hooks', (req, res) => {
  try {
    const pluginManager = getPluginManager()
    const hooks = pluginManager.getAvailableHooks()
    res.json({ hooks })
  } catch (error) {
    logger.error('Failed to get available hooks', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to get available hooks' 
    })
  }
})
/**
 * GET /api/plugins/search
 * Search plugins
 */
router.get('/search',
  [
    query('q').trim().isLength({ min: 1 })
      .withMessage('Search query is required'),
    validate
  ],
  async (req, res) => {
    try {
      const pluginRepo = getPluginRepository()
      const plugins = await pluginRepo.search(req.query.q, req.organizationId)
      res.json({
        plugins: plugins.map(p => p.toJSON()),
        total: plugins.length,
        query: req.query.q
      })
    } catch (error) {
      logger.error('Failed to search plugins', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to search plugins' 
      })
    }
  }
)
module.exports = router
// Made with Bob