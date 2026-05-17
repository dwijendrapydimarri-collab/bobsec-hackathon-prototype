/**
 * Plugin Repository
 * 
 * Handles plugin persistence and retrieval.
 */
const Plugin = require('../models/Plugin')
const logger = require('../utils/logger')
class PluginRepository {
  constructor() {
    this.plugins = new Map() // In-memory store (replace with DB in production)
    this.organizationIndex = new Map() // organizationId -> Set<pluginId>
    this.slugIndex = new Map() // `${organizationId}:${slug}` -> pluginId
  }
  /**
   * Create a new plugin
   */
  async create(pluginData) {
    const plugin = new Plugin(pluginData)
    // Validate
    const validation = await this.validate(pluginData)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }
    // Store
    this.plugins.set(plugin.id, plugin)
    // Update indexes
    if (!this.organizationIndex.has(plugin.organizationId)) {
      this.organizationIndex.set(plugin.organizationId, new Set())
    }
    this.organizationIndex.get(plugin.organizationId).add(plugin.id)
    const slugKey = `${plugin.organizationId}:${plugin.slug}`
    this.slugIndex.set(slugKey, plugin.id)
    logger.info('Plugin created', {
      pluginId: plugin.id,
      slug: plugin.slug,
      organizationId: plugin.organizationId
    })
    return plugin
  }
  /**
   * Find plugin by ID
   */
  async findById(id) {
    return this.plugins.get(id) || null
  }
  /**
   * Find plugin by slug and organization
   */
  async findBySlug(slug, organizationId) {
    const slugKey = `${organizationId}:${slug}`
    const pluginId = this.slugIndex.get(slugKey)
    return pluginId ? this.plugins.get(pluginId) : null
  }
  /**
   * Find all plugins for organization
   */
  async findByOrganization(organizationId, options = {}) {
    const pluginIds = this.organizationIndex.get(organizationId) || new Set()
    let plugins = Array.from(pluginIds).map(id => this.plugins.get(id)).filter(Boolean)
    // Filter by type
    if (options.type) {
      plugins = plugins.filter(p => p.type === options.type)
    }
    // Filter by status
    if (options.status) {
      plugins = plugins.filter(p => p.status === options.status)
    }
    // Filter by enabled
    if (options.enabledOnly) {
      plugins = plugins.filter(p => p.enabled)
    }
    return plugins
  }
  /**
   * Update plugin
   */
  async update(id, updates) {
    const plugin = this.plugins.get(id)
    if (!plugin) {
      throw new Error('Plugin not found')
    }
    // Update fields
    Object.assign(plugin, updates)
    plugin.updatedAt = new Date().toISOString()
    logger.info('Plugin updated', {
      pluginId: id,
      updates: Object.keys(updates)
    })
    return plugin
  }
  /**
   * Delete plugin
   */
  async delete(id) {
    const plugin = this.plugins.get(id)
    if (!plugin) {
      throw new Error('Plugin not found')
    }
    // Remove from indexes
    const orgPlugins = this.organizationIndex.get(plugin.organizationId)
    if (orgPlugins) {
      orgPlugins.delete(id)
    }
    const slugKey = `${plugin.organizationId}:${plugin.slug}`
    this.slugIndex.delete(slugKey)
    // Remove plugin
    this.plugins.delete(id)
    logger.info('Plugin deleted', {
      pluginId: id,
      slug: plugin.slug
    })
  }
  /**
   * Toggle plugin enabled status
   */
  async toggleEnabled(id) {
    const plugin = this.plugins.get(id)
    if (!plugin) {
      throw new Error('Plugin not found')
    }
    if (plugin.enabled) {
      plugin.disable()
    } else {
      plugin.enable()
    }
    logger.info('Plugin toggled', {
      pluginId: id,
      enabled: plugin.enabled
    })
    return plugin
  }
  /**
   * Get plugin statistics
   */
  async getStats(organizationId) {
    const plugins = await this.findByOrganization(organizationId)
    const stats = {
      total: plugins.length,
      byType: {},
      byStatus: {},
      enabled: 0,
      disabled: 0,
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0
    }
    for (const plugin of plugins) {
      // Count by type
      stats.byType[plugin.type] = (stats.byType[plugin.type] || 0) + 1
      // Count by status
      stats.byStatus[plugin.status] = (stats.byStatus[plugin.status] || 0) + 1
      // Count enabled/disabled
      if (plugin.enabled) {
        stats.enabled++
      } else {
        stats.disabled++
      }
      // Aggregate execution stats
      stats.totalExecutions += plugin.stats.totalExecutions
      stats.successCount += plugin.stats.successCount
      stats.failureCount += plugin.stats.failureCount
    }
    // Calculate success rate
    stats.successRate = stats.totalExecutions > 0
      ? Math.round((stats.successCount / stats.totalExecutions) * 100)
      : 0
    return stats
  }
  /**
   * Validate plugin data
   */
  async validate(pluginData) {
    const errors = []
    // Check required fields
    if (!pluginData.organizationId) {
      errors.push('organizationId is required')
    }
    if (!pluginData.name) {
      errors.push('name is required')
    }
    if (!pluginData.slug) {
      errors.push('slug is required')
    }
    // Check for duplicate slug in organization
    if (pluginData.slug && pluginData.organizationId) {
      const existing = await this.findBySlug(pluginData.slug, pluginData.organizationId)
      if (existing && existing.id !== pluginData.id) {
        errors.push(`Plugin with slug '${pluginData.slug}' already exists in this organization`)
      }
    }
    // Validate manifest
    if (pluginData.manifest) {
      const plugin = new Plugin(pluginData)
      const manifestValidation = plugin.validateManifest()
      if (!manifestValidation.valid) {
        errors.push(...manifestValidation.errors)
      }
    }
    return {
      valid: errors.length === 0,
      errors
    }
  }
  /**
   * Get all plugins (admin only)
   */
  async findAll() {
    return Array.from(this.plugins.values())
  }
  /**
   * Search plugins
   */
  async search(query, organizationId) {
    const plugins = await this.findByOrganization(organizationId)
    const lowerQuery = query.toLowerCase()
    return plugins.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.slug.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.author.toLowerCase().includes(lowerQuery)
    )
  }
}
// Singleton instance
let instance = null
function getPluginRepository() {
  if (!instance) {
    instance = new PluginRepository()
  }
  return instance
}
module.exports = { PluginRepository, getPluginRepository }
// Made with Bob